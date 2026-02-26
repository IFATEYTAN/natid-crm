import React from 'react';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { SlideUp } from '@/components/animations/AnimatedComponents';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import UserNotificationPreferences from '@/components/notifications/UserNotificationPreferences';

export default function MyNotificationSettingsPage() {
  const { currentUser: user, isLoading } = usePermissions();

  if (isLoading || !user) {
    return <PageLoader text="טוען הגדרות..." />;
  }

  return (
    <SlideUp>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#111827]">העדפות התראות</h1>
          <p className="text-[#6b7280] text-sm">הגדר אילו התראות תרצה לקבל וכיצד</p>
        </div>

        <UserNotificationPreferences user={user} />
      </div>
    </SlideUp>
  );
}
