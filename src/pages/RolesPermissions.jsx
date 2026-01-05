import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  ChevronUp,
  Shield,
  User,
  Users,
  Truck,
  ClipboardCheck,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  FileText,
  BarChart3,
  Bell,
  Save
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

// Roles configuration from spec
const ROLES_CONFIG = [
  {
    id: 'mokdan',
    name: 'מוקדן',
    nameEn: 'Call Center Agent',
    description: 'נציג מוקד - ניהול קריאות ועבודה יומיומית',
    color: 'bg-[#3B82F6] text-white',
    badgeColor: 'bg-[#DBEAFE] text-[#1D4ED8]',
    permissions: {
      read: [
        { id: 'dashboard', name: 'לוח בקרה', enabled: true },
        { id: 'calls-list', name: 'רשימת קריאות', enabled: true },
        { id: 'call-details', name: 'פרטי קריאה', enabled: true },
        { id: 'vendors-list', name: 'רשימת ספקים (צפייה)', enabled: true },
        { id: 'vendor-details', name: 'פרטי ספק (צפייה)', enabled: true },
      ],
      write: [
        { id: 'create-call', name: 'יצירת קריאה חדשה', enabled: true },
        { id: 'edit-call', name: 'עריכת פרטי קריאה', enabled: true },
        { id: 'update-status', name: 'עדכון סטטוס קריאה', enabled: true },
        { id: 'assign-vendor', name: 'שיוך ספק לקריאה', enabled: true },
        { id: 'add-messages', name: 'הוספת הודעות לקריאה', enabled: true },
        { id: 'update-history', name: 'עדכון היסטוריית קריאה', enabled: true },
      ],
      denied: [
        { id: 'delete-calls', name: 'מחיקת קריאות', enabled: false },
        { id: 'edit-vendors', name: 'עריכת/מחיקת ספקים', enabled: false },
        { id: 'access-reports', name: 'גישה לדוחות', enabled: false },
        { id: 'manage-users', name: 'ניהול משתמשים', enabled: false },
      ]
    }
  },
  {
    id: 'manager',
    name: 'מנהל מוקד',
    nameEn: 'Call Center Manager',
    description: 'מנהל מוקד - גישה מורחבת לדוחות וניהול ספקים',
    color: 'bg-[#8B5CF6] text-white',
    badgeColor: 'bg-[#F5F3FF] text-[#7C3AED]',
    permissions: {
      read: [
        { id: 'all-mokdan', name: 'כל הרשאות מוקדן', enabled: true },
        { id: 'all-reports', name: 'כל הדוחות', enabled: true },
        { id: 'user-management', name: 'ניהול משתמשים', enabled: true },
        { id: 'system-settings', name: 'הגדרות מערכת', enabled: true },
      ],
      write: [
        { id: 'edit-vendors', name: 'עריכת ספקים (הוספה, עדכון, השבתה)', enabled: true },
        { id: 'manage-agents', name: 'ניהול נציגי מוקד', enabled: true },
        { id: 'override-sla', name: 'דריסת הגדרות SLA', enabled: true },
        { id: 'export-data', name: 'ייצוא נתונים', enabled: true },
      ],
      denied: [
        { id: 'delete-vendors', name: 'מחיקת ספקים לצמיתות', enabled: false },
        { id: 'manage-admins', name: 'ניהול מנהלי מערכת', enabled: false },
      ]
    }
  },
  {
    id: 'vendor',
    name: 'ספק',
    nameEn: 'Vendor',
    description: 'ספק שירות - גישה לפורטל ספקים וקריאות משויכות',
    color: 'bg-[#10B981] text-white',
    badgeColor: 'bg-[#ECFDF5] text-[#059669]',
    permissions: {
      read: [
        { id: 'vendor-portal', name: 'פורטל ספקים בלבד', enabled: true },
        { id: 'own-calls', name: 'קריאות משויכות (assigned_vendor_id = vendor_id)', enabled: true },
        { id: 'own-profile', name: 'פרופיל ספק אישי', enabled: true },
      ],
      write: [
        { id: 'update-call-status', name: 'עדכון סטטוס קריאה (רק קריאות משויכות)', enabled: true },
        { id: 'add-vendor-notes', name: 'הוספת הערות ספק', enabled: true },
        { id: 'update-availability', name: 'עדכון זמינות (is_available_now)', enabled: true },
        { id: 'add-messages', name: 'הוספת הודעות לקריאות משויכות', enabled: true },
      ],
      denied: [
        { id: 'see-other-vendors', name: 'צפייה בספקים אחרים', enabled: false },
        { id: 'see-unassigned', name: 'צפייה בקריאות לא משויכות', enabled: false },
        { id: 'edit-customer', name: 'עריכת פרטי לקוח', enabled: false },
        { id: 'access-reports', name: 'גישה לדוחות', enabled: false },
        { id: 'access-dashboard', name: 'גישה ללוח בקרה', enabled: false },
      ]
    }
  },
  {
    id: 'qc',
    name: 'בקר',
    nameEn: 'Quality Controller',
    description: 'בקר איכות - בדיקת קריאות ואישור איכות',
    color: 'bg-[#F59E0B] text-white',
    badgeColor: 'bg-[#FFFBEB] text-[#D97706]',
    permissions: {
      read: [
        { id: 'all-calls', name: 'כל הקריאות', enabled: true },
        { id: 'call-history', name: 'היסטוריית קריאות', enabled: true },
        { id: 'reports', name: 'דוחות', enabled: true },
      ],
      write: [
        { id: 'update-qc', name: 'עדכון passed_quality_control', enabled: true },
        { id: 'add-qc-notes', name: 'הוספת הערות איכות', enabled: true },
        { id: 'return-to-agent', name: 'סימון returned_to_agent', enabled: true },
      ],
      denied: [
        { id: 'create-calls', name: 'יצירת/עריכת קריאות', enabled: false },
        { id: 'manage-vendors', name: 'ניהול ספקים', enabled: false },
        { id: 'assign-vendors', name: 'שיוך ספקים', enabled: false },
      ]
    }
  },
  {
    id: 'admin',
    name: 'מנהל מערכת',
    nameEn: 'System Admin',
    description: 'מנהל מערכת - גישה מלאה לכל המערכת',
    color: 'bg-[#DC2626] text-white',
    badgeColor: 'bg-[#FEE2E2] text-[#DC2626]',
    permissions: {
      read: [
        { id: 'full-access', name: 'גישה מלאה לכל התכנים', enabled: true },
      ],
      write: [
        { id: 'manage-users', name: 'ניהול כל המשתמשים והתפקידים', enabled: true },
        { id: 'system-settings', name: 'הגדרות מערכת', enabled: true },
        { id: 'database-access', name: 'גישה לבסיס נתונים', enabled: true },
        { id: 'all-operations', name: 'כל הפעולות במערכת', enabled: true },
      ],
      denied: []
    }
  }
];

export default function RolesPermissions() {
  const [roles, setRoles] = useState(ROLES_CONFIG);
  const [expandedRoles, setExpandedRoles] = useState({ 'mokdan': true });

  const toggleRole = (roleId) => {
    setExpandedRoles(prev => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };

  const getRoleIcon = (roleId) => {
    switch (roleId) {
      case 'mokdan': return <User className="w-5 h-5" />;
      case 'manager': return <Users className="w-5 h-5" />;
      case 'vendor': return <Truck className="w-5 h-5" />;
      case 'qc': return <ClipboardCheck className="w-5 h-5" />;
      case 'admin': return <Shield className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
    }
  };

  const handleSave = () => {
    localStorage.setItem('rolesPermissions', JSON.stringify(roles));
    toast.success('הגדרות ההרשאות נשמרו בהצלחה');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#212121]">הרשאות ותפקידים</h1>
          <p className="text-[14px] text-[#616161] mt-1">
            ניהול הרשאות גישה לפי תפקידים במערכת
          </p>
        </div>
        <Button onClick={handleSave} className="bg-[#3B82F6] hover:bg-[#2563EB] gap-2">
          <Save className="w-4 h-4" />
          שמור שינויים
        </Button>
      </div>

      {/* Roles Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className={cn(
              "p-4 rounded-lg text-center cursor-pointer transition-all hover:scale-105",
              role.color
            )}
            onClick={() => toggleRole(role.id)}
          >
            <div className="flex justify-center mb-2">
              {getRoleIcon(role.id)}
            </div>
            <div className="font-semibold">{role.name}</div>
            <div className="text-[11px] opacity-80">{role.nameEn}</div>
          </div>
        ))}
      </div>

      {/* Roles Detail */}
      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role.id} className="overflow-hidden">
            <CardHeader
              className={cn(
                "cursor-pointer transition-colors",
                expandedRoles[role.id] ? "bg-[#F9FAFB]" : "hover:bg-[#FAFAFA]"
              )}
              onClick={() => toggleRole(role.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", role.color)}>
                    {getRoleIcon(role.id)}
                  </div>
                  <div>
                    <CardTitle className="text-[16px] flex items-center gap-2">
                      {role.name}
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", role.badgeColor)}>
                        {role.nameEn}
                      </span>
                    </CardTitle>
                    <p className="text-[13px] text-[#6B7280] mt-1">{role.description}</p>
                  </div>
                </div>
                {expandedRoles[role.id] ? (
                  <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                )}
              </div>
            </CardHeader>

            {expandedRoles[role.id] && (
              <CardContent className="pt-4">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Read Permissions */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-[#3B82F6]" />
                      <h4 className="font-semibold text-[14px] text-[#374151]">קריאה (Read)</h4>
                    </div>
                    <div className="space-y-2">
                      {role.permissions.read.map((perm) => (
                        <div key={perm.id} className="flex items-center gap-2 text-[13px]">
                          <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                          <span className="text-[#4B5563]">{perm.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Write Permissions */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Edit className="w-4 h-4 text-[#10B981]" />
                      <h4 className="font-semibold text-[14px] text-[#374151]">כתיבה (Write)</h4>
                    </div>
                    <div className="space-y-2">
                      {role.permissions.write.map((perm) => (
                        <div key={perm.id} className="flex items-center gap-2 text-[13px]">
                          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                          <span className="text-[#4B5563]">{perm.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Denied Permissions */}
                  {role.permissions.denied.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Trash2 className="w-4 h-4 text-[#EF4444]" />
                        <h4 className="font-semibold text-[14px] text-[#374151]">אסור (Cannot)</h4>
                      </div>
                      <div className="space-y-2">
                        {role.permissions.denied.map((perm) => (
                          <div key={perm.id} className="flex items-center gap-2 text-[13px]">
                            <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                            <span className="text-[#9CA3AF] line-through">{perm.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <Card className="bg-[#FEF3C7] border-[#F59E0B]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-[13px]">
              <p className="font-medium text-[#92400E]">מידע חשוב על הרשאות</p>
              <ul className="list-disc list-inside space-y-1 text-[#78350F]">
                <li>שינויים בהרשאות יחולו מיידית על כל המשתמשים בתפקיד</li>
                <li>מנהל מערכת לא יכול להסיר מעצמו הרשאות מנהל</li>
                <li>ספקים יכולים לגשת רק לפורטל הספקים ולקריאות המשויכות להם</li>
                <li>בקרי איכות יכולים לצפות בכל הקריאות אך לא לערוך אותן</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
