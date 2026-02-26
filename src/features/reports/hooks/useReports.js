import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as reportsApi from '../api';

/**
 * Hook for fetching vendors for reports
 */
export const useReportVendors = () => {
  return useQuery({
    queryKey: queryKeys.reports.vendors(),
    queryFn: reportsApi.getReportVendors,
  });
};

/**
 * Hook for fetching customers for reports
 */
export const useReportCustomers = () => {
  return useQuery({
    queryKey: queryKeys.reports.customers(),
    queryFn: reportsApi.getReportCustomers,
  });
};

/**
 * Hook for fetching calls for reports
 */
export const useReportCalls = (sort = '-created_date', limit = 1000) => {
  return useQuery({
    queryKey: queryKeys.reports.calls(),
    queryFn: () => reportsApi.getReportCalls(sort, limit),
  });
};

/**
 * Hook for fetching vendor ratings for reports
 */
export const useReportVendorRatings = (sort = '-created_date', limit = 500) => {
  return useQuery({
    queryKey: queryKeys.reports.vendorRatings(),
    queryFn: () => reportsApi.getReportVendorRatings(sort, limit),
  });
};

/**
 * Hook for fetching vendor payments for reports
 */
export const useReportVendorPayments = (sort = '-created_date', limit = 500) => {
  return useQuery({
    queryKey: queryKeys.reports.vendorPayments(),
    queryFn: () => reportsApi.getReportVendorPayments(sort, limit),
  });
};
