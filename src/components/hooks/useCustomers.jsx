/**
 * Custom Hook for Customers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// --- API Functions ---

const getCustomers = async (options = {}) => {
  const { sortBy = '-created_date', limit = 500 } = options;
  return base44.entities.Customer.list(sortBy, limit);
};

const getCustomerById = async (id) => {
  return base44.entities.Customer.filter({ id });
};

const createCustomer = async (data) => {
  return base44.entities.Customer.create(data);
};

const updateCustomer = async ({ id, data }) => {
  return base44.entities.Customer.update(id, data);
};

const deleteCustomer = async (id) => {
  return base44.entities.Customer.delete(id);
};

// --- Custom Hooks ---

export const useCustomers = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.customers.list(options),
    queryFn: () => getCustomers(options),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCustomer = (id) => {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => getCustomerById(id),
    enabled: !!id,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      toast.success('לקוח נוצר בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת לקוח: ${error.message}`);
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: (updatedCustomer) => {
      queryClient.setQueryData(queryKeys.customers.detail(updatedCustomer.id), updatedCustomer);
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      toast.success('לקוח עודכן בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון לקוח: ${error.message}`);
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      toast.success('לקוח נמחק בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה במחיקת לקוח: ${error.message}`);
    },
  });
};