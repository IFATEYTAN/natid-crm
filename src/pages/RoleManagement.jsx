import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { listRoles, updateRole } from '@/lib/srvApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import QueryErrorState from '@/components/ui/QueryErrorState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Shield, Pencil, Save, Phone, Truck, Users, BarChart3, Settings, Map } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Role definitions — srv GET/PATCH /roles (Phase 4 of the dispatcher
 * rebuild plan), backed by the app_roles table (schema.natid.co.il's
 * 20260821014435_create_app_roles). Genuinely editable role definitions,
 * unlike the earlier config-preset compromise this replaced once
 * schema.natid.co.il became available — see srv.natid.co.il CLAUDE.md's
 * Phase 4 user/role admin section for the full design rationale.
 *
 * Only the 4 built-in roles (admin/operator/agent/vendor) exist and only
 * their display name / permissions are editable — no create, no delete,
 * no rename. `users.role` is a 4-value ENUM at the DB level, so a role
 * name outside that set could never be assigned to anyone; see the
 * backend docs for why that's a separate, more invasive migration rather
 * than something this screen works around.
 */

const PERMISSION_CATEGORIES = {
  calls: { label: 'קריאות', icon: Phone },
  vendors: { label: 'ספקים', icon: Truck },
  customers: { label: 'לקוחות', icon: Users },
  reports: { label: 'דוחות', icon: BarChart3 },
  system: { label: 'מערכת', icon: Settings },
  monitoring: { label: 'ניטור', icon: Map },
};

const PERMISSION_LABELS = {
  view: 'צפייה',
  create: 'יצירה',
  edit: 'עריכה',
  delete: 'מחיקה',
  assign: 'שיבוץ',
  update_status: 'עדכון סטטוס קריאה',
  manage_contracts: 'ניהול חוזים',
  export: 'ייצוא',
  financial: 'דוחות כספיים',
  performance: 'דוחות ביצועים',
  historical: 'ניתוח היסטורי',
  users: 'ניהול משתמשים',
  roles: 'ניהול תפקידים',
  settings: 'הגדרות',
  automations: 'אוטומציות',
  integrations: 'אינטגרציות',
  audit_log: 'יומן פעולות',
  live_map: 'מפה חיה',
  tracking: 'מעקב GPS',
  queue: 'ניטור תורים',
};

// The full editable shape every non-wildcard role is rendered against,
// regardless of which keys its own `permissions` JSON currently has —
// vendor seeds as `{}`, so without this every switch would be missing.
const PERMISSION_SHAPE = {
  calls: ['view', 'create', 'edit', 'delete', 'assign', 'update_status'],
  vendors: ['view', 'create', 'edit', 'delete', 'manage_contracts'],
  customers: ['view', 'create', 'edit', 'delete'],
  reports: ['view', 'export', 'financial', 'performance', 'historical'],
  system: ['users', 'roles', 'settings', 'automations', 'integrations', 'audit_log'],
  monitoring: ['live_map', 'tracking', 'queue'],
};

const isWildcard = (permissions) => permissions?.['*']?.['*'] === true;

export default function RoleManagement() {
  const [editingRole, setEditingRole] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [permissions, setPermissions] = useState({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: roles = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.roles.all(),
    queryFn: () => listRoles().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: ({ name, body }) => updateRole(name, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all() });
      setIsDialogOpen(false);
      setEditingRole(null);
      toast.success('התפקיד עודכן בהצלחה');
    },
    onError: (err) => toast.error(err?.message || 'שמירת התפקיד נכשלה'),
  });

  const openEdit = (role) => {
    setEditingRole(role);
    setDisplayName(role.display_name_he);
    setPermissions(role.permissions || {});
    setIsDialogOpen(true);
  };

  const togglePermission = (category, permission) => {
    setPermissions((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [permission]: !prev[category]?.[permission],
      },
    }));
  };

  const handleSave = () => {
    if (!editingRole) return;
    const body = { display_name_he: displayName };
    if (!isWildcard(editingRole.permissions)) {
      body.permissions = permissions;
    }
    saveMutation.mutate({ name: editingRole.name, body });
  };

  if (isLoading) return <PageLoader text="טוען תפקידים..." />;
  if (isError) return <QueryErrorState error={error} entityName="Role" />;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">ניהול הרשאות</h1>
        <p className="text-gray-500 text-sm mt-1">
          הגדרת הרשאות לכל אחד מ-4 התפקידים הקבועים במערכת. שיוך משתמש לתפקיד מתבצע במסך ניהול
          משתמשים.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role) => {
          const wildcard = isWildcard(role.permissions);
          return (
            <Card key={role.name} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-500" />
                      {role.display_name_he}
                    </CardTitle>
                    <p className="text-xs text-gray-400 mt-1" dir="ltr">
                      {role.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(role)}
                    aria-label="עריכה"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {role.is_system && (
                    <Badge variant="outline" className="text-xs">
                      תפקיד מערכת
                    </Badge>
                  )}
                  {wildcard ? (
                    <Badge className="text-xs bg-blue-100 text-blue-700">
                      גישה מלאה לכל המערכת
                    </Badge>
                  ) : (
                    Object.entries(role.permissions || {}).map(([cat, perms]) => {
                      const enabledCount = Object.values(perms).filter(Boolean).length;
                      if (enabledCount === 0) return null;
                      return (
                        <Badge key={cat} variant="secondary" className="text-xs">
                          {PERMISSION_CATEGORIES[cat]?.label || cat}: {enabledCount}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>עריכת תפקיד: {editingRole?.display_name_he}</DialogTitle>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="role-display-name">שם תצוגה</Label>
                <Input
                  id="role-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              {isWildcard(editingRole.permissions) ? (
                <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                  לתפקיד זה גישה מלאה לכל חלקי המערכת ללא יוצא מן הכלל — אין הרשאות פרטניות לעריכה.
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">הרשאות</h3>
                  {Object.entries(PERMISSION_CATEGORIES).map(([catKey, catConfig]) => {
                    const Icon = catConfig.icon;
                    return (
                      <Card key={catKey}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {catConfig.label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {PERMISSION_SHAPE[catKey].map((permKey) => (
                              <div
                                key={permKey}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <span className="text-sm">
                                  {PERMISSION_LABELS[permKey] || permKey}
                                </span>
                                <Switch
                                  checked={permissions[catKey]?.[permKey] || false}
                                  onCheckedChange={() => togglePermission(catKey, permKey)}
                                />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={!displayName || saveMutation.isPending}>
              <Save className="w-4 h-4 ms-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
