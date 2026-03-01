import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import * as callsApi from '../api';

/**
 * Hook for fetching all calls
 */
export const useCalls = (sort = '-created_date', limit = 500) => {
  return useQuery({
    queryKey: queryKeys.calls.all(),
    queryFn: () => callsApi.getCalls(sort, limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook for fetching a single call by ID
 */
export const useCall = (callId) => {
  return useQuery({
    queryKey: queryKeys.calls.detail(callId),
    queryFn: () => callsApi.getCallById(callId),
    enabled: !!callId,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook for fetching calls with filters
 */
export const useFilteredCalls = (filters, sort = '-created_date', limit = 500) => {
  return useQuery({
    queryKey: queryKeys.calls.list(filters),
    queryFn: () => callsApi.filterCalls(filters, sort, limit),
    enabled: !!filters,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook for fetching calls by vendor
 */
export const useCallsByVendor = (vendorId, sort = '-created_date', limit = 50) => {
  return useQuery({
    queryKey: queryKeys.calls.byVendor(vendorId),
    queryFn: () => callsApi.getCallsByVendor(vendorId, sort, limit),
    enabled: !!vendorId,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook for fetching calls by customer
 */
export const useCallsByCustomer = (customerId, sort = '-created_date') => {
  return useQuery({
    queryKey: queryKeys.calls.byCustomer(customerId),
    queryFn: () => callsApi.getCallsByCustomer(customerId, sort),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook for creating a call
 */
export const useCreateCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callsApi.createCall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      toast.success('קריאה נוצרה בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת קריאה: ${error.message}`);
    },
  });
};

/**
 * Hook for updating a call
 */
export const useUpdateCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => callsApi.updateCall(id, data),
    onSuccess: (updatedCall, { id }) => {
      queryClient.setQueryData(queryKeys.calls.detail(id), updatedCall);
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      toast.success('קריאה עודכנה בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון קריאה: ${error.message}`);
    },
  });
};

/**
 * Hook for deleting a call
 */
export const useDeleteCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callsApi.deleteCall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      toast.success('קריאה נמחקה בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה במחיקת קריאה: ${error.message}`);
    },
  });
};

/**
 * Hook for assigning a vendor to a call
 */
export const useAssignVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ callId, vendorId, vendorName }) =>
      callsApi.updateCall(callId, {
        assigned_vendor_id: vendorId,
        assigned_vendor_name: vendorName,
        call_status: 'assigning',
        assigned_at: new Date().toISOString(),
      }),
    onSuccess: (updatedCall) => {
      queryClient.setQueryData(queryKeys.calls.detail(updatedCall.id), updatedCall);
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      toast.success('ספק שובץ בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה בשיבוץ ספק: ${error.message}`);
    },
  });
};

/**
 * Hook for creating call history
 */
export const useCreateCallHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callsApi.createCallHistory,
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.callHistory.byCall(data.call_id) });
    },
    onError: () => {
      toast.error('שגיאה ביצירת רשומת היסטוריה');
    },
  });
};

/**
 * Hook for fetching call photos
 */
export const useCallPhotos = (callId) => {
  return useQuery({
    queryKey: queryKeys.callPhotos.byCall(callId),
    queryFn: () => callsApi.getCallPhotos(callId),
    enabled: !!callId,
  });
};

/**
 * Hook for creating call photos
 */
export const useCreateCallPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callsApi.createCallPhoto,
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.callPhotos.byCall(data.call_id) });
    },
    onError: () => {
      toast.error('שגיאה בהעלאת תמונה');
    },
  });
};
