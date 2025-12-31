import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { 
  FileText, 
  Users, 
  Truck, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Phone,
  MapPin,
  ChevronLeft,
  Plus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const serviceTypeLabels = {
  towing: 'גרירה',
  flat_tire: 'פנצ\'ר',
  battery: 'מצבר',
  lockout: 'פתיחת רכב',
  fuel: 'דלק',
  accident: 'תאונה',
  mechanical: 'תקלה מכנית',
  other: 'אחר'
};

export default function Dashboard() {
  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => base44.entities.Case.list('-created_date', 100),
  });

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => base44.entities.ServiceProvider.list(),
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const isLoading = casesLoading || providersLoading || customersLoading;

  // Calculate stats
  const activeCases = cases.filter(c => !['completed', 'cancelled'].includes(c.status));
  const todayCases = cases.filter(c => c.created_date && isToday(parseISO(c.created_date)));
  const completedToday = todayCases.filter(c => c.status === 'completed');
  const availableProviders = providers.filter(p => p.status === 'available');
  const urgentCases = activeCases.filter(c => c.priority === 'urgent' || c.priority === 'high');

  // Calculate SLA metrics
  const casesWithSla = cases.filter(c => c.sla_arrival_met !== undefined);
  const slaMetCount = casesWithSla.filter(c => c.sla_arrival_met === true).length;
  const slaPercentage = casesWithSla.length > 0 
    ? Math.round((slaMetCount / casesWithSla.length) * 100) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#0D47A1] leading-tight">שלום,</h1>
          <p className="text-[#616161] text-sm body-2 mt-1">סקירת מצב מערכת</p>
        </div>
        <Link to={createPageUrl('NewCase')}>
          <Button className="bg-[#0D47A1] hover:bg-[#1565C0] active:scale-[0.98] text-white gap-2 shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)] transition-all duration-200 rounded-[4px] px-6 py-2.5">
            <Plus className="w-5 h-5" strokeWidth={2} />
            קריאה חדשה
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              title="קריאות פעילות"
              value={activeCases.length}
              subtitle={`${urgentCases.length} דחופות`}
              icon={FileText}
              variant="primary"
            />
            <StatCard
              title="קריאות היום"
              value={todayCases.length}
              subtitle={`${completedToday.length} הושלמו`}
              icon={Clock}
            />
            <StatCard
              title="נותני שירות זמינים"
              value={`${availableProviders.length}/${providers.length}`}
              icon={Truck}
              variant={availableProviders.length < 3 ? 'warning' : 'default'}
            />
            <StatCard
              title="עמידה ב-SLA"
              value={`${slaPercentage}%`}
              icon={TrendingUp}
              variant={slaPercentage >= 90 ? 'success' : slaPercentage >= 70 ? 'warning' : 'error'}
            />
          </>
        )}
      </div>

      {/* Active Cases & Available Providers */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Cases */}
        <div className="lg:col-span-2 bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] card-hover">
          <div className="p-6 border-b border-[#E0E0E0] flex items-center justify-between">
            <h3 className="text-[20px] font-medium text-[#212121]">קריאות פעילות</h3>
            <Link to={createPageUrl('Cases')} className="text-[#0D47A1] text-sm hover:underline flex items-center gap-1 body-2">
              הצג הכל
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
          <div className="divide-y divide-[#E0E0E0]">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="p-4">
                  <Skeleton className="h-16" />
                </div>
              ))
            ) : activeCases.length === 0 ? (
              <div className="p-8 text-center text-[#616161]">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-[#2E7D32]" />
                <p>אין קריאות פעילות</p>
              </div>
            ) : (
              activeCases.slice(0, 5).map(caseItem => (
                <Link 
                  key={caseItem.id} 
                  to={createPageUrl(`CaseDetails?id=${caseItem.id}`)}
                  className="block p-4 hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#212121]">
                          {caseItem.case_number || `#${caseItem.id?.slice(-6)}`}
                        </span>
                        <StatusBadge status={caseItem.status} size="sm" />
                        {(caseItem.priority === 'urgent' || caseItem.priority === 'high') && (
                          <StatusBadge status={caseItem.priority} size="sm" />
                        )}
                      </div>
                      <p className="text-sm text-[#616161] truncate">
                        {serviceTypeLabels[caseItem.service_type]} - {caseItem.customer_name}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#9E9E9E]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {caseItem.location_city || caseItem.location_address}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {caseItem.caller_phone}
                        </span>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-[#9E9E9E] flex-shrink-0" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Available Providers */}
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] card-hover">
          <div className="p-6 border-b border-[#E0E0E0] flex items-center justify-between">
            <h3 className="text-[20px] font-medium text-[#212121]">נותני שירות זמינים</h3>
            <Link to={createPageUrl('ServiceProviders')} className="text-[#0D47A1] text-sm hover:underline flex items-center gap-1 body-2">
              הצג הכל
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
          <div className="divide-y divide-[#E0E0E0]">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="p-4">
                  <Skeleton className="h-12" />
                </div>
              ))
            ) : availableProviders.length === 0 ? (
              <div className="p-8 text-center text-[#616161]">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-[#ED6C02]" />
                <p>אין נותני שירות זמינים</p>
              </div>
            ) : (
              availableProviders.slice(0, 6).map(provider => (
                <div key={provider.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#212121]">{provider.name}</p>
                      <p className="text-sm text-[#616161]">{provider.phone}</p>
                    </div>
                    <StatusBadge status={provider.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] card-hover">
          <p className="text-[32px] font-bold text-[#0D47A1] leading-tight">{customers.length}</p>
          <p className="text-sm text-[#616161] caption mt-2">לקוחות פעילים</p>
        </div>
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] card-hover">
          <p className="text-[32px] font-bold text-[#0D47A1] leading-tight">{providers.length}</p>
          <p className="text-sm text-[#616161] caption mt-2">נותני שירות</p>
        </div>
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] card-hover">
          <p className="text-[32px] font-bold text-[#0D47A1] leading-tight">{cases.length}</p>
          <p className="text-sm text-[#616161] caption mt-2">סה"כ קריאות</p>
        </div>
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] card-hover">
          <p className="text-[32px] font-bold text-[#2E7D32] leading-tight">
            {cases.filter(c => c.status === 'completed').length}
          </p>
          <p className="text-sm text-[#616161] caption mt-2">קריאות שהושלמו</p>
        </div>
      </div>
    </div>
  );
}