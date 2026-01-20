import { base44 } from '@/lib/api';

/**
 * Reports API functions
 * Centralized API calls for reports feature
 */

// Get all data for reports
export const getReportVendors = () => {
  return base44.entities.Vendor.list();
};

export const getReportCustomers = () => {
  return base44.entities.Customer.list();
};

export const getReportCalls = (sort = '-created_date', limit = 1000) => {
  return base44.entities.Call.list(sort, limit);
};

export const getReportVendorRatings = (sort = '-created_date', limit = 500) => {
  return base44.entities.VendorRating.list(sort, limit);
};

export const getReportVendorPayments = (sort = '-created_date', limit = 500) => {
  return base44.entities.VendorPayment.list(sort, limit);
};
