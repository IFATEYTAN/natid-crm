import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  ShieldCheck,
  Key,
  Pencil,
  Headphones,
  Wrench,
  Building2,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import ExportMenu from '@/components/ui/ExportMenu';
import { SlideUp } from '@/components/animations/AnimatedComponents';
import { showToast } from '@/components/ui/FeedbackToast';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';
import { useAuditLog } from '@/hooks/useAuditLog';
import { roleLabels } from '@/config/labels';

const roleBadgeColors = {
  admin: 'bg-[#3b82f6] text-white',
  manager: 'bg-[#6366f1] text-white',
  operator: 'bg-[#8b5cf6] text-white',
  agent: 'bg-[#10b981] text-white',
  vendor: 'bg-[#f59e0b] text-white',
  user: 'bg-[#f3f4f6] text-[#111827]',
};

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('operator');
  const [editUser, setEditUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { logCreate, logUpdate } = useAuditLog();

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: () => base44.entities.User.list('-created_date', 100),
  });

  const { data: userPermissions = [] } = useQuery({
    queryKey: queryKeys.users.permissions(),
    queryFn: () => base44.entities.UserPermission.list(),
  });

  // Map user permissions by email for quick lookup
  const permByEmail = {};
  userPermissions.forEach((p) => {
    permByEmail[p.user_email] = p;
  });

  // Get effective role for a user (from UserPermission, not platform role)
  const getEffectiveRole = (user) => {
    const perm = permByEmail[user.email];
    if (perm?.role_name) {
      // Try to match role_name to a known role key
      const roleEntry = Object.entries(roleLabels).find(
        ([key, label]) => label === perm.role_name || key === perm.role_name
      );
      if (roleEntry) return roleEntry[0];
    }
    return user.role === 'admin' ? 'admin' : 'agent';
  };

  const isLoading = isLoadingUsers;

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      // Platform only supports "admin" or "user" - map app roles accordingly
      const platformRole = role === 'admin' ? 'admin' : 'user';
      await base44.users.inviteUser(email, platformRole);

      // Find the matching Role entity for this app role
      const allRoles = await base44.entities.Role.list();
      const matchedRole = allRoles.find((r) => r.name === role);

      // Create UserPermission record with the app-specific role
      await base44.entities.UserPermission.create({
        user_id: '', // will be updated when user logs in
        user_email: email,
        role_id: matchedRole?.id || '',
        role_name: matchedRole?.display_name || role,
      });
    },
    onSuccess: (_, variables) => {
      logCreate(
        'User',
        null,
        variables.email,
        `הוזמן משתמש חדש: ${variables.email} בתפקיד ${roleLabels[variables.role] || variables.role}`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('operator');
      showToast.success('ההזמנה נשלחה בהצלחה');
    },
    onError: (error) => {
      console.error('Invite error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'שגיאה לא ידועה';
      showToast.error('שגיאה בשליחת ההזמנה: ' + errorMsg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: (_, variables) => {
      logUpdate(
        'User',
        variables.id,
        'עדכון פרטי משתמש',
        `עודכן משתמש: ${variables.data.full_name}, תפקיד: ${variables.data.role}`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      setEditDialogOpen(false);
      setEditUser(null);
      showToast.success('המשתמש עודכן בהצלחה');
    },
    onError: (error) => {
      console.error('Update error:', error);
      showToast.error('שגיאה בעדכון המשתמש');
    },
  });

  const handleUpdateUser = async () => {
    if (!editUser) return;

    // Platform role: admin stays admin, everything else is "user"
    const platformRole = editUser.role === 'admin' ? 'admin' : 'user';

    updateMutation.mutate({
      id: editUser.id,
      data: {
        full_name: editUser.full_name,
        role: platformRole,
      },
    });

    // Also update UserPermission with the app-specific role
    const allRoles = await base44.entities.Role.list();
    const matchedRole = allRoles.find((r) => r.name === editUser.role);

    const existingPerms = await base44.entities.UserPermission.filter({
      user_email: editUser.email,
    });
    if (existingPerms.length > 0) {
      await base44.entities.UserPermission.update(existingPerms[0].id, {
        role_id: matchedRole?.id || '',
        role_name: matchedRole?.display_name || editUser.role,
        user_id: editUser.id,
      });
    } else {
      await base44.entities.UserPermission.create({
        user_id: editUser.id,
        user_email: editUser.email,
        role_id: matchedRole?.id || '',
        role_name: matchedRole?.display_name || editUser.role,
      });
    }
  };

  const filteredUsers = users.filter((user) => {
    const effRole = getEffectiveRole(user);
    return (
      (filterRole === 'all' || effRole === filterRole) &&
      (!searchQuery ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => getEffectiveRole(u) === 'admin').length,
    managers: users.filter((u) => getEffectiveRole(u) === 'manager').length,
    operators: users.filter((u) => getEffectiveRole(u) === 'operator').length,
    agents: users.filter((u) => getEffectiveRole(u) === 'agent').length,
    vendors: users.filter((u) => getEffectiveRole(u) === 'vendor').length,
  };

  const handleInvite = () => {
    if (!inviteEmail) {
      showToast.error('יש להזין כתובת אימייל');
      return;
    }
    // Trim and lowercase email to prevent format errors
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast.error('כתובת אימייל לא תקינה');
      return;
    }
    inviteMutation.mutate({ email: cleanEmail, role: inviteRole });
  };

  if (isLoading) {
    return <PageLoader text="טוען משתמשים..." />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">{error?.message || 'נסה לרענן את הדף'}</p>
      </div>
    );
  }

  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">ניהול משתמשים</h1>
            <p className="text-[#6b7280] text-sm">ניהול והזמנת משתמשים למערכת</p>
          </div>
          <div className="flex gap-2">
            <ExportMenu
              data={users}
              columns={[
                { header: 'שם מלא', accessor: 'full_name' },
                { header: 'אימייל', accessor: 'email' },
                { header: 'תפקיד', accessor: 'role' },
                { header: 'תאריך הצטרפות', accessor: 'created_date' },
              ]}
              filename="users_list"
              title="רשימת משתמשים"
            />
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#3b82f6] hover:bg-[#2563eb] gap-2">
                  <UserPlus className="w-4 h-4" />
                  הזמן משתמש
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>הזמנת משתמש חדש</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>כתובת אימייל</Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label>תפקיד</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">מנהל מערכת</SelectItem>
                        <SelectItem value="manager">מנהל תפעול</SelectItem>
                        <SelectItem value="operator">מוקדן</SelectItem>
                        <SelectItem value="agent">נציג שטח</SelectItem>
                        <SelectItem value="vendor">ספק שירות</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full bg-[#3b82f6] hover:bg-[#2563eb]"
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? 'שולח...' : 'שלח הזמנה'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>עריכת משתמש</DialogTitle>
            </DialogHeader>
            {editUser && (
              <div className="space-y-4 pt-4">
                <div>
                  <Label>שם מלא</Label>
                  <Input
                    value={editUser.full_name || ''}
                    onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>אימייל</Label>
                  <Input value={editUser.email} disabled className="bg-gray-50" dir="ltr" />
                </div>
                <div>
                  <Label>תפקיד</Label>
                  <Select
                    value={editUser.role}
                    onValueChange={(val) => setEditUser({ ...editUser, role: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">מנהל מערכת</SelectItem>
                      <SelectItem value="manager">מנהל תפעול</SelectItem>
                      <SelectItem value="operator">מוקדן</SelectItem>
                      <SelectItem value="agent">נציג שטח</SelectItem>
                      <SelectItem value="vendor">ספק שירות</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full bg-[#3b82f6] hover:bg-[#2563eb]"
                  onClick={handleUpdateUser}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'שומר...' : 'שמור שינויים'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.total}</div>
                  <div className="text-sm text-[#6b7280]">סה"כ</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#eff6ff] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.admins}</div>
                  <div className="text-sm text-[#6b7280]">מנהלי מערכת</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#eef2ff] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#6366f1]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.managers}</div>
                  <div className="text-sm text-[#6b7280]">מנהלי תפעול</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f5f3ff] flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-[#8b5cf6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.operators}</div>
                  <div className="text-sm text-[#6b7280]">מוקדנים</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#ecfdf5] flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-[#10b981]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.agents}</div>
                  <div className="text-sm text-[#6b7280]">נציגי שטח</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#fffbeb] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#f59e0b]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.vendors}</div>
                  <div className="text-sm text-[#6b7280]">ספקי שירות</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="p-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                <Input
                  placeholder="חיפוש לפי שם או אימייל..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="כל התפקידים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התפקידים</SelectItem>
                  <SelectItem value="admin">מנהל מערכת</SelectItem>
                  <SelectItem value="manager">מנהל תפעול</SelectItem>
                  <SelectItem value="operator">מוקדן</SelectItem>
                  <SelectItem value="agent">נציג שטח</SelectItem>
                  <SelectItem value="vendor">ספק שירות</SelectItem>
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
                        {user.full_name ? user.full_name.charAt(0) : '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#111827]">{user.full_name || 'ללא שם'}</div>
                      <div className="text-sm text-[#6b7280] flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span dir="ltr">{user.email}</span>
                      </div>
                    </div>
                    <Badge className={cn('text-xs', roleBadgeColors[getEffectiveRole(user)])}>
                      {roleLabels[getEffectiveRole(user)] || getEffectiveRole(user)}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs hover:bg-blue-50 text-blue-600"
                        onClick={() => {
                          setEditUser({ ...user, role: getEffectiveRole(user) });
                          setEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                        ערוך
                      </Button>
                      <Link to={createPageUrl('RoleManagement')}>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs">
                          <Key className="w-3 h-3" />
                          הרשאות
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SlideUp>
  );
}
