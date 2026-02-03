import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Hook לתיעוד פעולות ביומן
export function useAuditLog() {
  
  const logAction = useCallback(async ({
    action,
    entity_type,
    entity_id = null,
    entity_name = null,
    details = null,
    old_value = null,
    new_value = null,
    severity = 'info'
  }) => {
    try {
      await base44.functions.invoke('logAuditAction', {
        action,
        entity_type,
        entity_id,
        entity_name,
        details,
        old_value,
        new_value,
        severity
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - audit logging should not break the app
    }
  }, []);

  // פעולות מוכנות מראש
  const logCreate = useCallback((entity_type, entity_id, entity_name, details) => {
    return logAction({ action: 'create', entity_type, entity_id, entity_name, details });
  }, [logAction]);

  const logUpdate = useCallback((entity_type, entity_id, entity_name, old_value, new_value) => {
    return logAction({ action: 'update', entity_type, entity_id, entity_name, old_value, new_value });
  }, [logAction]);

  const logDelete = useCallback((entity_type, entity_id, entity_name, details) => {
    return logAction({ action: 'delete', entity_type, entity_id, entity_name, details, severity: 'warning' });
  }, [logAction]);

  const logStatusChange = useCallback((entity_type, entity_id, entity_name, old_status, new_status) => {
    return logAction({ 
      action: 'status_change', 
      entity_type, 
      entity_id, 
      entity_name,
      old_value: old_status,
      new_value: new_status 
    });
  }, [logAction]);

  const logAssign = useCallback((entity_type, entity_id, entity_name, assigned_to) => {
    return logAction({ 
      action: 'assign', 
      entity_type, 
      entity_id, 
      entity_name,
      details: `שובץ ל: ${assigned_to}` 
    });
  }, [logAction]);

  const logExport = useCallback((entity_type, details) => {
    return logAction({ action: 'export', entity_type, details });
  }, [logAction]);

  const logPermissionChange = useCallback((user_email, old_role, new_role) => {
    return logAction({ 
      action: 'permission_change', 
      entity_type: 'UserPermission',
      entity_name: user_email,
      old_value: old_role,
      new_value: new_role,
      severity: 'warning'
    });
  }, [logAction]);

  const logAccessDenied = useCallback((page_name, details) => {
    return logAction({ 
      action: 'access_denied', 
      entity_type: 'Page',
      entity_name: page_name,
      details,
      severity: 'warning'
    });
  }, [logAction]);

  const logSensitiveAccess = useCallback((entity_type, entity_id, entity_name, details) => {
    return logAction({ 
      action: 'sensitive_data_access', 
      entity_type, 
      entity_id, 
      entity_name,
      details,
      severity: 'critical'
    });
  }, [logAction]);

  const logError = useCallback((error_message, component_name, details = null) => {
    return logAction({ 
      action: 'error', 
      entity_type: 'System',
      entity_name: component_name || 'Unknown Component',
      details: `${error_message}${details ? `\n${details}` : ''}`,
      severity: 'critical'
    });
  }, [logAction]);

  return {
    logAction,
    logCreate,
    logUpdate,
    logDelete,
    logStatusChange,
    logAssign,
    logExport,
    logPermissionChange,
    logAccessDenied,
    logSensitiveAccess,
    logError
  };
}

export default useAuditLog;