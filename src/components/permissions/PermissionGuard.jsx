import React from 'react';
import { usePermissions } from './PermissionsContext';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Skeleton } from '@/components/ui/skeleton';

// קומפוננטה להגנה על תוכן לפי הרשאה
export function PermissionGuard({ 
  category, 
  permission, 
  children, 
  fallback = null,
  showMessage = false,
  loadingFallback = null
}) {
  const { hasPermission, isLoading } = usePermissions();
  
  if (isLoading) {
    return loadingFallback || null;
  }
  
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
  const { canAccessPage, isLoading, currentUser } = usePermissions();
  
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="w-48 h-4 mx-auto" />
          <Skeleton className="w-32 h-4 mx-auto" />
        </div>
      </div>
    );
  }
  
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
          <div className="space-y-2">
            <Link to={createPageUrl('Dashboard')}>
              <Button className="w-full">חזרה לדף הבית</Button>
            </Link>
            {currentUser && (
              <p className="text-xs text-gray-400 mt-4">
                מחובר כ: {currentUser.email}
              </p>
            )}
          </div>
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
  hideWhenNoAccess = false,
  ...props 
}) {
  const { hasPermission, isLoading } = usePermissions();
  
  if (isLoading) return null;
  
  const hasAccess = hasPermission(category, permission);
  
  if (!hasAccess && hideWhenNoAccess) {
    return null;
  }
  
  return (
    <Button 
      {...props} 
      disabled={disabled || !hasAccess}
      title={!hasAccess ? tooltip : props.title}
      className={`${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''} ${props.className || ''}`}
    >
      {children}
    </Button>
  );
}

// קומפוננטה לקישור מוגן בהרשאה
export function PermissionLink({
  category,
  permission,
  to,
  children,
  hideWhenNoAccess = false,
  className = ''
}) {
  const { hasPermission, isLoading } = usePermissions();
  
  if (isLoading) return null;
  
  const hasAccess = hasPermission(category, permission);
  
  if (!hasAccess) {
    if (hideWhenNoAccess) return null;
    return (
      <span className={`opacity-50 cursor-not-allowed ${className}`} title="אין לך הרשאה">
        {children}
      </span>
    );
  }
  
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

// קומפוננטה להצגת הודעת אזהרה על הרשאה חסרה
export function PermissionWarning({ category, permission, message }) {
  const { hasPermission, isLoading } = usePermissions();
  
  if (isLoading || hasPermission(category, permission)) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{message || 'אין לך הרשאה מלאה לתוכן זה'}</span>
    </div>
  );
}

// Hook לבדיקת הרשאות מרובות
export function useMultiplePermissions(permissions) {
  const { hasPermission, isLoading } = usePermissions();
  
  if (isLoading) {
    return permissions.map(p => ({ ...p, hasAccess: false, isLoading: true }));
  }
  
  return permissions.map(({ category, permission }) => ({
    category,
    permission,
    hasAccess: hasPermission(category, permission),
    isLoading: false
  }));
}