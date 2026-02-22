import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, Home } from 'lucide-react';
import { usePermissions } from '@/components/permissions/PermissionsContext';

/**
 * RoleGuard - Protects content based on user role
 * Uses effectiveRole from PermissionsContext (resolves Base44 platform role to app role)
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
  const { effectiveRole, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasAccess = effectiveRole === 'admin' || allowedRoles.includes(effectiveRole);

  if (!hasAccess) {
    if (fallback) return fallback;

    if (showAccessDenied) {
      return (
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-[#172B4D] mb-2">אין הרשאה</h2>
            <p className="text-[#6B778C] mb-6">
              אין לך הרשאה לצפות בתוכן זה.
              {effectiveRole && <span className="block mt-1">התפקיד שלך: {effectiveRole}</span>}
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button className="gap-2">
                <Home className="w-4 h-4" />
                חזרה לדשבורד
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    return null;
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
