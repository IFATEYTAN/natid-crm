import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { usePermissions } from '@/components/permissions/PermissionsContext';

/**
 * Default pages per role – used when redirecting after access denied.
 * First accessible page wins.
 */
const ROLE_DEFAULT_PAGES = {
  operator: ['Dashboard', 'Calls', 'QueueMonitor', 'Calendar'],
  vendor: ['VendorPortal', 'VendorCallManagement', 'MyVendorProfile'],
  agent: ['UserProfile', 'FormView', 'UserGuide'],
};

/**
 * RoleGuard - Protects content based on user role
 * Uses effectiveRole from PermissionsContext (resolves Base44 platform role to app role)
 * When access is denied and showAccessDenied is true, automatically redirects to the
 * user's default page instead of showing an error card.
 * @param {string[]} allowedRoles - Array of allowed roles ['admin', 'operator', 'vendor', 'agent']
 * @param {React.ReactNode} children - Content to render if authorized
 * @param {React.ReactNode} fallback - Optional fallback content
 */
export default function RoleGuard({
  allowedRoles = [],
  children,
  fallback = null,
  showAccessDenied = true,
}) {
  const { effectiveRole, canAccessPage, isLoading } = usePermissions();
  const navigate = useNavigate();

  const hasAccess =
    !isLoading && (effectiveRole === 'admin' || allowedRoles.includes(effectiveRole));

  // Redirect to the user's default accessible page when access is denied
  useEffect(() => {
    if (isLoading || hasAccess || fallback || !showAccessDenied) return;

    const candidates = ROLE_DEFAULT_PAGES[effectiveRole] || [];
    const target = candidates.find((p) => canAccessPage(p)) || 'UserProfile';
    navigate(createPageUrl(target), { replace: true });
  }, [isLoading, hasAccess, effectiveRole, canAccessPage, navigate, fallback, showAccessDenied]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) return fallback;

    // Show spinner while the redirect effect fires
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}

/**
 * Hook to check if user has specific role (uses effectiveRole)
 */
export function useHasRole(roles = []) {
  const { effectiveRole, isLoading } = usePermissions();
  return {
    hasRole: effectiveRole === 'admin' || roles.includes(effectiveRole),
    loading: isLoading,
  };
}

/**
 * Hook to get current user with effective role
 */
export function useCurrentUserRole() {
  const { currentUser, effectiveRole, isLoading } = usePermissions();

  return {
    user: currentUser,
    loading: isLoading,
    isAdmin: effectiveRole === 'admin',
    isOperator: effectiveRole === 'operator' || effectiveRole === 'admin',
    isVendor: effectiveRole === 'vendor',
    isAgent: effectiveRole === 'agent',
    role: effectiveRole,
  };
}
