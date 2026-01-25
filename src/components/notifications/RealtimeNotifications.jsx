import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

const notificationIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle
};

const notificationColors = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-orange-500',
  error: 'text-red-500'
};

export default function RealtimeNotifications({ userId, soundEnabled = true }) {
  const queryClient = useQueryClient();
  const audioRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to real-time notification updates
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_id === userId) {
        const notification = event.data;
        
        // Play sound if enabled
        if (soundEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }

        // Show toast notification
        const Icon = notificationIcons[notification.type] || Bell;
        const colorClass = notificationColors[notification.type] || 'text-blue-500';
        
        toast(notification.title, {
          description: notification.message,
          icon: <Icon className={`w-5 h-5 ${colorClass}`} />,
          action: notification.link ? {
            label: 'צפה',
            onClick: () => {
              window.location.href = notification.link;
            }
          } : undefined,
          duration: 5000
        });

        // Invalidate notifications query to update the bell counter
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });

    return () => unsubscribe();
  }, [userId, soundEnabled, queryClient]);

  return (
    <audio 
      ref={audioRef} 
      src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
      preload="auto"
    />
  );
}