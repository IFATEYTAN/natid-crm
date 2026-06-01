import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import * as vendorsApi from '../api';

/**
 * Hook for fetching all vendors
 */
export const useVendors = (sort = '-created_date') => {
  return useQuery({
    queryKey: queryKeys.vendors.all(),
    queryFn: () => vendorsApi.getVendors(sort),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook for fetching a single vendor by ID
 */
export const useVendor = (vendorId) => {
  return useQuery({
    queryKey: queryKeys.vendors.detail(vendorId),
    queryFn: () => vendorsApi.getVendorById(vendorId),
    enabled: !!vendorId,
  });
};

/**
 * Hook for fetching vendor by email
 */
export const useVendorByEmail = (email) => {
  return useQuery({
    queryKey: queryKeys.vendors.byEmail(email),
    queryFn: () => vendorsApi.getVendorByEmail(email),
    enabled: !!email,
  });
};

/**
 * Hook for fetching available vendors
 */
export const useAvailableVendors = (refetchInterval = 90000) => {
  return useQuery({
    queryKey: queryKeys.vendors.available(),
    queryFn: vendorsApi.getAvailableVendors,
    refetchInterval,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook for creating a vendor
 */
export const useCreateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorsApi.createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
      toast.success('ספק נוצר בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת ספק: ${error.message}`);
    },
  });
};

/**
 * Hook for updating a vendor
 */
export const useUpdateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => vendorsApi.updateVendor(id, data),
    onSuccess: (updatedVendor, { id }) => {
      queryClient.setQueryData(queryKeys.vendors.detail(id), updatedVendor);
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.available() });
      toast.success('ספק עודכן בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון ספק: ${error.message}`);
    },
  });
};

/**
 * Hook for deleting a vendor
 */
export const useDeleteVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorsApi.deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
      toast.success('ספק נמחק בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה במחיקת ספק: ${error.message}`);
    },
  });
};

/**
 * Hook for updating vendor availability
 */
export const useUpdateVendorAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isAvailable }) =>
      vendorsApi.updateVendor(id, {
        is_available_now: isAvailable,
        availability_status: isAvailable ? 'available' : 'offline',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.available() });
      toast.success('זמינות הספק עודכנה');
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון זמינות: ${error.message}`);
    },
  });
};

/**
 * Hook for fetching vendor ratings
 */
export const useVendorRatings = (vendorId, sort = '-created_date', limit = 20) => {
  return useQuery({
    queryKey: queryKeys.vendors.ratings(vendorId),
    queryFn: () => vendorsApi.getVendorRatings(vendorId, sort, limit),
    enabled: !!vendorId,
  });
};

/**
 * Hook for fetching vendor payments
 */
export const useVendorPayments = (vendorId, sort = '-created_date', limit = 20) => {
  return useQuery({
    queryKey: queryKeys.vendors.payments(vendorId),
    queryFn: () => vendorsApi.getVendorPayments(vendorId, sort, limit),
    enabled: !!vendorId,
  });
};

/**
 * Hook for fetching vendor contracts
 */
export const useVendorContracts = (vendorId, sort = '-created_date') => {
  return useQuery({
    queryKey: queryKeys.vendors.contracts(vendorId),
    queryFn: () => vendorsApi.getVendorContracts(vendorId, sort),
    enabled: !!vendorId,
  });
};

/**
 * Hook for fetching vendor locations
 */
export const useVendorLocations = (vendorId, sort = '-created_date', limit = 1) => {
  return useQuery({
    queryKey: queryKeys.vendors.locations(vendorId),
    queryFn: () => vendorsApi.getVendorLocations(vendorId, sort, limit),
    enabled: !!vendorId,
  });
};

/**
 * Hook for fetching all vendor locations
 */
export const useAllVendorLocations = (sort = '-created_date', limit = 500) => {
  return useQuery({
    queryKey: queryKeys.vendors.allLocations(),
    queryFn: () => vendorsApi.getAllVendorLocations(sort, limit),
  });
};

/**
 * Hook for fetching available service providers
 */
export const useAvailableServiceProviders = () => {
  return useQuery({
    queryKey: queryKeys.serviceProviders.available(),
    queryFn: vendorsApi.getAvailableServiceProviders,
  });
};

/**
 * Hook for updating service provider
 */
export const useUpdateServiceProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => vendorsApi.updateServiceProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceProviders.available() });
    },
    onError: () => {
      toast.error('שגיאה בעדכון נותן שירות');
    },
  });
};

/**
 * Hook for fetching assignment attempts
 */
export const useAssignmentAttempts = (vendorId, filters = {}) => {
  return useQuery({
    queryKey: queryKeys.assignmentAttempts.byVendor(vendorId),
    queryFn: () => vendorsApi.getAssignmentAttempts(vendorId, filters),
    enabled: !!vendorId,
  });
};
