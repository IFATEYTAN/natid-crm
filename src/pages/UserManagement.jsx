import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Search, Pencil, ShieldCheck, Headphones, Wrench, Building2 } from 'lucide-react';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import QueryErrorState from '@/components/ui/QueryErrorState';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';
import { listRoles, searchUsers, setUserRole } from '@/lib/srvApi';
import { toast } from 'sonner';

/**
 * NatID CRM staff / role assignment — srv GET /users + PATCH /users/{id}/role
 * (Phase 4 of the dispatcher rebuild plan), backed directly by users.role.
 * Unlike the Base44 screen this replaces, there is no "invite" flow: every
 * account here already exists (Nati onboarding / the legacy CRM), so this
 * only ever searches for an existing employee and grants or revokes their
 * CRM role. Role *definitions* (what each role grants) are edited on the
 * Role Management screen, not here. See srv.natid.co.il CLAUDE.md's Phase 4
 * user/role admin section.
 */

const roleBadgeColors = {
  admin: 'bg-[#3b82f6] text-white',
  operator: 'bg-[#8b5cf6] text-white',
  agent: 'bg-[#10b981] text-white',
  vendor: 'bg-[#f59e0b] text-white',
};

const roleIcons = {
  admin: ShieldCheck,
  operator: Headphones,
  agent: Wrench,
  vendor: Building2,
};

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function UserManagementPage() {
  const [searchInput, setSearchInput] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const searchQuery = useDebouncedValue(searchInput, 400);
  const params = { q: searchQuery || undefined, limit: 200 };

  const {
    data: users = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.users.crmStaff(params),
    queryFn: () => searchUsers(params).then((r) => r.data),
  });

  const { data: roles = [] } = useQuery({
    queryKey: queryKeys.roles.all(),
    queryFn: () => listRoles().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const roleLabel = (role) => roles.find((r) => r.name === role)?.display_name_he || role;

  const updateMutation = useMutation({
    mutationFn: ({ id, role }) => setUserRole(id, role || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['srvUsers'] });
      setEditDialogOpen(false);
      setEditUser(null);
      toast.success('התפקיד עודכן בהצלחה');
    },
    onError: (err) => toast.error(err?.message || 'שגיאה בעדכון התפקיד'),
  });

  const filteredUsers = users.filter((user) => filterRole === 'all' || user.role === filterRole);

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === 'admin').length,
    operator: users.filter((u) => u.role === 'operator').length,
    agent: users.filter((u) => u.role === 'agent').length,
    vendor: users.filter((u) => u.role === 'vendor').length,
  };

  const openEdit = (user) => {
    setEditUser(user);
    setEditRole(user.role || 'none');
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editUser) return;
    updateMutation.mutate({ id: editUser.id, role: editRole === 'none' ? null : editRole });
  };

  if (isLoading) return <PageLoader text="טוען משתמשים..." />;
  if (isError) return <QueryErrorState error={error} entityName="User" />;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">ניהול משתמשים</h1>
        <p className="text-[#6b7280] text-sm">
          שיוך הרשאות מערכת לעובדים קיימים. חיפוש מאפשר למצוא כל עובד; ללא חיפוש מוצגים בעלי גישה
          כיום בלבד.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.total}</div>
                <div className="text-sm text-[#6b7280]">סה&quot;כ</div>
              </div>
            </div>
          </CardContent>
        </Card>
        {['admin', 'operator', 'agent', 'vendor'].map((r) => {
          const Icon = roleIcons[r];
          return (
            <Card key={r} className="bg-white border border-[#e5e7eb]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#3b82f6]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#111827]">{stats[r]}</div>
                    <div className="text-sm text-[#6b7280]">{roleLabel(r)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search & Filter */}
      <Card className="bg-white border border-[#e5e7eb]">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <Input
                placeholder="חיפוש לפי שם או שם משתמש..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="כל התפקידים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התפקידים</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.name} value={r.name}>
                    {r.display_name_he}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="bg-white border border-[#e5e7eb]">
        <CardHeader>
          <CardTitle className="text-lg">רשימת משתמשים</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-[#6b7280] mb-3" />
              <p className="text-[#6b7280]">לא נמצאו משתמשים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-[8px] border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                    <span className="text-sm font-medium text-[#6b7280]">
                      {user.fname ? user.fname.charAt(0) : '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#111827]">
                      {[user.fname, user.lname].filter(Boolean).join(' ') || 'ללא שם'}
                    </div>
                    <div className="text-sm text-[#6b7280]" dir="ltr">
                      {user.username}
                    </div>
                  </div>
                  {user.role ? (
                    <Badge className={cn('text-xs', roleBadgeColors[user.role])}>
                      {roleLabel(user.role)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-400">
                      ללא גישה
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs hover:bg-blue-50 text-blue-600"
                    onClick={() => openEdit(user)}
                  >
                    <Pencil className="w-3 h-3" />
                    ערוך
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת תפקיד</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 pt-4">
              <div>
                <Label>שם</Label>
                <Input
                  value={[editUser.fname, editUser.lname].filter(Boolean).join(' ')}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label>שם משתמש</Label>
                <Input value={editUser.username} disabled className="bg-gray-50" dir="ltr" />
              </div>
              <div>
                <Label>תפקיד</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא גישה</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.name} value={r.name}>
                        {r.display_name_he}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb]"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
