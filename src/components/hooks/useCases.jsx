/**
 * Custom Hook for Cases (Legacy)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// --- API Functions ---

const getCases = async (options = {}) => {
  const { sortBy = '-created_date', limit = 500 } = options;
  return base44.entities.Case.list(sortBy, limit);
};

const getCaseById = async (id) => {
  return base44.entities.Case.filter({ id });
};

const createCase = async (data) => {
  return base44.entities.Case.create(data);
};

const updateCase = async ({ id, data }) => {
  return base44.entities.Case.update(id, data);
};

const deleteCase = async (id) => {
  return base44.entities.Case.delete(id);
};

// --- Custom Hooks ---

export const useCases = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.cases.list(options),
    queryFn: () => getCases(options),
    staleTime: 1000 * 60 * 2,
  });
};

export const useCase = (id) => {
  return useQuery({
    queryKey: queryKeys.cases.detail(id),
    queryFn: () => getCaseById(id),
    enabled: !!id,
  });
};

export const useCreateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
      toast.success('קריאה נוצרה בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת קריאה: ${error.message}`);
    },
  });
};

export const useUpdateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCase,
    onSuccess: (updatedCase) => {
      queryClient.setQueryData(queryKeys.cases.detail(updatedCase.id), updatedCase);
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
      toast.success('קריאה עודכנה בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון קריאה: ${error.message}`);
    },
  });
};

export const useDeleteCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
      toast.success('קריאה נמחקה בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה במחיקת קריאה: ${error.message}`);
    },
  });
};