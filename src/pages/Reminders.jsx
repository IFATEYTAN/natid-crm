import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import RemindersList from '@/components/reminders/RemindersList';

export default function RemindersPage() {
  const { currentUser } = usePermissions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">תזכורות</h1>
        <p className="text-sm text-gray-500 mt-1">כל התזכורות הפתוחות שלך</p>
      </div>
      <RemindersList showAll currentUser={currentUser} />
    </div>
  );
}