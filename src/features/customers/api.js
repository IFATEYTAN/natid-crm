import { base44 } from '@/lib/api';

/**
 * Customers API functions
 * Centralized API calls for the customers feature
 */

// List all customers
export const getCustomers = (sort = '-created_date') => {
  return base44.entities.Customer.list(sort);
};

// Get a single customer by ID
export const getCustomerById = (id) => {
  return base44.entities.Customer.filter({ id }).then((customers) => customers[0]);
};

// Filter customers with custom criteria
export const filterCustomers = (filters, sort = '-created_date', limit) => {
  return base44.entities.Customer.filter(filters, sort, limit);
};

// Create a new customer
export const createCustomer = (data) => {
  return base44.entities.Customer.create(data);
};

// Update a customer
export const updateCustomer = (id, data) => {
  return base44.entities.Customer.update(id, data);
};

// Delete a customer
export const deleteCustomer = (id) => {
  return base44.entities.Customer.delete(id);
};

// Customer Interactions
export const getCustomerInteractions = (customerId, sort = '-interaction_date') => {
  return base44.entities.CustomerInteraction.filter({ customer_id: customerId }, sort);
};

export const createCustomerInteraction = (data) => {
  return base44.entities.CustomerInteraction.create(data);
};
