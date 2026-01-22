import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Home } from 'lucide-react';

/**
 * RoleGuard - Protects content based on user role
 * @param {string[]} allowedRoles - Array of allowed roles ['admin', 'operator', 'vendor']
 * @param {React.ReactNode} children - Content to render if authorized
 * @param {React.ReactNode} fallback - Optional fallback content
 */
export default function RoleGuard({ 
  allowedRoles = [], 
  children, 
  fallback = null,
  showAccessDenied = true 
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if user's role is in allowed roles
        // Admin always has access
        const hasAccess = currentUser?.role === 'admin' || 
                         allowedRoles.includes(currentUser?.role);
        setAuthorized(hasAccess);
      } catch (error) {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    if (fallback) return fallback;
    
    if (showAccessDenied) {
      return (
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-[#172B4D] mb-2">אין הרשאה</h2>
            <p className="text-[#6B778C] mb-6">
              אין לך הרשאה לצפות בתוכן זה. 
              {user?.role && <span className="block mt-1">התפקיד שלך: {user.role}</span>}
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
 * Hook to check if user has specific role
 */
export function useHasRole(roles = []) {
  const [hasRole, setHasRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const user = await base44.auth.me();
        setHasRole(user?.role === 'admin' || roles.includes(user?.role));
      } catch {
        setHasRole(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [roles]);

  return { hasRole, loading };
}

/**
 * Hook to get current user with role
 */
export function useCurrentUserRole() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { 
    user, 
    loading, 
    isAdmin: user?.role === 'admin',
    isOperator: user?.role === 'operator' || user?.role === 'admin',
    isVendor: user?.role === 'vendor',
    role: user?.role
  };
}