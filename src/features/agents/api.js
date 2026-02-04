import { base44 } from '@/lib/api';

/**
 * Users/Agents API functions
 * Centralized API calls for user management
 */

// List all users
export const getUsers = (sort = '-created_date') => {
  return base44.entities.User.list(sort);
};

// Get agents only (users with role 'user')
export const getAgents = async () => {
  const users = await base44.entities.User.list();
  return users.filter((u) => u.role === 'user');
};

// Get a single user by ID
export const getUserById = (id) => {
  return base44.entities.User.filter({ id }).then((users) => users[0]);
};

// Filter users with custom criteria
export const filterUsers = (filters, sort = '-created_date', limit) => {
  return base44.entities.User.filter(filters, sort, limit);
};

// Update a user
export const updateUser = (id, data) => {
  return base44.entities.User.update(id, data);
};

// Create a user
export const createUser = (data) => {
  return base44.entities.User.create(data);
};

// Delete a user
export const deleteUser = (id) => {
  return base44.entities.User.delete(id);
};
