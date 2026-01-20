import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as casesApi from '../api';

/**
 * Hook for fetching all cases
 */
export const useCases = (sort = '-created_date', limit = 200) => {
  return useQuery({
    queryKey: queryKeys.cases.all(),
    queryFn: () => casesApi.getCases(sort, limit),
  });
};

/**
 * Hook for fetching a single case by ID
 */
export const useCase = (caseId) => {
  return useQuery({
    queryKey: queryKeys.cases.detail(caseId),
    queryFn: () => casesApi.getCaseById(caseId),
    enabled: !!caseId,
  });
};

/**
 * Hook for fetching cases with filters
 */
export const useFilteredCases = (filters, sort = '-created_date', limit = 200) => {
  return useQuery({
    queryKey: queryKeys.cases.list(filters),
    queryFn: () => casesApi.filterCases(filters, sort, limit),
    enabled: !!filters,
  });
};

/**
 * Hook for creating a case
 */
export const useCreateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: casesApi.createCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
    },
  });
};

/**
 * Hook for updating a case
 */
export const useUpdateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => casesApi.updateCase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id) });
    },
  });
};

/**
 * Hook for deleting a case
 */
export const useDeleteCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: casesApi.deleteCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
    },
  });
};

/**
 * Hook for fetching case activities
 */
export const useCaseActivities = (caseId, sort = '-created_date', limit = 50) => {
  return useQuery({
    queryKey: queryKeys.activities.byCase(caseId),
    queryFn: () => casesApi.getCaseActivities(caseId, sort, limit),
    enabled: !!caseId,
  });
};

/**
 * Hook for creating case activity
 */
export const useCreateCaseActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: casesApi.createCaseActivity,
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.byCase(data.case_id) });
    },
  });
};
