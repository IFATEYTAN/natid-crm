import React from 'react';
import { usePermissions } from './PermissionsContext';
import { Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

// קומפוננטה להגנה על תוכן לפי הרשאה
export function PermissionGuard({ 
  category, 
  permission, 
  children, 
  fallback = null,
  showMessage = false 
}) {
  const { hasPermission, isLoading } = usePermissions();
  
  if (isLoading) return null;
  
  if (!hasPermission(category, permission)) {
    if (fallback) return fallback;
    if (showMessage) {
      return (
        <div className="p-6 text-center bg-gray-50 rounded-lg border border-gray-200">
          <Lock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500 text-sm">אין לך הרשאה לצפות בתוכן זה</p>
        </div>
      );
    }
    return null;
  }
  
  return children;
}

// קומפוננטה להגנה על דף שלם
export function PagePermissionGuard({ pageName, children }) {
  const { canAccessPage, isLoading, isAdmin } = usePermissions();
  
  if (isLoading) return null;
  
  if (!canAccessPage(pageName)) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">אין גישה לדף זה</h2>
          <p className="text-gray-500 mb-6">
            אין לך את ההרשאות הנדרשות לצפות בדף זה. 
            פנה למנהל המערכת אם אתה צריך גישה.
          </p>
          <Link to={createPageUrl('Dashboard')}>
            <Button>חזרה לדף הבית</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return children;
}

// קומפוננטה לכפתור מוגן בהרשאה
export function PermissionButton({ 
  category, 
  permission, 
  children, 
  disabled,
  tooltip = 'אין לך הרשאה לפעולה זו',
  ...props 
}) {
  const { hasPermission } = usePermissions();
  const hasAccess = hasPermission(category, permission);
  
  return (
    <Button 
      {...props} 
      disabled={disabled || !hasAccess}
      title={!hasAccess ? tooltip : undefined}
      className={!hasAccess ? 'opacity-50 cursor-not-allowed' : props.className}
    >
      {children}
    </Button>
  );
}

// Hook לבדיקת הרשאות מרובות
export function useMultiplePermissions(permissions) {
  const { hasPermission } = usePermissions();
  
  return permissions.map(({ category, permission }) => ({
    category,
    permission,
    hasAccess: hasPermission(category, permission)
  }));
}