/**
 * Custom Hook for Vendors (Service Providers)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// --- API Functions ---

const getVendors = async (options = {}) => {
  const { sortBy = '-created_date', limit = 500 } = options;
  return base44.entities.Vendor.list(sortBy, limit);
};

const getVendorById = async (id) => {
  return base44.entities.Vendor.filter({ id });
};

const createVendor = async (data) => {
  return base44.entities.Vendor.create(data);
};

const updateVendor = async ({ id, data }) => {
  return base44.entities.Vendor.update(id, data);
};

const deleteVendor = async (id) => {
  return base44.entities.Vendor.delete(id);
};

// --- Custom Hooks ---

export const useVendors = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.vendors.list(options),
    queryFn: () => getVendors(options),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useVendor = (id) => {
  return useQuery({
    queryKey: queryKeys.vendors.detail(id),
    queryFn: () => getVendorById(id),
    enabled: !!id,
  });
};

export const useAvailableVendors = () => {
  return useQuery({
    queryKey: ['vendors', 'available'],
    queryFn: async () => {
      const vendors = await getVendors();
      return vendors.filter(v => v.is_active && v.is_available_now);
    },
    staleTime: 1000 * 60 * 1, // 1 minute - more frequent for availability
  });
};

export const useCreateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
      toast.success('ספק נוצר בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת ספק: ${error.message}`);
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateVendor,
    onSuccess: (updatedVendor) => {
      queryClient.setQueryData(queryKeys.vendors.detail(updatedVendor.id), updatedVendor);
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
      toast.success('ספק עודכן בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון ספק: ${error.message}`);
    },
  });
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
      toast.success('ספק נמחק בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה במחיקת ספק: ${error.message}`);
    },
  });
};

export const useUpdateVendorAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isAvailable }) => 
      base44.entities.Vendor.update(id, { 
        is_available_now: isAvailable,
        availability_status: isAvailable ? 'available' : 'offline'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
      toast.success('זמינות הספק עודכנה');
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון זמינות: ${error.message}`);
    },
  });
};