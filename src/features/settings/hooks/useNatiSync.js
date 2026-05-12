import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import * as settingsApi from '../api';

// Page-level query keys that aren't centralized in queryKeys.js yet but
// must be invalidated after a Nati sync — otherwise the dashboard/reports/
// queue pages keep showing pre-sync data until a hard refresh.
const PAGE_KEYS_AFFECTED_BY_SYNC = [
  ['dashboard-cases'],
  ['dashboard-vendors'],
  ['queue-cases'],
  ['calls-all'],
  ['calls-list'],
  ['reports-cases'],
  ['service-providers-cases'],
];

function invalidateAfterSync(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
  for (const key of PAGE_KEYS_AFFECTED_BY_SYNC) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

const unwrap = (response) => response?.data ?? response;

const friendlyError = (error, response) => {
  const apiError = response?.data?.error || response?.error;
  if (apiError) return apiError;
  const status = error?.response?.status || error?.status;
  if (status === 401 || status === 403) return 'אין הרשאה - יש לוודא שאת מחוברת כמנהל';
  if (status === 502) return 'שגיאה מצד API של נתי - בדקי את ה-token והאישורים';
  if (status === 500) return 'שגיאת שרת - ייתכן שה-secrets של נתי לא מוגדרים ב-Base44';
  return error?.message || 'שגיאה בלתי צפויה';
};

/**
 * Dry-run sync — pulls live data from Nati and returns a preview without writing
 * anything to Base44 entities. Safe to run repeatedly.
 */
export const useNatiSyncDryRun = () => {
  return useMutation({
    mutationFn: (filters) => settingsApi.runNatiSyncDryRun(filters),
    onError: (error, _vars, _ctx) => {
      toast.error(friendlyError(error));
    },
    onSuccess: (response) => {
      const data = unwrap(response);
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(
        `תצוגה מקדימה: ${data?.appeals_count ?? 0} קריאות יסונכרנו (סה"כ ב-API: ${data?.total_from_nati ?? 0})`
      );
    },
  });
};

/**
 * Real sync — writes new/updated records to Base44 entities.
 */
export const useNatiSyncRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filters) => settingsApi.runNatiSync(filters),
    onError: (error) => {
      toast.error(friendlyError(error));
    },
    onSuccess: (response) => {
      const data = unwrap(response);
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const created = (data?.calls?.created ?? 0) + (data?.cases?.created ?? 0);
      const updated = (data?.calls?.updated ?? 0) + (data?.cases?.updated ?? 0);
      toast.success(`סנכרון הושלם: ${created} נוצרו, ${updated} עודכנו`);
      invalidateAfterSync(queryClient);
    },
  });
};
