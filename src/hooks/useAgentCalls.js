import { useMemo } from 'react';
import { useCalls } from '@/features/calls/hooks/useCalls';
import { useWorkQueue } from '@/features/queue/hooks/useQueue';

/**
 * Returns the calls assigned to a given field agent (by email), resolved from the
 * work queue. Agents see only their own assigned calls.
 */
export function useAgentCalls(agentEmail) {
  const callsQuery = useCalls();
  const queueQuery = useWorkQueue();

  const calls = useMemo(() => {
    if (!agentEmail) return [];
    const allCalls = callsQuery.data || [];
    const queue = queueQuery.data || [];

    // call_ids assigned to this agent via the work queue
    const myCallIds = new Set(
      queue.filter((q) => q.assigned_to_agent === agentEmail && q.call_id).map((q) => q.call_id)
    );

    return allCalls.filter((c) => myCallIds.has(c.id));
  }, [agentEmail, callsQuery.data, queueQuery.data]);

  return {
    calls,
    isLoading: callsQuery.isLoading || queueQuery.isLoading,
    isFetching: callsQuery.isFetching || queueQuery.isFetching,
    isError: callsQuery.isError || queueQuery.isError,
    error: callsQuery.error || queueQuery.error,
    refetch: () => {
      callsQuery.refetch();
      queueQuery.refetch();
    },
  };
}
