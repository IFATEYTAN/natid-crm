import { base44 } from '@/lib/api';

/**
 * Messages API functions
 * Shared API calls for messaging functionality
 */

// Get messages by call
export const getMessagesByCall = (callId, sort = 'created_date', limit = 100) => {
  return base44.entities.Message.filter({ call_id: callId }, sort, limit);
};

// Create a message
export const createMessage = (data) => {
  return base44.entities.Message.create(data);
};

// Update a message
export const updateMessage = (id, data) => {
  return base44.entities.Message.update(id, data);
};

// Delete a message
export const deleteMessage = (id) => {
  return base44.entities.Message.delete(id);
};
