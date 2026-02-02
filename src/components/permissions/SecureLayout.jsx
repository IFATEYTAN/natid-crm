import React from 'react';
import { PermissionsProvider, usePermissions } from './PermissionsContext';
import { PagePermissionGuard } from './PermissionGuard';
import { Skeleton } from '@/components/ui/skeleton';

// קומפוננטת עטיפה בטוחה שמגנה על כל האפליקציה
export function SecureLayout({ children, currentPageName }) {
  return (
    <PermissionsProvider>
      <SecurePageContent currentPageName={currentPageName}>
        {children}
      </SecurePageContent>
    </PermissionsProvider>
  );
}

// תוכן הדף המאובטח
function SecurePageContent({ children, currentPageName }) {
  const { isLoading } = usePermissions();
  
  // דפים שלא דורשים הרשאות (ציבוריים או דפי כניסה)
  const publicPages = ['AuthLogin', 'Login', 'SignIn', 'Register'];
  
  // דפים של ספקים - יש להם לוגיקה משלהם ב-Layout
  const vendorPages = ['VendorPortal', 'VendorCallManagement', 'MyVendorProfile'];
  
  const isPublicPage = publicPages.includes(currentPageName);
  const isVendorPage = vendorPages.includes(currentPageName);
  
  // עבור דפים ציבוריים - אין צורך בבדיקת הרשאות
  if (isPublicPage) {
    return children;
  }
  
  // עבור דפי ספקים - ה-Layout מטפל באבטחה
  if (isVendorPage) {
    return children;
  }
  
  // בזמן טעינה - מראה skeleton
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  
  // הגנה על הדף לפי הרשאות
  return (
    <PagePermissionGuard pageName={currentPageName}>
      {children}
    </PagePermissionGuard>
  );
}

export default SecureLayout;