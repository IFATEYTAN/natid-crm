import { base44 } from "@/components/lib/api";

/**
 * Fetch all calls
 * @param {Object} options - Query options
 * @param {string} options.sortBy - Sort field
 * @param {number} options.limit - Limit results
 * @returns {Promise<Array>} List of calls
 */
export const getCalls = async (options = {}) => {
  const { sortBy = "-created_date", limit = 500 } = options;
  try {
    return await base44.entities.Call.list(sortBy, limit);
  } catch (error) {
    console.error("Error fetching calls:", error);
    throw error;
  }
};

/**
 * Fetch a single call by ID
 * @param {string} id - Call ID
 * @returns {Promise<Object>} Call details
 */
export const getCallById = async (id) => {
  try {
    return await base44.entities.Call.get(id);
  } catch (error) {
    console.error(`Error fetching call ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new call
 * @param {Object} data - Call data
 * @returns {Promise<Object>} Created call
 */
export const createCall = async (data) => {
  try {
    return await base44.entities.Call.create(data);
  } catch (error) {
    console.error("Error creating call:", error);
    throw error;
  }
};

/**
 * Update an existing call
 * @param {string} id - Call ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Updated call
 */
export const updateCall = async (id, data) => {
  try {
    return await base44.entities.Call.update(id, data);
  } catch (error) {
    console.error(`Error updating call ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a call
 * @param {string} id - Call ID
 * @returns {Promise<void>}
 */
export const deleteCall = async (id) => {
  try {
    return await base44.entities.Call.delete(id);
  } catch (error) {
    console.error(`Error deleting call ${id}:`, error);
    throw error;
  }
};

/**
 * Assign a call to an agent
 * @param {string} callId - Call ID
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} Updated call
 */
export const assignCallToAgent = async (callId, agentId) => {
  try {
    return await updateCall(callId, { assigned_agent_id: agentId, status: "assigned" });
  } catch (error) {
    console.error(`Error assigning call ${callId} to agent ${agentId}:`, error);
    throw error;
  }
};