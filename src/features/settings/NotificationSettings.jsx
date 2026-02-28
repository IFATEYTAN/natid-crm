import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { base44 } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Bell, Plus, Trash2, AlertTriangle, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const eventTemplates = [
  {
    id: 'unassigned_call',
    name: 'קריאה לא שובצה',
    event: 'call_unassigned',
    description: 'התראה כאשר קריאה לא שובצה תוך זמן מוגדר',
    defaultConditions: {
      timeThreshold: 10,
      priority: 'all',
    },
  },
  {
    id: 'sla_breach',
    name: 'חריגת SLA',
    event: 'sla_near_breach',
    description: 'התראה לפני חריגת SLA',
    defaultConditions: {
      minutesBefore: 5,
      priority: 'all',
    },
  },
  {
    id: 'low_rating',
    name: 'דירוג נמוך',
    event: 'low_rating',
    description: 'התראה על דירוג נמוך מלקוח',
    defaultConditions: {
      ratingThreshold: 3,
    },
  },
  {
    id: 'call_cancelled',
    name: 'קריאה בוטלה',
    event: 'call_cancelled',
    description: 'התראה כאשר קריאה מבוטלת',
    defaultConditions: {},
  },
  {
    id: 'vendor_delayed',
    name: 'ספק מתעכב',
    event: 'vendor_delayed',
    description: 'התראה כאשר ספק מאחר מעבר לזמן משוער',
    defaultConditions: {
      delayMinutes: 15,
    },
  },
];

const defaultNotification = {
  id: Date.now(),
  name: '',
  enabled: true,
  event: 'call_unassigned',
  channels: {
    sms: false,
    email: true,
    inApp: true,
  },
  recipients: ['manager'],
  conditions: {
    priority: 'all',
    timeThreshold: 10,
    area: 'all',
    radius: null,
    lat: null,
    lon: null,
  },
  message: {
    title: 'התראה',
    body: 'אירוע חדש במערכת',
  },
};

export default function NotificationSettings() {
  const [notifications, setNotifications] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);

  useEffect(() => {}, []);

  // Fetch settings from DB
  const { data: dbSettings, isLoading } = useQuery({
    queryKey: queryKeys.notifications.settings(),
    queryFn: () => base44.entities.NotificationSetting.list(),
  });

  useEffect(() => {
    if (dbSettings) {
      setNotifications(dbSettings);
    }
  }, [dbSettings]);

  const saveMutation = useMutation({
    mutationFn: (setting) => {
      if (setting.id && typeof setting.id === 'string' && setting.id.length > 10) {
        // Check if it's a real ID
        return base44.entities.NotificationSetting.update(setting.id, setting);
      } else {
        // Remove temp ID
        const { id, ...data } = setting;
        return base44.entities.NotificationSetting.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.settings() });
      toast.success('ההתראה נשמרה');
      setIsDialogOpen(false);
      setEditingNotification(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificationSetting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.settings() });
      toast.success('ההתראה נמחקה');
    },
  });

  const handleSave = () => {
    // Not needed as we save individually now, but could be bulk save
    toast.info('הגדרות נשמרות אוטומטית בעת עריכה');
  };

  const handleAddNotification = (template = null) => {
    const newNotification = template
      ? {
          ...defaultNotification,
          id: Date.now(),
          name: template.name,
          event: template.event,
          conditions: { ...defaultNotification.conditions, ...template.defaultConditions },
          message: {
            title: template.name,
            body: template.description,
          },
        }
      : { ...defaultNotification, id: Date.now() };

    setEditingNotification(newNotification);
    setIsDialogOpen(true);
  };

  const handleEditNotification = (notification) => {
    setEditingNotification(notification);
    setIsDialogOpen(true);
  };

  const handleSaveNotification = () => {
    if (!editingNotification.name) {
      toast.error('נא למלא שם להתראה');
      return;
    }

    // Map to entity structure
    const settingData = {
      ...editingNotification,
      message_template: editingNotification.message, // Map UI 'message' to DB 'message_template'
    };

    saveMutation.mutate(settingData);
  };

  const handleDeleteNotification = (id) => {
    if (confirm('האם למחוק את ההתראה?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleNotification = (id) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>הגדרות התראות</h1>
          <p className="text-[var(--color-text-secondary)]">ניהול התראות חכמות על אירועים במערכת</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary gap-2" onClick={() => handleAddNotification()}>
              <Plus className="w-4 h-4" />
              התראה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>הגדרת התראה</DialogTitle>
            </DialogHeader>

            {editingNotification && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label>שם ההתראה</Label>
                    <Input
                      value={editingNotification.name}
                      onChange={(e) =>
                        setEditingNotification({
                          ...editingNotification,
                          name: e.target.value,
                        })
                      }
                      placeholder="קריאה לא שובצה"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>סוג אירוע</Label>
                    <Select
                      value={editingNotification.event}
                      onValueChange={(value) =>
                        setEditingNotification({
                          ...editingNotification,
                          event: value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call_unassigned">קריאה לא שובצה</SelectItem>
                        <SelectItem value="sla_near_breach">חריגת SLA קרובה</SelectItem>
                        <SelectItem value="low_rating">דירוג נמוך</SelectItem>
                        <SelectItem value="call_cancelled">קריאה בוטלה</SelectItem>
                        <SelectItem value="vendor_delayed">ספק מתעכב</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Channels */}
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4">
                  <p className="text-[13px] font-medium text-[#111827] mb-3">ערוצי התראה</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#6B7280]" />
                        <Label>SMS</Label>
                      </div>
                      <Switch
                        checked={editingNotification.channels.sms}
                        onCheckedChange={(checked) =>
                          setEditingNotification({
                            ...editingNotification,
                            channels: { ...editingNotification.channels, sms: checked },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#6B7280]" />
                        <Label>אימייל</Label>
                      </div>
                      <Switch
                        checked={editingNotification.channels.email}
                        onCheckedChange={(checked) =>
                          setEditingNotification({
                            ...editingNotification,
                            channels: { ...editingNotification.channels, email: checked },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#6B7280]" />
                        <Label>התראה באפליקציה</Label>
                      </div>
                      <Switch
                        checked={editingNotification.channels.inApp}
                        onCheckedChange={(checked) =>
                          setEditingNotification({
                            ...editingNotification,
                            channels: { ...editingNotification.channels, inApp: checked },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Conditions */}
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4">
                  <p className="text-[13px] font-medium text-[#111827] mb-3">תנאים</p>
                  <div className="space-y-4">
                    <div>
                      <Label>עדיפות קריאה</Label>
                      <Select
                        value={editingNotification.conditions.priority}
                        onValueChange={(value) =>
                          setEditingNotification({
                            ...editingNotification,
                            conditions: { ...editingNotification.conditions, priority: value },
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל העדיפויות</SelectItem>
                          <SelectItem value="urgent">דחוף בלבד</SelectItem>
                          <SelectItem value="high">גבוה בלבד</SelectItem>
                          <SelectItem value="normal">רגיל בלבד</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editingNotification.event === 'call_unassigned' && (
                      <div>
                        <Label>זמן ממתין (דקות)</Label>
                        <Input
                          type="number"
                          value={editingNotification.conditions.timeThreshold}
                          onChange={(e) =>
                            setEditingNotification({
                              ...editingNotification,
                              conditions: {
                                ...editingNotification.conditions,
                                timeThreshold: parseInt(e.target.value),
                              },
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                    )}

                    {editingNotification.event === 'sla_near_breach' && (
                      <div>
                        <Label>התראה לפני חריגה (דקות)</Label>
                        <Input
                          type="number"
                          value={editingNotification.conditions.minutesBefore || 5}
                          onChange={(e) =>
                            setEditingNotification({
                              ...editingNotification,
                              conditions: {
                                ...editingNotification.conditions,
                                minutesBefore: parseInt(e.target.value),
                              },
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                    )}

                    <div>
                      <Label>אזור</Label>
                      <Select
                        value={editingNotification.conditions.area}
                        onValueChange={(value) =>
                          setEditingNotification({
                            ...editingNotification,
                            conditions: { ...editingNotification.conditions, area: value },
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל האזורים</SelectItem>
                          <SelectItem value="center">מרכז</SelectItem>
                          <SelectItem value="north">צפון</SelectItem>
                          <SelectItem value="south">דרום</SelectItem>
                          <SelectItem value="jerusalem">ירושלים</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-2 border-t">
                      <Label className="text-sm text-[#616161]">מיקום ספציפי (אופציונלי)</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Input
                          type="number"
                          placeholder="Lat"
                          value={editingNotification.conditions.lat || ''}
                          onChange={(e) =>
                            setEditingNotification({
                              ...editingNotification,
                              conditions: {
                                ...editingNotification.conditions,
                                lat: e.target.value ? parseFloat(e.target.value) : null,
                              },
                            })
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Lon"
                          value={editingNotification.conditions.lon || ''}
                          onChange={(e) =>
                            setEditingNotification({
                              ...editingNotification,
                              conditions: {
                                ...editingNotification.conditions,
                                lon: e.target.value ? parseFloat(e.target.value) : null,
                              },
                            })
                          }
                        />
                        <Input
                          type="number"
                          placeholder="רדיוס (קמ)"
                          value={editingNotification.conditions.radius || ''}
                          onChange={(e) =>
                            setEditingNotification({
                              ...editingNotification,
                              conditions: {
                                ...editingNotification.conditions,
                                radius: e.target.value ? parseInt(e.target.value) : null,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4">
                  <p className="text-[13px] font-medium text-[#111827] mb-3">תוכן ההתראה</p>
                  <div className="space-y-4">
                    <div>
                      <Label>כותרת</Label>
                      <Input
                        value={editingNotification.message.title}
                        onChange={(e) =>
                          setEditingNotification({
                            ...editingNotification,
                            message: { ...editingNotification.message, title: e.target.value },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>תוכן</Label>
                      <Textarea
                        value={editingNotification.message.body}
                        onChange={(e) =>
                          setEditingNotification({
                            ...editingNotification,
                            message: { ...editingNotification.message, body: e.target.value },
                          })
                        }
                        rows={3}
                        className="mt-1"
                      />
                      <p className="text-xs text-[#6B7280] mt-1">
                        משתנים זמינים: {'{call_number}'}, {'{customer_name}'}, {'{time}'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    ביטול
                  </Button>
                  <Button onClick={handleSaveNotification} className="btn-primary">
                    שמור
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Templates */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <h3 className="mb-4">תבניות מהירות</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {eventTemplates.map((template) => (
            <div
              key={template.id}
              className="p-4 border border-[#E5E7EB] rounded-lg hover:border-[#D1D5DB] hover:bg-[#F9FAFB] cursor-pointer transition-colors"
              onClick={() => handleAddNotification(template)}
            >
              <h4 className="font-medium text-sm text-[#111827] mb-1">{template.name}</h4>
              <p className="text-xs text-[#6B7280]">{template.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Notifications */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <h3 className="mb-4">התראות פעילות ({notifications.filter((n) => n.enabled).length})</h3>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-[#6B7280]">
            <Bell className="w-12 h-12 mx-auto mb-3 text-[#9CA3AF]" />
            <p>עדיין לא הוגדרו התראות</p>
            <p className="text-sm">התחל על ידי בחירת תבנית או יצירת התראה חדשה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Switch
                    checked={notification.enabled}
                    onCheckedChange={() => toggleNotification(notification.id)}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-[#111827]">{notification.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {notification.channels.sms && (
                        <span className="text-xs bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded">
                          SMS
                        </span>
                      )}
                      {notification.channels.email && (
                        <span className="text-xs bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded">
                          Email
                        </span>
                      )}
                      {notification.channels.inApp && (
                        <span className="text-xs bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded">
                          App
                        </span>
                      )}
                      {notification.conditions.priority !== 'all' && (
                        <span className="text-xs bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded">
                          {notification.conditions.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditNotification(notification)}
                    aria-label="עריכה"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteNotification(notification.id)}
                    aria-label="מחיקה"
                  >
                    <Trash2 className="w-4 h-4 text-[#DC2626]" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-2">
            <p className="font-medium text-[#111827]">איך זה עובד?</p>
            <ul className="list-disc list-inside space-y-1 text-[#6B7280]">
              <li>המערכת בודקת תנאים כל דקה</li>
              <li>התראות נשלחות רק פעם אחת לכל אירוע</li>
              <li>ניתן לשלב מספר תנאים לבקרה מדויקת</li>
              <li>תבניות מוכנות מאפשרות הגדרה מהירה</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
