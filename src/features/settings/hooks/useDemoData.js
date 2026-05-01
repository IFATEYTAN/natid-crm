import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as settingsApi from '../api';

const unwrap = (response) => response?.data ?? response;

const friendlyError = (error) => {
  const status = error?.response?.status || error?.status;
  if (status === 401 || status === 403) return 'אין הרשאה - יש להיות מחוברת כמנהל';
  if (status === 429) return 'יותר מדי בקשות - נסי שוב בעוד דקה';
  return error?.message || 'שגיאה ביצירת נתוני דמו';
};

/**
 * Seeds the system with realistic demo data (~250 calls, vendors, customers,
 * fleet vehicles, queue items). Admin-only. Rate-limited to 2/min.
 */
export const useSeedDemoData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options) => settingsApi.seedDemoData(options),
    onError: (error) => {
      toast.error(friendlyError(error));
    },
    onSuccess: (response) => {
      const data = unwrap(response);
      if (!data?.success) {
        toast.error(data?.error || 'יצירת נתוני הדמו נכשלה');
        return;
      }
      const total = data?.total_records ?? 0;
      toast.success(`נתוני דמו נוצרו: ${total} רשומות`);
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};
