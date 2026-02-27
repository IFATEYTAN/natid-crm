import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { emails } = await req.json();
    
    if (!emails || !Array.isArray(emails)) {
      return Response.json({ error: 'Missing emails array' }, { status: 400 });
    }

    const results = [];
    for (const email of emails) {
      try {
        await base44.users.inviteUser(email, 'user');
        results.push({ email, status: 'invited' });
      } catch (err) {
        results.push({ email, status: 'error', message: err.message });
      }
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: 'Failed to invite test users' }, { status: 500 });
  }
});