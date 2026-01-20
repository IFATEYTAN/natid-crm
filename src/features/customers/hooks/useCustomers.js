import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as customersApi from '../api';

/**
 * Hook for fetching all customers
 */
export const useCustomers = (sort = '-created_date') => {
  return useQuery({
    queryKey: queryKeys.customers.all(),
    queryFn: () => customersApi.getCustomers(sort),
  });
};

/**
 * Hook for fetching a single customer by ID
 */
export const useCustomer = (customerId) => {
  return useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: () => customersApi.getCustomerById(customerId),
    enabled: !!customerId,
  });
};

/**
 * Hook for fetching customers with filters
 */
export const useFilteredCustomers = (filters, sort = '-created_date', limit) => {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => customersApi.filterCustomers(filters, sort, limit),
    enabled: !!filters,
  });
};

/**
 * Hook for creating a customer
 */
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customersApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
    },
  });
};

/**
 * Hook for updating a customer
 */
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => customersApi.updateCustomer(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) });
    },
  });
};

/**
 * Hook for deleting a customer
 */
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customersApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
    },
  });
};

/**
 * Hook for fetching customer interactions
 */
export const useCustomerInteractions = (customerId, sort = '-interaction_date') => {
  return useQuery({
    queryKey: queryKeys.customers.interactions(customerId),
    queryFn: () => customersApi.getCustomerInteractions(customerId, sort),
    enabled: !!customerId,
  });
};

/**
 * Hook for creating customer interaction
 */
export const useCreateCustomerInteraction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customersApi.createCustomerInteraction,
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.interactions(data.customer_id) });
    },
  });
};
