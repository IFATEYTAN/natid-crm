import { base44 } from '@/api/base44Client';

/**
 * Calls the admin-gated getUsersList server function (service role) and returns
 * its payload. Throws on an error response so React Query surfaces the failure
 * state instead of silently rendering an empty list.
 */
export async function fetchUsersList() {
  const result = await base44.functions.invoke('getUsersList', {});
  if (result?.error || result?.data?.error || !result?.data) {
    throw new Error(result?.error || result?.data?.error || 'Failed to fetch users list');
  }
  return {
    users: result.data.users || [],
    permissions: result.data.permissions || [],
    roles: result.data.roles || [],
  };
}
