import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertTriangle, Car, Truck, Pencil, Lock } from 'lucide-react';
import { queryKeys } from '@/lib/queryKeys';
import { getAppealById } from '@/features/calls/api';
import { lockAppeal, unlockAppeal } from '@/lib/srvApi';
import { DEPARTMENT_LABELS, APPEAL_STATUS_LABELS } from '@/config/appealLabels';
import AppealInfoView from '@/components/call-details/AppealInfoView';
import AppealEventsSection from '@/components/call-details/AppealEventsSection';
import AssignSupplierDialog from '@/components/call-details/AssignSupplierDialog';
import EditAppealDialog from '@/components/call-details/EditAppealDialog';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';

/**
 * Call detail, sourced from srv GET /appeals/{id}. Read display is Phase 1
 * of the dispatcher rebuild plan; assign-supplier/edit/notes/reminder are
 * Phase 2 (POST/PATCH /appeals/{id}/*). Status transitions, closing, and
 * opening new calls remain Phase 3+ — this page still doesn't do those.
 */
export default function CallDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appealId = searchParams.get('id');
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('calls', 'edit');
  const canAssign = hasPermission('calls', 'assign');

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [lockedByOther, setLockedByOther] = useState(null);

  const appealQuery = useQuery({
    queryKey: queryKeys.appeals.detail(appealId),
    queryFn: () => getAppealById(appealId),
    enabled: !!appealId,
  });

  const appeal = appealQuery.data?.data;
  const questions = appealQuery.data?.questions ?? [];

  // Mimics the PHP CRM's appeal lock: warns if someone else holds it, never
  // blocks (appeals_list.js:395 shows a warning box and opens the call
  // window regardless either way) — see srv.natid.co.il CLAUDE.md's
  // POST /appeals/{id}/lock docs for the TTL rationale.
  useEffect(() => {
    if (!appealId) return;
    let active = true;
    lockAppeal(appealId, { continueId: appeal?.continue_id, departmentId: appeal?.department_id })
      .then((res) => {
        if (active) setLockedByOther(res.locked_by_other ? res.locked_by : null);
      })
      .catch(() => {
        // Lock check failing is non-blocking — same spirit as PHP's warn-only behavior.
      });
    return () => {
      active = false;
      unlockAppeal(appealId).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appealId]);

  if (!appealId) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">לא נמצא מזהה קריאה</h2>
        <Link to={createPageUrl('Calls')}>
          <Button className="mt-4">חזרה לרשימת הקריאות</Button>
        </Link>
      </div>
    );
  }

  return (
    <QueryStateWrapper query={appealQuery}>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="חזרה"
              className="shrink-0 h-10 w-10"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="flex items-center gap-2 text-lg sm:text-2xl font-bold text-[#172B4D]">
                  <Car className="w-5 h-5 sm:w-6 sm:h-6 text-[#6B778C] shrink-0" />
                  <span dir="ltr" className="tabular-nums">
                    {appeal?.car_num || 'ללא מספר רכב'}
                  </span>
                </h1>
                {appeal?.status != null && (
                  <Badge className="bg-gray-100 text-gray-700">
                    {APPEAL_STATUS_LABELS[appeal.status] ?? appeal.status}
                  </Badge>
                )}
                {appeal?.vip === 1 && <Badge className="bg-amber-100 text-amber-800">VIP</Badge>}
              </div>
              <p className="text-[#6B778C] text-sm">
                קריאה {appeal?.appeal_id} ·{' '}
                {DEPARTMENT_LABELS[String(appeal?.department_id)] || appeal?.department} · נפתחה ב-
                {appeal?.date_added}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <PermissionGuard category="calls" permission="assign">
              <Button
                variant="outline"
                className="gap-2 h-10 text-sm"
                onClick={() => setShowAssignDialog(true)}
              >
                <Truck className="w-4 h-4" />
                שבץ ספק
              </Button>
            </PermissionGuard>
            <PermissionGuard category="calls" permission="edit">
              <Button
                variant="outline"
                className="gap-2 h-10 text-sm"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="w-4 h-4" />
                ערוך קריאה
              </Button>
            </PermissionGuard>
          </div>

          {lockedByOther && (
            <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
              <Lock className="w-4 h-4 shrink-0" />
              קריאה נעולה ע״י {lockedByOther.full_name} — ניתן להמשיך לערוך, אך שינויים עלולים
              להתנגש.
            </div>
          )}
        </div>

        <AppealInfoView appeal={appeal} questions={questions} />

        <AppealEventsSection appealId={appealId} />
      </div>

      {canAssign && (
        <AssignSupplierDialog
          appealId={appealId}
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
        />
      )}
      {canEdit && (
        <EditAppealDialog
          appeal={appeal}
          appealId={appealId}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </QueryStateWrapper>
  );
}
