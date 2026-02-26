import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  UserPlus,
  Search,
  Mail,
  Shield,
  User,
  Edit,
  AlertCircle,
  Upload,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import AvatarStack from '@/components/ui/AvatarStack';
import { usePermissions } from '@/components/permissions/PermissionsContext';

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [editRole, setEditRole] = useState('user');
  const [editName, setEditName] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadUser, setUploadUser] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { currentUser } = usePermissions();

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => base44.users.inviteUser(email, role),
    onSuccess: () => {
      toast.success('הזמנה נשלחה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
    },
    onError: (error) => {
      console.error('Invite error:', error);
      let message = error?.response?.data?.message || error?.message || 'שגיאה לא ידועה';

      if (typeof message === 'string' && message.includes('Only paid users or users with a seat')) {
        message =
          "לא ניתן להזמין מנהלים (Admins) בחבילה הנוכחית או למשתמשים מחוץ לארגון. נא לנסות להזמין כ'מוקדן' (User).";
      }

      toast.error('שגיאה בשליחת הזמנה: ' + message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      toast.success('המשתמש עודכן בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error('שגיאה בעדכון משתמש: ' + error.message);
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadUser) return;

    try {
      setIsUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.User.update(uploadUser.id, {
        profile_image: file_url,
      });

      toast.success('תמונת פרופיל עודכנה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsUploadOpen(false);
      setUploadUser(null);
    } catch (error) {
      toast.error('שגיאה בהעלאת תמונה: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInvite = (e) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('נא להזין כתובת אימייל תקינה');
      return;
    }
    inviteMutation.mutate({ email: cleanEmail, role: inviteRole });
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditName(user.full_name || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = (e) => {
    e.preventDefault();
    if (editingUser) {
      const data = { role: editRole, full_name: editName };
      updateUserMutation.mutate({ userId: editingUser.id, data });
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !search ||
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isAdmin = currentUser?.role === 'admin';

  const columns = [
    {
      header: 'משתמש',
      accessor: 'full_name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
            {row.profile_image ? (
              <img
                src={row.profile_image}
                alt={row.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <div className="font-medium text-[#212121]">{row.full_name || 'לא צוין'}</div>
            <div className="text-sm text-[#616161]">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'תפקיד',
      accessor: 'role',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Shield
            className={`w-4 h-4 ${row.role === 'admin' ? 'text-[#D32F2F]' : 'text-[#616161]'}`}
          />
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              row.role === 'admin' ? 'bg-[#FFEBEE] text-[#D32F2F]' : 'bg-[#E3F2FD] text-[#0078D4]'
            }`}
          >
            {row.role === 'admin' ? 'מנהל' : 'מוקדן'}
          </span>
        </div>
      ),
    },
    {
      header: 'תאריך הצטרפות',
      accessor: 'created_date',
      cell: (row) =>
        row.created_date ? new Date(row.created_date).toLocaleDateString('he-IL') : '-',
    },
    {
      header: 'פעולות',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleEditUser(row);
              }}
              title="עריכת משתמש"
            >
              <Edit className="w-4 h-4 text-[#616161]" />
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setUploadUser(row);
                setIsUploadOpen(true);
              }}
              title="העלאת תמונת פרופיל"
            >
              <Upload className="w-4 h-4 text-[#616161]" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border border-[#E0E0E0] p-12">
        <AlertCircle className="w-16 h-16 text-[#ED6C02] mb-4" />
        <h2 className="text-2xl font-bold text-[#212121] mb-2">גישה מוגבלת</h2>
        <p className="text-[#616161] text-center">
          דף זה זמין למנהלים בלבד.
          <br />
          אנא פנה למנהל המערכת לקבלת הרשאות.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>ניהול משתמשים</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[var(--color-text-secondary)]">
              {filteredUsers.length} משתמשים במערכת
            </p>
            <div className="h-4 w-px bg-gray-300 mx-2"></div>
            <AvatarStack users={users} size="sm" max={8} />
          </div>
        </div>

        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary gap-2">
              <UserPlus className="w-4 h-4" />
              הזמן משתמש חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>הזמן משתמש חדש</DialogTitle>
              <DialogDescription>
                הזמן משתמש חדש למערכת על ידי הזנת כתובת האימייל שלו ובחירת תפקיד.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <Label>כתובת אימייל *</Label>
                <div className="relative mt-1">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E]" />
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="pr-10"
                    required
                  />
                </div>
                <p className="text-xs text-[#616161] mt-1">
                  המשתמש יקבל מייל עם קישור להרשמה למערכת
                </p>
              </div>
              <div>
                <Label>תפקיד במערכת *</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">מוקדן</SelectItem>
                    <SelectItem value="admin">מנהל</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#616161] mt-1">
                  {inviteRole === 'admin'
                    ? 'מנהל - גישה מלאה (שים לב: ייתכן ומוגבל בחשבונות מסוימים)'
                    : 'מוקדן - גישה לניהול קריאות בלבד (מומלץ)'}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsInviteDialogOpen(false);
                    setInviteEmail('');
                  }}
                >
                  ביטול
                </Button>
                <Button type="submit" className="btn-primary" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'שלח הזמנה'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#6B7280] mt-0.5 flex-shrink-0" />
        <div className="text-sm text-[#111827]">
          <p className="font-medium mb-1">על ניהול משתמשים:</p>
          <ul className="list-disc list-inside space-y-1 text-[#6B7280]">
            <li>רק מנהלים יכולים להזמין משתמשים חדשים ולשנות תפקידים</li>
            <li>משתמשים רגילים (מוקדנים) יכולים לנהל קריאות ולעבוד במערכת</li>
            <li>מנהלים יכולים לצפות בכל הנתונים ולערוך הגדרות מערכת</li>
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E]" />
            <Input
              placeholder="חיפוש לפי שם או אימייל..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="תפקיד" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התפקידים</SelectItem>
              <SelectItem value="admin">מנהלים</SelectItem>
              <SelectItem value="user">מוקדנים</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <p className="text-[13px] font-medium text-[#6B7280] mb-2">סה"כ משתמשים</p>
          <p className="text-[28px] font-bold text-[#111827]">{users.length}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <p className="text-[13px] font-medium text-[#6B7280] mb-2">מנהלים</p>
          <p className="text-[28px] font-bold text-[#111827]">
            {users.filter((u) => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <p className="text-[13px] font-medium text-[#6B7280] mb-2">מוקדנים</p>
          <p className="text-[28px] font-bold text-[#111827]">
            {users.filter((u) => u.role === 'user').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        emptyMessage="לא נמצאו משתמשים"
      />

      {/* Invite Dialog - Moved to Header */}

      {/* Upload Image Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>עדכון תמונת פרופיל</DialogTitle>
            <DialogDescription>בחר תמונה חדשה למשתמש זה.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {uploadUser && (
              <div className="text-center mb-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 mb-2">
                  {uploadUser.profile_image ? (
                    <img
                      src={uploadUser.profile_image}
                      alt={uploadUser.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <p className="font-medium">{uploadUser.full_name}</p>
                <p className="text-sm text-gray-500">{uploadUser.email}</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <Label
                htmlFor="picture"
                className="text-center cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-8 hover:bg-gray-50 transition-colors"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span>מעלה תמונה...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span>לחץ לבחירת תמונה</span>
                    <span className="text-xs text-gray-400">PNG, JPG עד 5MB</span>
                  </div>
                )}
                <Input
                  id="picture"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </Label>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                disabled={isUploading}
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>עריכת פרטי משתמש</DialogTitle>
            <DialogDescription>עדכון פרטים אישיים והרשאות משתמש.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            {editingUser && (
              <>
                <div className="bg-[#FAFAFA] p-4 rounded-lg mb-4">
                  <p className="text-sm text-[#616161]">אימייל</p>
                  <p className="font-medium text-[#212121]">{editingUser.email}</p>
                </div>

                <div>
                  <Label>שם מלא</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>תפקיד במערכת</Label>
                  <Select
                    value={editRole}
                    onValueChange={setEditRole}
                    disabled={editingUser.id === currentUser?.id}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">מוקדן</SelectItem>
                      <SelectItem value="admin">מנהל</SelectItem>
                    </SelectContent>
                  </Select>
                  {editingUser.id === currentUser?.id && (
                    <p className="text-xs text-[#616161] mt-1">לא ניתן לשנות את התפקיד של עצמך</p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingUser(null);
                    }}
                  >
                    ביטול
                  </Button>
                  <Button
                    type="submit"
                    className="btn-primary"
                    disabled={updateUserMutation.isPending}
                  >
                    שמור שינויים
                  </Button>
                </div>
              </>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
