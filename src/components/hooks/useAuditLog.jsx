/**
 * Custom Hook for Audit Logging
 */

import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const useLogAction = () => {
  return useMutation({
    mutationFn: async ({ action, entityType, entityId, entityName, details, oldValue, newValue }) => {
      try {
        const user = await base44.auth.me();
        
        return base44.entities.AuditLog.create({
          user_id: user?.id,
          user_email: user?.email || 'anonymous',
          user_role: user?.role || 'unknown',
          action,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          details,
          old_value: oldValue ? JSON.stringify(oldValue) : null,
          new_value: newValue ? JSON.stringify(newValue) : null,
        });
      } catch (error) {
        console.error('Audit log error:', error);
      }
    }
  });
};

// Helper function for simple logging
export const logAction = async (action, entityType, entityId, entityName, details) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.AuditLog.create({
      user_id: user?.id,
      user_email: user?.email || 'anonymous',
      user_role: user?.role || 'unknown',
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};