import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/AuthProvider';

export function useAuditLog() {
  const { user } = useAuth();

  const logAction = useCallback(
    async (action, entityType, entityId, entityName, details, oldVal = null, newVal = null) => {
      try {
        if (!user) return;

        await base44.functions.invoke('logAuditAction', {
          action,
          entity_type: entityType,
          entity_id: entityId?.toString(),
          entity_name: entityName,
          details,
          old_value: oldVal ? JSON.stringify(oldVal) : null,
          new_value: newVal ? JSON.stringify(newVal) : null,
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          user_role: user.role,
        });
      } catch (error) {
        console.error('Failed to log audit action:', error);
      }
    },
    [user]
  );

  const logCreate = useCallback(
    (entityType, entityId, entityName, details) => {
      return logAction('create', entityType, entityId, entityName, details);
    },
    [logAction]
  );

  const logUpdate = useCallback(
    (entityType, entityId, entityName, oldValue, newValue, details = 'Updated record') => {
      return logAction('update', entityType, entityId, entityName, details, oldValue, newValue);
    },
    [logAction]
  );

  const logDelete = useCallback(
    (entityType, entityId, entityName, details) => {
      return logAction('delete', entityType, entityId, entityName, details);
    },
    [logAction]
  );

  const logPermissionChange = useCallback(
    (targetUserEmail, oldRole, newRole) => {
      return logAction(
        'permission_change',
        'UserPermission',
        targetUserEmail,
        targetUserEmail,
        `Changed role from ${oldRole} to ${newRole}`,
        oldRole,
        newRole
      );
    },
    [logAction]
  );

  return {
    logAction,
    logCreate,
    logUpdate,
    logDelete,
    logPermissionChange,
  };
}