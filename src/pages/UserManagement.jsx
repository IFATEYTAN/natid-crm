import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DataTable from '@/components/ui/DataTable';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  UserPlus, 
  Search, 
  Mail,
  Shield,
  User,
  Edit,
  AlertCircle,
  Upload,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [editRole, setEditRole] = useState('user');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadUser, setUploadUser] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

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
      toast.error('שגיאה בשליחת הזמנה: ' + error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => base44.entities.User.update(userId, { role }),
    onSuccess: () => {
      toast.success('התפקיד עודכן בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error('שגיאה בעדכון תפקיד: ' + error.message);
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadUser) return;

    try {
      setIsUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.User.update(uploadUser.id, {
        profile_image: file_url
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
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('נא להזין כתובת אימייל תקינה');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleEditRole = (user) => {
    setEditingUser(user);
    setEditRole(user.role);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRole = (e) => {
    e.preventDefault();
    if (editingUser) {
      updateRoleMutation.mutate({ userId: editingUser.id, role: editRole });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !search || 
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
              <img src={row.profile_image} alt={row.full_name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <div className="font-medium text-[#212121]">{row.full_name || 'לא צוין'}</div>
            <div className="text-sm text-[#616161]">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'תפקיד',
      accessor: 'role',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${row.role === 'admin' ? 'text-[#D32F2F]' : 'text-[#616161]'}`} />
          <span className={`px-3 py-1 rounded-full text-sm ${
            row.role === 'admin' 
              ? 'bg-[#FFEBEE] text-[#D32F2F]' 
              : 'bg-[#E3F2FD] text-[#0078D4]'
          }`}>
            {row.role === 'admin' ? 'מנהל' : 'מוקדן'}
          </span>
        </div>
      )
    },
    {
      header: 'תאריך הצטרפות',
      accessor: 'created_date',
      cell: (row) => row.created_date ? new Date(row.created_date).toLocaleDateString('he-IL') : '-'
    },
    {
      header: 'פעולות',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleEditRole(row); }}
              title="עריכת תפקיד"
              disabled={row.id === currentUser?.id}
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
      )
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
          <p className="text-[#616161] text-sm">{filteredUsers.length} משתמשים במערכת</p>
        </div>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0D47A1] hover:bg-[#1565C0] gap-2">
              <UserPlus className="w-4 h-4" />
              הזמן משתמש חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>הזמן משתמש חדש</DialogTitle>
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
                    ? 'מנהל - גישה מלאה לכל המערכת' 
                    : 'מוקדן - גישה לניהול קריאות בלבד'}
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
                <Button 
                  type="submit" 
                  className="bg-[#0D47A1] hover:bg-[#1565C0]"
                  disabled={inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שלח הזמנה'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <div className="bg-[#E3F2FD] border border-[#0078D4]/20 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#0078D4] mt-0.5 flex-shrink-0" />
        <div className="text-sm text-[#212121]">
          <p className="font-medium mb-1">על ניהול משתמשים:</p>
          <ul className="list-disc list-inside space-y-1 text-[#616161]">
            <li>רק מנהלים יכולים להזמין משתמשים חדשים ולשנות תפקידים</li>
            <li>משתמשים רגילים (מוקדנים) יכולים לנהל קריאות ולעבוד במערכת</li>
            <li>מנהלים יכולים לצפות בכל הנתונים ולערוך הגדרות מערכת</li>
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E0E0E0] p-4">
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
        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#616161] mb-1">סה"כ משתמשים</p>
              <p className="text-3xl font-bold text-[#0078D4]">{users.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#E3F2FD] flex items-center justify-center">
              <User className="w-6 h-6 text-[#0078D4]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#616161] mb-1">מנהלים</p>
              <p className="text-3xl font-bold text-[#D32F2F]">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#FFEBEE] flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#D32F2F]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#616161] mb-1">מוקדנים</p>
              <p className="text-3xl font-bold text-[#2E7D32]">
                {users.filter(u => u.role === 'user').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center">
              <User className="w-6 h-6 text-[#2E7D32]" />
            </div>
          </div>
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
          </DialogHeader>
          <div className="space-y-4 py-4">
            {uploadUser && (
              <div className="text-center mb-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 mb-2">
                  {uploadUser.profile_image ? (
                    <img src={uploadUser.profile_image} alt={uploadUser.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <p className="font-medium">{uploadUser.full_name}</p>
                <p className="text-sm text-gray-500">{uploadUser.email}</p>
              </div>
            )}
            
            <div className="flex flex-col gap-4">
              <Label htmlFor="picture" className="text-center cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-8 hover:bg-gray-50 transition-colors">
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
              <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>עריכת תפקיד משתמש</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateRole} className="space-y-4">
            {editingUser && (
              <>
                <div className="bg-[#FAFAFA] p-4 rounded-lg">
                  <p className="text-sm text-[#616161]">משתמש</p>
                  <p className="font-medium text-[#212121]">{editingUser.full_name}</p>
                  <p className="text-sm text-[#616161]">{editingUser.email}</p>
                </div>
                <div>
                  <Label>תפקיד חדש *</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">מוקדן</SelectItem>
                      <SelectItem value="admin">מנהל</SelectItem>
                    </SelectContent>
                  </Select>
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
                    className="bg-[#0D47A1] hover:bg-[#1565C0]"
                    disabled={updateRoleMutation.isPending}
                  >
                    עדכן תפקיד
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