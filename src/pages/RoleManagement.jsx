import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Key,
  Save,
  Check,
  X,
  Eye,
  FileText,
  Settings,
  Map,
  Phone,
  Truck,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_ROLES, DEFAULT_PERMISSIONS } from '@/components/permissions/PermissionsContext';

const PERMISSION_CATEGORIES = {
  calls: { label: 'קריאות', icon: Phone, color: 'blue' },
  vendors: { label: 'ספקים', icon: Truck, color: 'green' },
  customers: { label: 'לקוחות', icon: Users, color: 'purple' },
  reports: { label: 'דוחות', icon: BarChart3, color: 'orange' },
  system: { label: 'מערכת', icon: Settings, color: 'red' },
  monitoring: { label: 'ניטור', icon: Map, color: 'cyan' }
};

const PERMISSION_LABELS = {
  view: 'צפייה',
  create: 'יצירה',
  edit: 'עריכה',
  delete: 'מחיקה',
  assign: 'שיבוץ',
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
  queue: 'ניטור תורים'
};

export default function RoleManagement() {
  const [activeTab, setActiveTab] = useState('roles');
  const [selectedRole, setSelectedRole] = useState(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isUserPermDialogOpen, setIsUserPermDialogOpen] = useState(false);
  const [selectedUserPerm, setSelectedUserPerm] = useState(null);
  const queryClient = useQueryClient();

  // טעינת תפקידים
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list()
  });

  // טעינת הרשאות משתמשים
  const { data: userPermissions = [] } = useQuery({
    queryKey: ['allUserPermissions'],
    queryFn: () => base44.entities.UserPermission.list()
  });

  // טעינת משתמשים
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // יצירת תפקידים ברירת מחדל אם לא קיימים
  const initializeRolesMutation = useMutation({
    mutationFn: async () => {
      const existingRoles = await base44.entities.Role.list();
      const existingNames = existingRoles.map(r => r.name);
      
      const rolesToCreate = [];
      for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
        if (!existingNames.includes(role.name)) {
          rolesToCreate.push({
            ...role,
            is_system: true,
            is_active: true
          });
        }
      }
      
      if (rolesToCreate.length > 0) {
        await base44.entities.Role.bulkCreate(rolesToCreate);
      }
      return rolesToCreate.length;
    },
    onSuccess: (count) => {
      if (count > 0) {
        toast.success(`נוצרו ${count} תפקידי ברירת מחדל`);
        queryClient.invalidateQueries({ queryKey: ['roles'] });
      }
    }
  });

  // שמירת תפקיד
  const saveRoleMutation = useMutation({
    mutationFn: async (roleData) => {
      if (roleData.id) {
        return base44.entities.Role.update(roleData.id, roleData);
      } else {
        return base44.entities.Role.create(roleData);
      }
    },
    onSuccess: () => {
      toast.success('התפקיד נשמר בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsRoleDialogOpen(false);
      setSelectedRole(null);
    }
  });

  // מחיקת תפקיד
  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      toast.success('התפקיד נמחק');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  // שמירת הרשאות משתמש
  const saveUserPermMutation = useMutation({
    mutationFn: async (permData) => {
      if (permData.id) {
        return base44.entities.UserPermission.update(permData.id, permData);
      } else {
        return base44.entities.UserPermission.create(permData);
      }
    },
    onSuccess: () => {
      toast.success('ההרשאות נשמרו');
      queryClient.invalidateQueries({ queryKey: ['allUserPermissions'] });
      setIsUserPermDialogOpen(false);
      setSelectedUserPerm(null);
    }
  });

  const handleEditRole = (role) => {
    setSelectedRole({ ...role });
    setIsRoleDialogOpen(true);
  };

  const handleNewRole = () => {
    setSelectedRole({
      name: '',
      display_name: '',
      description: '',
      permissions: { ...DEFAULT_PERMISSIONS },
      is_system: false,
      is_active: true
    });
    setIsRoleDialogOpen(true);
  };

  const handleEditUserPerm = (user) => {
    const existingPerm = userPermissions.find(p => p.user_id === user.id);
    setSelectedUserPerm({
      id: existingPerm?.id,
      user_id: user.id,
      user_email: user.email,
      role_id: existingPerm?.role_id || '',
      role_name: existingPerm?.role_name || '',
      custom_permissions: existingPerm?.custom_permissions || {},
      restricted_pages: existingPerm?.restricted_pages || [],
      allowed_reports: existingPerm?.allowed_reports || []
    });
    setIsUserPermDialogOpen(true);
  };

  const togglePermission = (category, permission) => {
    if (!selectedRole) return;
    setSelectedRole(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...prev.permissions[category],
          [permission]: !prev.permissions[category]?.[permission]
        }
      }
    }));
  };

  // אתחול תפקידים אם אין
  React.useEffect(() => {
    if (!rolesLoading && roles.length === 0) {
      initializeRolesMutation.mutate();
    }
  }, [rolesLoading, roles.length]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">ניהול הרשאות</h1>
          <p className="text-gray-500 text-sm mt-1">הגדרת תפקידים והרשאות משתמשים</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="w-4 h-4" />
            תפקידים
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            הרשאות משתמשים
          </TabsTrigger>
        </TabsList>

        {/* תפקידים */}
        <TabsContent value="roles">
          <div className="flex justify-end mb-4">
            <Button onClick={handleNewRole} className="gap-2">
              <Plus className="w-4 h-4" />
              תפקיד חדש
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => (
              <Card key={role.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-500" />
                        {role.display_name}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditRole(role)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {!role.is_system && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteRoleMutation.mutate(role.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {role.is_system && (
                      <Badge variant="outline" className="text-xs">תפקיד מערכת</Badge>
                    )}
                    {Object.entries(role.permissions || {}).map(([cat, perms]) => {
                      const enabledCount = Object.values(perms).filter(Boolean).length;
                      if (enabledCount === 0) return null;
                      const catConfig = PERMISSION_CATEGORIES[cat];
                      return (
                        <Badge 
                          key={cat} 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {catConfig?.label}: {enabledCount}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* הרשאות משתמשים */}
        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 text-right font-medium">משתמש</th>
                    <th className="p-3 text-right font-medium">אימייל</th>
                    <th className="p-3 text-right font-medium">תפקיד בסיסי</th>
                    <th className="p-3 text-right font-medium">תפקיד הרשאות</th>
                    <th className="p-3 text-right font-medium">הרשאות מותאמות</th>
                    <th className="p-3 text-center font-medium">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const userPerm = userPermissions.find(p => p.user_id === user.id);
                    return (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{user.full_name}</td>
                        <td className="p-3 text-gray-600">{user.email}</td>
                        <td className="p-3">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {userPerm?.role_name ? (
                            <Badge variant="outline">{userPerm.role_name}</Badge>
                          ) : (
                            <span className="text-gray-400">ברירת מחדל</span>
                          )}
                        </td>
                        <td className="p-3">
                          {userPerm?.custom_permissions && Object.keys(userPerm.custom_permissions).length > 0 ? (
                            <Badge className="bg-orange-100 text-orange-700">מותאם</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditUserPerm(user)}
                          >
                            <Key className="w-4 h-4 ml-1" />
                            הגדר הרשאות
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* דיאלוג עריכת תפקיד */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole?.id ? 'עריכת תפקיד' : 'תפקיד חדש'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRole && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>שם מזהה (באנגלית)</Label>
                  <Input
                    value={selectedRole.name}
                    onChange={(e) => setSelectedRole(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="manager"
                    disabled={selectedRole.is_system}
                  />
                </div>
                <div>
                  <Label>שם תצוגה</Label>
                  <Input
                    value={selectedRole.display_name}
                    onChange={(e) => setSelectedRole(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="מנהל תפעול"
                  />
                </div>
              </div>
              
              <div>
                <Label>תיאור</Label>
                <Input
                  value={selectedRole.description}
                  onChange={(e) => setSelectedRole(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="תיאור התפקיד והרשאותיו"
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">הרשאות</h3>
                
                {Object.entries(PERMISSION_CATEGORIES).map(([catKey, catConfig]) => {
                  const Icon = catConfig.icon;
                  const categoryPerms = DEFAULT_PERMISSIONS[catKey] || {};
                  
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
                          {Object.keys(categoryPerms).map(permKey => (
                            <div key={permKey} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{PERMISSION_LABELS[permKey] || permKey}</span>
                              <Switch
                                checked={selectedRole.permissions?.[catKey]?.[permKey] || false}
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={() => saveRoleMutation.mutate(selectedRole)}
              disabled={!selectedRole?.name || !selectedRole?.display_name}
            >
              <Save className="w-4 h-4 ml-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג הרשאות משתמש */}
      <Dialog open={isUserPermDialogOpen} onOpenChange={setIsUserPermDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>הגדרת הרשאות - {selectedUserPerm?.user_email}</DialogTitle>
          </DialogHeader>
          
          {selectedUserPerm && (
            <div className="space-y-4">
              <div>
                <Label>בחר תפקיד</Label>
                <Select
                  value={selectedUserPerm.role_id || 'none'}
                  onValueChange={(value) => {
                    const role = roles.find(r => r.id === value);
                    setSelectedUserPerm(prev => ({
                      ...prev,
                      role_id: value === 'none' ? '' : value,
                      role_name: role?.display_name || ''
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תפקיד" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ברירת מחדל (מוקדן)</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  התפקיד קובע את ההרשאות הבסיסיות של המשתמש
                </p>
              </div>

              {selectedUserPerm.role_id && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>שים לב:</strong> המשתמש יקבל את כל ההרשאות של התפקיד שנבחר.
                    ניתן להוסיף הגבלות נוספות בהמשך.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserPermDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={() => saveUserPermMutation.mutate(selectedUserPerm)}>
              <Save className="w-4 h-4 ml-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}