import { base44 } from '@/lib/api';

/**
 * Cases API functions
 * Centralized API calls for the cases feature
 */

// List cases with optional sorting and limit
export const getCases = (sort = '-created_date', limit = 200) => {
  return base44.entities.Case.list(sort, limit);
};

// Get a single case by ID
export const getCaseById = (id) => {
  return base44.entities.Case.filter({ id }).then((cases) => cases[0]);
};

// Filter cases with custom criteria
export const filterCases = (filters, sort = '-created_date', limit = 200) => {
  return base44.entities.Case.filter(filters, sort, limit);
};

// Create a new case
export const createCase = (data) => {
  return base44.entities.Case.create(data);
};

// Update a case
export const updateCase = (id, data) => {
  return base44.entities.Case.update(id, data);
};

// Delete a case
export const deleteCase = (id) => {
  return base44.entities.Case.delete(id);
};

// Case Activities
export const getCaseActivities = (caseId, sort = '-created_date', limit = 50) => {
  return base44.entities.CaseActivity.filter({ case_id: caseId }, sort, limit);
};

export const createCaseActivity = (data) => {
  return base44.entities.CaseActivity.create(data);
};
