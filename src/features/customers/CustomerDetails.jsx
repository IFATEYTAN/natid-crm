import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { base44 } from '@/lib/api';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, MapPin, MessageSquare, Plus, ArrowRight, Calendar, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { triggerNotification } from '@/components/NotificationsUtils';
import { usePermissions } from '@/components/permissions/PermissionsContext';

export default function CustomerDetails() {
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('id');
  const queryClient = useQueryClient();
  const { currentUser } = usePermissions();

  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    type: 'note',
    direction: 'outbound',
    summary: '',
    details: '',
    interaction_date: new Date().toISOString().slice(0, 16),
  });

  // Fetch Customer
  const { data: customer, isLoading: isCustomerLoading } = useQuery({
    queryKey: queryKeys.customers.single(customerId),
    queryFn: async () => {
      if (!customerId) return null;
      const res = await base44.entities.Customer.list();
      // Note: .get(id) is better if available, but list().find() works for now or if .get is not exposed
      // Assuming list() returns all or I can filter.
      // Actually standard way is list({id: customerId})? Or just fetch all and find.
      // Let's try filter if possible or just fetch all for now since we don't know the exact get syntax.
      // The context says: use query filter to get specific entities, e.g. {"id": "123"}
      const customers = await base44.entities.Customer.filter({ id: customerId });
      return customers[0];
    },
    enabled: !!customerId,
  });

  // Fetch Calls
  const { data: calls = [], isLoading: isCallsLoading } = useQuery({
    queryKey: queryKeys.customers.calls(customerId),
    queryFn: () => base44.entities.Call.filter({ customer_id: customerId }, '-created_date'),
    enabled: !!customerId,
  });

  // Fetch Interactions
  const { data: interactions = [], isLoading: isInteractionsLoading } = useQuery({
    queryKey: queryKeys.customers.interactions(customerId),
    queryFn: () =>
      base44.entities.CustomerInteraction.filter({ customer_id: customerId }, '-interaction_date'),
    enabled: !!customerId,
  });

  // Create Interaction Mutation
  const createInteractionMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.CustomerInteraction.create({
        ...data,
        customer_id: customerId,
        performed_by: currentUser?.full_name || 'System',
      });
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.interactions(customerId) });
      setIsInteractionDialogOpen(false);
      setInteractionForm({
        type: 'note',
        direction: 'outbound',
        summary: '',
        details: '',
        interaction_date: new Date().toISOString().slice(0, 16),
      });
      toast.success('האינטראקציה נשמרה בהצלחה');

      // Trigger Notification
      await triggerNotification(
        'new_interaction',
        {
          customer_name: customer.name,
          type: interactionForm.type,
          summary: interactionForm.summary,
          link: `/CustomerDetails?id=${customerId}`,
          id: customerId,
          entityType: 'customer',
        },
        currentUser
      );
    },
    onError: (error) => toast.error('שגיאה בשמירת האינטראקציה: ' + error.message),
  });

  const handleInteractionSubmit = (e) => {
    e.preventDefault();
    createInteractionMutation.mutate(interactionForm);
  };

  const initiateCommunication = (type, value) => {
    if (type === 'phone') {
      window.location.href = `tel:${value}`;
      setInteractionForm((prev) => ({
        ...prev,
        type: 'call',
        direction: 'outbound',
        summary: 'שיחה יוצאת',
      }));
      setIsInteractionDialogOpen(true);
    } else if (type === 'email') {
      window.location.href = `mailto:${value}`;
      setInteractionForm((prev) => ({
        ...prev,
        type: 'email',
        direction: 'outbound',
        summary: 'מייל יוצא',
      }));
      setIsInteractionDialogOpen(true);
    }
  };

  if (isCustomerLoading) return <div className="p-8">טוען נתוני לקוח...</div>;
  if (!customer) return <div className="p-8">לקוח לא נמצא</div>;

  const interactionTypeIcons = {
    note: <MessageSquare className="w-4 h-4" />,
    call: <Phone className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    sms: <MessageSquare className="w-4 h-4" />, // using same icon for now
    meeting: <User className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Customers')}>
          <Button variant="ghost" size="icon" aria-label="חזרה">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {customer.name}
            <span
              className={`text-sm font-normal px-2 py-1 rounded-full ${customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
            >
              {customer.status === 'active' ? 'פעיל' : 'לא פעיל'}
            </span>
          </h1>
          <p className="text-gray-500">
            {customer.customer_type} • הצטרף ב-
            {format(parseISO(customer.created_date), 'dd/MM/yyyy')}
          </p>
        </div>
        <div className="mr-auto flex gap-2">
          <Button
            onClick={() => initiateCommunication('phone', customer.phone)}
            variant="outline"
            className="gap-2"
          >
            <Phone className="w-4 h-4" />
            התקשר
          </Button>
          <Button
            onClick={() => initiateCommunication('email', customer.email)}
            variant="outline"
            className="gap-2"
          >
            <Mail className="w-4 h-4" />
            שלח מייל
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>פרטי קשר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">איש קשר</div>
                  <div className="font-medium">{customer.contact_person || '-'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">טלפון</div>
                  <div className="font-medium" dir="ltr">
                    {customer.phone}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">אימייל</div>
                  <div className="font-medium">{customer.email || '-'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">כתובת</div>
                  <div className="font-medium">
                    {customer.address}, {customer.city}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>פרטי חוזה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">סוג חוזה</span>
                <span className="font-medium">{customer.contract_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">תקציב חודשי</span>
                <span className="font-medium">
                  {customer.monthly_budget ? `₪${customer.monthly_budget.toLocaleString()}` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SLA תגובה</span>
                <span className="font-medium">{customer.sla_response_minutes} דק'</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SLA הגעה</span>
                <span className="font-medium">{customer.sla_arrival_minutes} דק'</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="interactions">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="interactions">תיעוד אינטראקציות</TabsTrigger>
              <TabsTrigger value="calls">היסטוריית קריאות</TabsTrigger>
            </TabsList>

            <TabsContent value="interactions" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">תיעוד תקשורת והערות</h3>
                <Dialog open={isInteractionDialogOpen} onOpenChange={setIsInteractionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      הוסף תיעוד
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>תיעוד אינטראקציה חדשה</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleInteractionSubmit} className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>סוג</Label>
                          <Select
                            value={interactionForm.type}
                            onValueChange={(val) =>
                              setInteractionForm({ ...interactionForm, type: val })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="note">הערה</SelectItem>
                              <SelectItem value="call">שיחה</SelectItem>
                              <SelectItem value="email">מייל</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                              <SelectItem value="meeting">פגישה</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>כיוון</Label>
                          <Select
                            value={interactionForm.direction}
                            onValueChange={(val) =>
                              setInteractionForm({ ...interactionForm, direction: val })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inbound">נכנס</SelectItem>
                              <SelectItem value="outbound">יוצא</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>תאריך ושעה</Label>
                        <Input
                          type="datetime-local"
                          value={interactionForm.interaction_date}
                          onChange={(e) =>
                            setInteractionForm({
                              ...interactionForm,
                              interaction_date: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>נושא / תקציר</Label>
                        <Input
                          value={interactionForm.summary}
                          onChange={(e) =>
                            setInteractionForm({ ...interactionForm, summary: e.target.value })
                          }
                          placeholder="נושא השיחה או האינטראקציה"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>פירוט</Label>
                        <Textarea
                          value={interactionForm.details}
                          onChange={(e) =>
                            setInteractionForm({ ...interactionForm, details: e.target.value })
                          }
                          placeholder="פרטים נוספים..."
                          rows={4}
                          required
                        />
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={createInteractionMutation.isPending}>
                          {createInteractionMutation.isPending ? 'שומר...' : 'שמור'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {interactions.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50 rounded-lg text-gray-500">
                    לא נמצאו אינטראקציות מתועדות
                  </div>
                ) : (
                  interactions.map((interaction) => (
                    <Card key={interaction.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-full ${interaction.direction === 'inbound' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}
                            >
                              {interactionTypeIcons[interaction.type] || (
                                <MessageSquare className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {interaction.summary}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(interaction.interaction_date), 'dd/MM/yyyy HH:mm')}
                                <span>•</span>
                                <User className="w-3 h-3" />
                                {interaction.performed_by}
                              </div>
                              <p className="mt-3 text-gray-700 whitespace-pre-wrap">
                                {interaction.details}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600 capitalize">
                            {interaction.type}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="calls" className="mt-4">
              <DataTable
                columns={[
                  {
                    header: 'מספר קריאה',
                    accessor: 'call_number',
                    cell: (row) => row.call_number || row.id.substring(0, 8),
                  },
                  {
                    header: 'תאריך',
                    accessor: 'created_date',
                    cell: (row) => format(parseISO(row.created_date), 'dd/MM/yyyy HH:mm'),
                  },
                  {
                    header: 'רכב',
                    accessor: 'vehicle_plate',
                    cell: (row) => row.vehicle_plate || '-',
                  },
                  {
                    header: 'נהג',
                    accessor: 'driver_name',
                    cell: (row) => row.driver_name || row.caller_name || '-',
                  },
                  {
                    header: 'סטטוס',
                    accessor: 'call_status',
                    cell: (row) => <StatusBadge status={row.call_status} size="sm" />,
                  },
                ]}
                data={calls}
                isLoading={isCallsLoading}
                emptyMessage="לא נמצאו קריאות עבור לקוח זה"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
