import { base44 } from '@/lib/api';

/**
 * Calls API functions
 * Centralized API calls for the calls feature
 */

// List calls with optional sorting and limit
export const getCalls = (sort = '-created_date', limit = 500) => {
  return base44.entities.Call.list(sort, limit);
};

// Get a single call by ID
export const getCallById = (id) => {
  return base44.entities.Call.filter({ id }).then((calls) => calls[0]);
};

// Filter calls with custom criteria
export const filterCalls = (filters, sort = '-created_date', limit = 500) => {
  return base44.entities.Call.filter(filters, sort, limit);
};

// Get calls by vendor
export const getCallsByVendor = (vendorId, sort = '-created_date', limit = 50) => {
  return base44.entities.Call.filter({ assigned_vendor_id: vendorId }, sort, limit);
};

// Get calls by customer
export const getCallsByCustomer = (customerId, sort = '-created_date') => {
  return base44.entities.Call.filter({ customer_id: customerId }, sort);
};

// Get open calls (for operators)
export const getOpenCalls = (sort = '-created_date') => {
  return base44.entities.Call.filter(
    {
      call_status: [
        'waiting_treatment',
        'awaiting_assignment',
        'assigning',
        'vendor_enroute',
        'in_progress',
      ],
    },
    sort
  );
};

// Get today's completed calls
export const getTodayCompletedCalls = (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return base44.entities.Call.filter(
    {
      call_status: 'completed',
      created_date: { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() },
    },
    '-created_date'
  );
};

// Create a new call
export const createCall = (data) => {
  return base44.entities.Call.create(data);
};

// Update a call
export const updateCall = (id, data) => {
  return base44.entities.Call.update(id, data);
};

// Delete a call
export const deleteCall = (id) => {
  return base44.entities.Call.delete(id);
};

// Call History
export const createCallHistory = (data) => {
  return base44.entities.CallHistory.create(data);
};

// Call Photos
export const getCallPhotos = (callId) => {
  return base44.entities.CallPhoto.filter({ call_id: callId, is_deleted: false });
};

export const createCallPhoto = (data) => {
  return base44.entities.CallPhoto.create(data);
};
