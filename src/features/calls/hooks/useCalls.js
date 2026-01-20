import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as callsApi from '../api';

/**
 * Hook for fetching all calls
 */
export const useCalls = (sort = '-created_date', limit = 500) => {
  return useQuery({
    queryKey: queryKeys.calls.all(),
    queryFn: () => callsApi.getCalls(sort, limit),
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
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(id) });
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
    },
  });
};

/**
 * Hook for creating call history
 */
export const useCreateCallHistory = () => {
  return useMutation({
    mutationFn: callsApi.createCallHistory,
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
  });
};
