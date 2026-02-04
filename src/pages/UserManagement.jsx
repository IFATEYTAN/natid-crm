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
import { Users, UserPlus, Search, Mail, Shield, ShieldCheck, Key } from 'lucide-react';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { SlideUp } from '@/components/animations/AnimatedComponents';
import { showToast } from '@/components/ui/FeedbackToast';
import { cn } from '@/lib/utils';
import { useAuditLog } from '@/components/hooks/useAuditLog';

const roleLabels = {
  admin: 'מנהל',
  user: 'משתמש',
};

const roleBadgeColors = {
  admin: 'bg-[#3b82f6] text-white',
  user: 'bg-[#f3f4f6] text-[#111827]',
};

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const queryClient = useQueryClient();
  const { logCreate } = useAuditLog();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date', 100),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => base44.users.inviteUser(email, role),
    onSuccess: (_, variables) => {
      // Log to audit
      logCreate(
        'User',
        null,
        variables.email,
        `הוזמן משתמש חדש: ${variables.email} בתפקיד ${variables.role}`
      );
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
      showToast.success('ההזמנה נשלחה בהצלחה');
    },
    onError: (error) => {
      showToast.error('שגיאה בשליחת ההזמנה: ' + error.message);
    },
  });

  const filteredUsers = users.filter(
    (user) =>
      !searchQuery ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    users: users.filter((u) => u.role === 'user').length,
  };

  const handleInvite = () => {
    if (!inviteEmail) {
      showToast.error('יש להזין כתובת אימייל');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  if (isLoading) {
    return <PageLoader text="טוען משתמשים..." />;
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
                      <SelectItem value="user">משתמש</SelectItem>
                      <SelectItem value="admin">מנהל</SelectItem>
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.total}</div>
                  <div className="text-sm text-[#6b7280]">סה"כ משתמשים</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.admins}</div>
                  <div className="text-sm text-[#6b7280]">מנהלים</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#6b7280]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.users}</div>
                  <div className="text-sm text-[#6b7280]">משתמשים</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <Input
                placeholder="חיפוש לפי שם או אימייל..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
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
                    <Badge className={cn('text-xs', roleBadgeColors[user.role])}>
                      {roleLabels[user.role] || user.role}
                    </Badge>
                    <Link to={createPageUrl('RoleManagement')}>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        <Key className="w-3 h-3" />
                        הרשאות
                      </Button>
                    </Link>
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
