import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook לתיעוד שגיאות גלובליות שלא נתפסו
 * מקשיב ל-window.onerror ו-unhandledrejection
 */
export function useErrorLogger() {
  useEffect(() => {
    // טיפול בשגיאות JavaScript גלובליות
    const handleError = async (event) => {
      try {
        await base44.functions.invoke('logAuditAction', {
          action: 'error',
          entity_type: 'System',
          entity_name: 'Global Error Handler',
          details: `${event.message}\nFile: ${event.filename}:${event.lineno}:${event.colno}\nError: ${event.error?.stack?.substring(0, 500)}`,
          severity: 'critical',
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    };

    // טיפול ב-Promise rejections שלא נתפסו
    const handleRejection = async (event) => {
      try {
        await base44.functions.invoke('logAuditAction', {
          action: 'error',
          entity_type: 'System',
          entity_name: 'Unhandled Promise Rejection',
          details: `Reason: ${event.reason?.toString()}\nStack: ${event.reason?.stack?.substring(0, 500)}`,
          severity: 'critical',
        });
      } catch (logError) {
        console.error('Failed to log rejection:', logError);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
}

export default useErrorLogger;
