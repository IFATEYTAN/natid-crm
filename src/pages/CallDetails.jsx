import React from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertTriangle, Car } from 'lucide-react';
import { queryKeys } from '@/lib/queryKeys';
import { getAppealById } from '@/features/calls/api';
import { DEPARTMENT_LABELS, APPEAL_STATUS_LABELS } from '@/config/appealLabels';
import AppealInfoView from '@/components/call-details/AppealInfoView';

/**
 * Read-only call detail, sourced from srv GET /appeals/{id}. Status changes,
 * supplier assignment, closing, and editing are Phase 2/3 of the dispatcher
 * rebuild (see the migration plan) — this page will grow those actions back
 * once the corresponding write endpoints exist on srv.
 */
export default function CallDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appealId = searchParams.get('id');

  const appealQuery = useQuery({
    queryKey: queryKeys.appeals.detail(appealId),
    queryFn: () => getAppealById(appealId),
    enabled: !!appealId,
  });

  const appeal = appealQuery.data?.data;
  const questions = appealQuery.data?.questions ?? [];

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

        <AppealInfoView appeal={appeal} questions={questions} />
      </div>
    </QueryStateWrapper>
  );
}
