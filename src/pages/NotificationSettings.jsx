import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, Plus, Trash2, Save, AlertTriangle, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const eventTemplates = [
  {
    id: 'unassigned_call',
    name: 'קריאה לא שובצה',
    event: 'call_unassigned',
    description: 'התראה כאשר קריאה לא שובצה תוך זמן מוגדר',
    defaultConditions: {
      timeThreshold: 10,
      priority: 'all'
    }
  },
  {
    id: 'sla_breach',
    name: 'חריגת SLA',
    event: 'sla_near_breach',
    description: 'התראה לפני חריגת SLA',
    defaultConditions: {
      minutesBefore: 5,
      priority: 'all'
    }
  },
  {
    id: 'low_rating',
    name: 'דירוג נמוך',
    event: 'low_rating',
    description: 'התראה על דירוג נמוך מלקוח',
    defaultConditions: {
      ratingThreshold: 3
    }
  },
  {
    id: 'call_cancelled',
    name: 'קריאה בוטלה',
    event: 'call_cancelled',
    description: 'התראה כאשר קריאה מבוטלת',
    defaultConditions: {}
  },
  {
    id: 'vendor_delayed',
    name: 'ספק מתעכב',
    event: 'vendor_delayed',
    description: 'התראה כאשר ספק מאחר מעבר לזמן משוער',
    defaultConditions: {
      delayMinutes: 15
    }
  }
];

const defaultNotification = {
  id: Date.now(),
  name: '',
  enabled: true,
  event: 'call_unassigned',
  channels: {
    sms: false,
    email: true,
    inApp: true
  },
  recipients: ['manager'],
  conditions: {
    priority: 'all',
    timeThreshold: 10,
    area: 'all',
    radius: null,
    lat: null,
    lon: null
  },
  message: {
    title: 'התראה',
    body: 'אירוע חדש במערכת'
  }
};

export default function NotificationSettings() {
  const [notifications, setNotifications] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      setNotifications(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    toast.success('הגדרות ההתראות נשמרו');
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
            body: template.description
          }
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

    const exists = notifications.find(n => n.id === editingNotification.id);
    if (exists) {
      setNotifications(notifications.map(n => 
        n.id === editingNotification.id ? editingNotification : n
      ));
    } else {
      setNotifications([...notifications, editingNotification]);
    }
    
    setIsDialogOpen(false);
    setEditingNotification(null);
    toast.success('ההתראה נשמרה');
  };

  const handleDeleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast.success('ההתראה נמחקה');
  };

  const toggleNotification = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, enabled: !n.enabled } : n
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#0078D4]">הגדרות התראות</h1>
          <p className="text-[#616161] text-sm">ניהול התראות חכמות על אירועים במערכת</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#0078D4] hover:bg-[#1976D2] gap-2"
              onClick={() => handleAddNotification()}
            >
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
                      onChange={(e) => setEditingNotification({
                        ...editingNotification,
                        name: e.target.value
                      })}
                      placeholder="קריאה לא שובצה"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>סוג אירוע</Label>
                    <Select
                      value={editingNotification.event}
                      onValueChange={(value) => setEditingNotification({
                        ...editingNotification,
                        event: value
                      })}
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
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm">ערוצי התראה</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#0078D4]" />
                        <Label>SMS</Label>
                      </div>
                      <Switch
                        checked={editingNotification.channels.sms}
                        onCheckedChange={(checked) => setEditingNotification({
                          ...editingNotification,
                          channels: { ...editingNotification.channels, sms: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#0078D4]" />
                        <Label>אימייל</Label>
                      </div>
                      <Switch
                        checked={editingNotification.channels.email}
                        onCheckedChange={(checked) => setEditingNotification({
                          ...editingNotification,
                          channels: { ...editingNotification.channels, email: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#0078D4]" />
                        <Label>התראה באפליקציה</Label>
                      </div>
                      <Switch
                        checked={editingNotification.channels.inApp}
                        onCheckedChange={(checked) => setEditingNotification({
                          ...editingNotification,
                          channels: { ...editingNotification.channels, inApp: checked }
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Conditions */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm">תנאים</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>עדיפות קריאה</Label>
                      <Select
                        value={editingNotification.conditions.priority}
                        onValueChange={(value) => setEditingNotification({
                          ...editingNotification,
                          conditions: { ...editingNotification.conditions, priority: value }
                        })}
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
                          onChange={(e) => setEditingNotification({
                            ...editingNotification,
                            conditions: { 
                              ...editingNotification.conditions, 
                              timeThreshold: parseInt(e.target.value) 
                            }
                          })}
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
                          onChange={(e) => setEditingNotification({
                            ...editingNotification,
                            conditions: { 
                              ...editingNotification.conditions, 
                              minutesBefore: parseInt(e.target.value) 
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                    )}

                    <div>
                      <Label>אזור</Label>
                      <Select
                        value={editingNotification.conditions.area}
                        onValueChange={(value) => setEditingNotification({
                          ...editingNotification,
                          conditions: { ...editingNotification.conditions, area: value }
                        })}
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
                      <Label className="text-sm text-[#616161]">
                        מיקום ספציפי (אופציונלי)
                      </Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Input
                          type="number"
                          placeholder="Lat"
                          value={editingNotification.conditions.lat || ''}
                          onChange={(e) => setEditingNotification({
                            ...editingNotification,
                            conditions: { 
                              ...editingNotification.conditions, 
                              lat: e.target.value ? parseFloat(e.target.value) : null
                            }
                          })}
                        />
                        <Input
                          type="number"
                          placeholder="Lon"
                          value={editingNotification.conditions.lon || ''}
                          onChange={(e) => setEditingNotification({
                            ...editingNotification,
                            conditions: { 
                              ...editingNotification.conditions, 
                              lon: e.target.value ? parseFloat(e.target.value) : null
                            }
                          })}
                        />
                        <Input
                          type="number"
                          placeholder="רדיוס (קמ)"
                          value={editingNotification.conditions.radius || ''}
                          onChange={(e) => setEditingNotification({
                            ...editingNotification,
                            conditions: { 
                              ...editingNotification.conditions, 
                              radius: e.target.value ? parseInt(e.target.value) : null
                            }
                          })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Message */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm">תוכן ההתראה</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>כותרת</Label>
                      <Input
                        value={editingNotification.message.title}
                        onChange={(e) => setEditingNotification({
                          ...editingNotification,
                          message: { ...editingNotification.message, title: e.target.value }
                        })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>תוכן</Label>
                      <Textarea
                        value={editingNotification.message.body}
                        onChange={(e) => setEditingNotification({
                          ...editingNotification,
                          message: { ...editingNotification.message, body: e.target.value }
                        })}
                        rows={3}
                        className="mt-1"
                      />
                      <p className="text-xs text-[#616161] mt-1">
                        משתנים זמינים: {'{call_number}'}, {'{customer_name}'}, {'{time}'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    ביטול
                  </Button>
                  <Button onClick={handleSaveNotification} className="bg-[#0078D4]">
                    שמור
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#0078D4]" />
            תבניות מהירות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {eventTemplates.map(template => (
              <div
                key={template.id}
                className="p-4 border border-[#E0E0E0] rounded-lg hover:border-[#0078D4] hover:bg-[#FAFAFA] cursor-pointer transition-colors"
                onClick={() => handleAddNotification(template)}
              >
                <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                <p className="text-xs text-[#616161]">{template.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#2E7D32]" />
            התראות פעילות ({notifications.filter(n => n.enabled).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-[#616161]">
              <Bell className="w-12 h-12 mx-auto mb-3 text-[#9E9E9E]" />
              <p>עדיין לא הוגדרו התראות</p>
              <p className="text-sm">התחל על ידי בחירת תבנית או יצירת התראה חדשה</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between p-4 border border-[#E0E0E0] rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Switch
                      checked={notification.enabled}
                      onCheckedChange={() => toggleNotification(notification.id)}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{notification.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {notification.channels.sms && (
                          <span className="text-xs bg-[#E3F2FD] text-[#0078D4] px-2 py-0.5 rounded">SMS</span>
                        )}
                        {notification.channels.email && (
                          <span className="text-xs bg-[#E3F2FD] text-[#0078D4] px-2 py-0.5 rounded">Email</span>
                        )}
                        {notification.channels.inApp && (
                          <span className="text-xs bg-[#E3F2FD] text-[#0078D4] px-2 py-0.5 rounded">App</span>
                        )}
                        {notification.conditions.priority !== 'all' && (
                          <span className="text-xs bg-[#FFF4E5] text-[#ED6C02] px-2 py-0.5 rounded">
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
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteNotification(notification.id)}
                    >
                      <Trash2 className="w-4 h-4 text-[#D32F2F]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-[#0078D4] hover:bg-[#1976D2] gap-2"
        >
          <Save className="w-4 h-4" />
          שמור הגדרות
        </Button>
      </div>

      {/* Info */}
      <Card className="bg-[#E3F2FD] border-[#0078D4]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#0078D4] flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-medium text-[#0078D4]">איך זה עובד?</p>
              <ul className="list-disc list-inside space-y-1 text-[#616161]">
                <li>המערכת בודקת תנאים כל דקה</li>
                <li>התראות נשלחות רק פעם אחת לכל אירוע</li>
                <li>ניתן לשלב מספר תנאים לבקרה מדויקת</li>
                <li>תבניות מוכנות מאפשרות הגדרה מהירה</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}