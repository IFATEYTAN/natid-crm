import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, ExternalLink, Trash2, AlertTriangle, Clock, AlertOctagon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { showToast } from '@/components/ui/FeedbackToast';
import { Link } from 'react-router-dom';

export default function SmartAlertsTab({ currentUser }) {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['smartAlerts', currentUser?.id],
    queryFn: async () => {
      // Fetch smart alerts for current user
      return await base44.entities.Notification.filter({
        user_id: currentUser?.id,
        type: 'smart_alert',
        is_read: false
      }, '-created_date');
    },
    enabled: !!currentUser?.id,
    refetchInterval: 30000 // Refresh every 30s
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartAlerts'] });
      showToast.success('התראה סומנה כנקראה');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartAlerts'] });
      showToast.success('התראה נמחקה');
    }
  });

  const handleMarkAllRead = async () => {
    try {
        // Optimistic update or just loop
        // Since we can't bulk update easily by query yet via simple SDK, loop for now or backend function
        // For < 50 items loop is fine
        for (const alert of alerts) {
            await base44.entities.Notification.update(alert.id, { is_read: true });
        }
        queryClient.invalidateQueries({ queryKey: ['smartAlerts'] });
        showToast.success('כל ההתראות סומנו כנקראו');
    } catch (e) {
        console.error(e);
    }
  };

  const getAlertIcon = (title) => {
    if (!title) return Bell;
    if (title.includes('SLA')) return Clock;
    if (title.includes('זמן רב') || title.includes('זמן טיפול')) return AlertTriangle;
    if (title.includes('דחיות')) return AlertOctagon;
    return Bell;
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">טוען התראות...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              התראות חכמות וזיהוי חריגות
            </CardTitle>
            <CardDescription>
              מערכת זיהוי פרואקטיבי של בעיות תפעוליות, חריגות SLA וביצועי ספקים
            </CardDescription>
          </div>
          {alerts.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <Check className="w-4 h-4 ml-2" />
              סמן הכל כנקרא
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <Check className="w-12 h-12 mx-auto text-green-500 mb-3 opacity-20" />
              <h3 className="text-lg font-medium text-gray-900">אין התראות חריגות</h3>
              <p className="text-gray-500">המערכת לא זיהתה בעיות הדורשות התערבות כרגע</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                const Icon = getAlertIcon(alert.title);
                return (
                  <div 
                    key={alert.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-l-4 border-l-orange-500 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <div className="p-2 bg-orange-50 rounded-full shrink-0">
                      <Icon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDistanceToNow(new Date(alert.created_date), { addSuffix: true, locale: he })}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{alert.message}</p>
                      
                      <div className="flex items-center gap-3 mt-3">
                        {alert.link && (
                          <Link to={alert.link}>
                            <Button variant="link" size="sm" className="h-auto p-0 text-blue-600">
                              טפל בבעיה <ExternalLink className="w-3 h-3 mr-1" />
                            </Button>
                          </Link>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-0 text-gray-500 hover:text-gray-700"
                          onClick={() => markAsReadMutation.mutate(alert.id)}
                        >
                          סמן כנקרא
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}