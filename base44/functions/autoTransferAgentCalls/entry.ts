/**
 * autoTransferAgentCalls
 * -----------------------
 * Called when an agent has been on break for more than the configured threshold.
 * Re-queues all calls assigned to the agent that are still in an unhandled state,
 * and sends a notification to all supervisors/managers.
 *
 * Input:
 *   agent_id     - ID of the agent on break (preferred)
 *   agent_email  - email of the agent on break (fallback)
 *   reason       - 'break_timeout' | 'manual'
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const UNHANDLED_STATUSES = [
  'waiting_treatment',
  'awaiting_assignment',
  'assigning',
];

export default async function handler(req: Request): Promise<Response> {
  try {
    const { agent_id, agent_email, reason = 'break_timeout' } = await req.json();

    if (!agent_id && !agent_email) {
      return new Response(JSON.stringify({ error: 'agent_id or agent_email is required' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Find all unhandled calls assigned to this agent (by id or email)
    // Build filter to list open calls for this agent
    const agentFilter = agent_id
      ? { assigned_agent_id: agent_id }
      : { assigned_agent: agent_email };

    let allAgentCalls: any[] = [];
    for (const status of UNHANDLED_STATUSES) {
      const { data, error } = await supabase
        .from('Call')
        .select('id, call_number, customer_name, assigned_agent')
        .eq('call_status', status)
        .match(agentFilter);
      if (error) throw error;
      if (data) allAgentCalls = allAgentCalls.concat(data);
    }
    const calls = allAgentCalls;
    const callsError = null;

    if (callsError) throw callsError;

    if (!calls || calls.length === 0) {
      return new Response(
        JSON.stringify({ success: true, transferred: 0, message: 'No unhandled calls found' }),
        { status: 200 }
      );
    }

    // 2. Re-queue the calls (remove agent assignment, set status back to awaiting_assignment)
    const callIds = calls.map((c) => c.id);
    const { error: updateError } = await supabase
      .from('Call')
      .update({
        call_status: 'awaiting_assignment',
        assigned_agent: null,
        internal_notes: `[מערכת] קריאה הועברת לתור בשל הפסקת נציג (${agent_id || agent_email}) — ${new Date().toLocaleString('he-IL')}`,
      })
      .in('id', callIds);

    if (updateError) throw updateError;

    // 3. Find supervisors/managers to notify
    const { data: supervisors } = await supabase
      .from('User')
      .select('id, email, full_name')
      .in('role', ['supervisor', 'manager', 'admin']);

    // 4. Create notifications for supervisors
    if (supervisors && supervisors.length > 0) {
      const notifications = supervisors.map((sup) => ({
        user_id: sup.id,
        title: `נציג ${agent_email} בהפסקה ממושכת`,
        message: `${calls.length} קריאות הועברו לתור האמתנה. סיבה: ${reason === 'break_timeout' ? 'הפסקה מעל 20 דקות' : 'העברה ידנית'}.`,
        type: 'warning',
        is_read: false,
        link: 'MyQueue',
        created_date: new Date().toISOString(),
      }));

      await supabase.from('Notification').insert(notifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transferred: calls.length,
        call_ids: callIds,
        notified_supervisors: supervisors?.length ?? 0,
      }),
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
