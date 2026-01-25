import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { SlideUp } from '@/components/animations/AnimatedComponents';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import UserNotificationPreferences from '@/components/notifications/UserNotificationPreferences';

export default function MyNotificationSettingsPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      console.error('Error fetching user:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  if (isLoading) {
    return <PageLoader text="טוען הגדרות..." />;
  }

  return (
    <SlideUp>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#111827]">העדפות התראות</h1>
          <p className="text-[#6b7280] text-sm">הגדר אילו התראות תרצה לקבל וכיצד</p>
        </div>

        <UserNotificationPreferences user={user} onUpdate={fetchUser} />
      </div>
    </SlideUp>
  );
}