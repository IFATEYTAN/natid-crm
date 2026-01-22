import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/components/lib/queryKeys";
import * as callsApi from "../api";
import { toast } from "sonner";

/**
 * Custom Hook for Calls
 */

/**
 * Fetch all calls
 * @param {Object} options - Query options
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export const useCalls = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.calls.list(options),
    queryFn: () => callsApi.getCalls(options),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
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
    queryFn: () => callsApi.getCallById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Create a new call
 * @returns {Object} Mutation object with mutate function
 */
export const useCreateCall = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => callsApi.createCall(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      toast.success("קריאה נוצרה בהצלחה");
    },
    onError: (error) => {
      toast.error(`שגיאה: ${error.message}`);
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
    mutationFn: ({ id, data }) => callsApi.updateCall(id, data),
    onSuccess: (updatedCall) => {
      queryClient.setQueryData(queryKeys.calls.detail(updatedCall.id), updatedCall);
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      toast.success("קריאה עודכנה בהצלחה");
    },
    onError: (error) => {
      toast.error(`שגיאה: ${error.message}`);
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
    mutationFn: (id) => callsApi.deleteCall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      toast.success("קריאה נמחקה בהצלחה");
    },
    onError: (error) => {
      toast.error(`שגיאה במחיקת הקריאה: ${error.message}`);
    },
  });
};

/**
 * Assign a call to an agent
 * @returns {Object} Mutation object
 */
export const useAssignCall = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, agentId }) => callsApi.assignCallToAgent(callId, agentId),
    onSuccess: (updatedCall) => {
      queryClient.setQueryData(queryKeys.calls.detail(updatedCall.id), updatedCall);
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      toast.success("קריאה שובצה בהצלחה");
    },
    onError: (error) => {
      toast.error(`שגיאה בשיבוץ: ${error.message}`);
    },
  });
};