import { base44 } from '@/lib/api';

/**
 * Queue API functions
 * Centralized API calls for the work queue feature
 */

// List all work queue items
export const getWorkQueue = (sort = '-priority_score') => {
  return base44.entities.WorkQueue.list(sort);
};

// Get a single queue item by ID
export const getQueueItemById = (id) => {
  return base44.entities.WorkQueue.filter({ id }).then(items => items[0]);
};

// Filter queue items with custom criteria
export const filterWorkQueue = (filters, sort = '-priority_score', limit) => {
  return base44.entities.WorkQueue.filter(filters, sort, limit);
};

// Update a queue item
export const updateQueueItem = (id, data) => {
  return base44.entities.WorkQueue.update(id, data);
};

// Assign queue item to agent
export const assignToAgent = (queueId, agentEmail) => {
  return base44.entities.WorkQueue.update(queueId, {
    assigned_to_agent: agentEmail,
    queue_status: 'assigned_to_agent',
    assigned_at: new Date().toISOString()
  });
};

// Start working on queue item
export const startQueueItem = (queueId) => {
  return base44.entities.WorkQueue.update(queueId, {
    queue_status: 'in_progress',
    started_at: new Date().toISOString()
  });
};

// Complete queue item
export const completeQueueItem = (queueId, timeToComplete) => {
  return base44.entities.WorkQueue.update(queueId, {
    queue_status: 'completed',
    completed_at: new Date().toISOString(),
    time_to_complete: timeToComplete
  });
};

// Create queue item
export const createQueueItem = (data) => {
  return base44.entities.WorkQueue.create(data);
};

// Delete queue item
export const deleteQueueItem = (id) => {
  return base44.entities.WorkQueue.delete(id);
};
