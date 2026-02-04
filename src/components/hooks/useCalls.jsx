/**
 * Custom Hook for Calls
 *
 * This hook encapsulates all React Query logic for the calls feature.
 * Components use this hook instead of directly using useQuery.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// --- API Functions ---

const getCalls = async (options = {}) => {
  const { sortBy = '-created_date', limit = 500 } = options;
  return base44.entities.Call.list(sortBy, limit);
};

const getCallById = async (id) => {
  return base44.entities.Call.filter({ id });
};

const createCall = async (data) => {
  return base44.entities.Call.create(data);
};

const updateCall = async ({ id, data }) => {
  return base44.entities.Call.update(id, data);
};

const deleteCall = async (id) => {
  return base44.entities.Call.delete(id);
};

// --- Custom Hooks ---

/**
 * Fetch all calls
 * @param {Object} options - Query options (sortBy, limit)
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export const useCalls = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.calls.list(options),
    queryFn: () => getCalls(options),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Fetch a single call by ID
 * @param {string} id - Call ID
 * @returns {Object} Query result
 */
export const useCall = (id) => {
  return useQuery({
    queryKey: queryKeys.calls.detail(id),
    queryFn: () => getCallById(id),
    enabled: !!id,
  });
};

/**
 * Create a new call
 * @returns {Object} Mutation object with mutate function
 */
export const useCreateCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCall,
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
 * Update an existing call
 * @returns {Object} Mutation object
 */
export const useUpdateCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCall,
    onSuccess: (updatedCall) => {
      queryClient.setQueryData(queryKeys.calls.detail(updatedCall.id), updatedCall);
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      toast.success('קריאה עודכנה בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון קריאה: ${error.message}`);
    },
  });
};

/**
 * Delete a call
 * @returns {Object} Mutation object
 */
export const useDeleteCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCall,
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
 * Assign a vendor to a call
 * @returns {Object} Mutation object
 */
export const useAssignVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ callId, vendorId, vendorName }) =>
      base44.entities.Call.update(callId, {
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
