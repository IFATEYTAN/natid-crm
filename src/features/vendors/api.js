import { base44 } from '@/lib/api';

/**
 * Vendors API functions
 * Centralized API calls for the vendors feature
 */

// List all vendors
export const getVendors = (sort = '-created_date', limit = 1000) => {
  return base44.entities.Vendor.list(sort, limit);
};

// Get a single vendor by ID
export const getVendorById = (id) => {
  return base44.entities.Vendor.filter({ id }).then((vendors) => vendors[0]);
};

// Get vendor by email
export const getVendorByEmail = (email) => {
  return base44.entities.Vendor.filter({ email }, '-created_date', 1).then((vendors) => vendors[0]);
};

// Filter vendors with custom criteria
export const filterVendors = (filters, sort = '-created_date', limit = 1000) => {
  return base44.entities.Vendor.filter(filters, sort, limit);
};

// Get available vendors
export const getAvailableVendors = () => {
  return base44.entities.Vendor.filter({
    is_active: true,
    availability_status: 'available',
  }, '-created_date', 1000);
};

// Create a new vendor
export const createVendor = (data) => {
  return base44.entities.Vendor.create(data);
};

// Update a vendor
export const updateVendor = (id, data) => {
  return base44.entities.Vendor.update(id, data);
};

// Delete a vendor
export const deleteVendor = (id) => {
  return base44.entities.Vendor.delete(id);
};

// Vendor Ratings
export const getVendorRatings = (vendorId, sort = '-created_date', limit = 20) => {
  return base44.entities.VendorRating.filter({ vendor_id: vendorId }, sort, limit);
};

export const getAllVendorRatings = (sort = '-created_date', limit = 500) => {
  return base44.entities.VendorRating.list(sort, limit);
};

// Vendor Payments
export const getVendorPayments = (vendorId, sort = '-created_date', limit = 20) => {
  return base44.entities.VendorPayment.filter({ vendor_id: vendorId }, sort, limit);
};

export const getAllVendorPayments = (sort = '-created_date', limit = 500) => {
  return base44.entities.VendorPayment.list(sort, limit);
};

// Vendor Contracts
export const getVendorContracts = (vendorId, sort = '-created_date') => {
  return base44.entities.VendorContract.filter({ vendor_id: vendorId }, sort);
};

// Vendor Locations
export const getVendorLocations = (vendorId, sort = '-created_date', limit = 1) => {
  return base44.entities.VendorLocation.filter({ vendor_id: vendorId }, sort, limit);
};

export const getAllVendorLocations = (sort = '-created_date', limit = 500) => {
  return base44.entities.VendorLocation.list(sort, limit);
};

export const filterVendorLocations = (filters, sort = '-created_date', limit) => {
  return base44.entities.VendorLocation.filter(filters, sort, limit);
};

// Service Providers (legacy/alias)
export const getAvailableServiceProviders = () => {
  return base44.entities.ServiceProvider.filter({ status: 'available' });
};

export const updateServiceProvider = (id, data) => {
  return base44.entities.ServiceProvider.update(id, data);
};

// Call Assignment Attempts
export const getAssignmentAttempts = (vendorId, filters = {}) => {
  return base44.entities.CallAssignmentAttempt.filter({
    vendor_id: vendorId,
    ...filters,
  });
};