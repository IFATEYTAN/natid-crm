import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/permissions/PermissionsContext';

export function useAuditLog() {
  const { currentUser } = usePermissions();

  const logAction = async (params) => {
    try {
      await base44.entities.AuditLog.create({
        user_email: currentUser?.email || 'unknown',
        user_name: currentUser?.full_name,
        user_role: currentUser?.role,
        action: params.action,
        entity_type: params.entity_type || 'Unknown',
        entity_id: params.entity_id,
        entity_name: params.entity_name,
        details: params.details,
        old_value: params.old_value,
        new_value: params.new_value,
        severity: params.severity || 'info',
      });
    } catch {
      // Silently ignore audit log failures
    }
  };

  return { logAction };
}
