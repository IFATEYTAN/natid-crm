import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createPageUrl } from '@/components/utils';
import { queryKeys } from '@/lib/queryKeys';
import {
  searchClients,
  getClient,
  getVehicle,
  getCoverage,
  listCallProblems,
  createAppeal,
} from '@/lib/srvApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Search,
  User,
  Car,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Save,
  X,
} from 'lucide-react';

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Open a new (towing/drag, department 3) call — srv POST /appeals, port of
 * f_addAppeal(). Phase 3 of the dispatcher rebuild plan.
 *
 * Scoped to department 3 (towing — 74% of production volume per the
 * migration plan) since that's what the backend's generic location fields
 * (address/city vs grar_address/grar_city) match; rent car/windshields/
 * radiodisc each need their own department-specific fields the backend
 * doesn't expose yet. No technical questionnaire UI — POST /appeals accepts
 * `answers` but this form doesn't collect any, matching an appeal opened
 * with no questionnaire answered (a real, supported PHP state, not a
 * shortcut).
 */
export default function NewCase() {
  const navigate = useNavigate();

  // ---- subscription search ----
  const [subQuery, setSubQuery] = useState('');
  const debouncedSubQuery = useDebouncedValue(subQuery.trim(), 400);
  const [selectedSub, setSelectedSub] = useState(null);
  const [privateService, setPrivateService] = useState(false);

  const { data: subResults, isFetching: subSearching } = useQuery({
    queryKey: queryKeys.clientSearch.results(debouncedSubQuery, {}),
    queryFn: () => searchClients({ q: debouncedSubQuery }),
    enabled: debouncedSubQuery.length > 0 && !selectedSub && !privateService,
  });

  const { data: subDetailData } = useQuery({
    queryKey: queryKeys.clientSearch.detail(selectedSub?.sub_id),
    queryFn: () => getClient(selectedSub.sub_id),
    enabled: !!selectedSub?.sub_id,
  });
  const subDetail = subDetailData?.data;

  // ---- call reason ----
  const [problemQuery, setProblemQuery] = useState('');
  const debouncedProblemQuery = useDebouncedValue(problemQuery.trim(), 400);
  const [clProblem, setClProblem] = useState('');

  const { data: problemsData } = useQuery({
    queryKey: queryKeys.lookups.callProblems(debouncedProblemQuery),
    queryFn: () => listCallProblems({ query: debouncedProblemQuery || undefined }),
    enabled: debouncedProblemQuery.length > 0,
  });

  // ---- form fields ----
  const [form, setForm] = useState({
    requester: '',
    passport: '',
    tel: '',
    tel1: '',
    req_email: '',
    req_address: '',
    car_num: '',
    address: '',
    city: '',
    grar_address: '',
    grar_city: '',
    num_of_km: '',
    q_notes: '',
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Pre-fill from the selected subscription
  useEffect(() => {
    if (!subDetail) return;
    setForm((f) => ({
      ...f,
      requester: subDetail.full_name || f.requester,
      tel: subDetail.client_tel || f.tel,
      req_email: subDetail.client_email || f.req_email,
      req_address: subDetail.client_address || f.req_address,
      car_num: subDetail.car_number || f.car_num,
    }));
  }, [subDetail]);

  const agentId = subDetail?.agent_id;
  const packageId = subDetail?.pac_id;

  // ---- vehicle + coverage checks (live, once we have enough context) ----
  const { data: vehicleData } = useQuery({
    queryKey: queryKeys.openCall.vehicle(form.car_num, agentId, packageId),
    queryFn: () => getVehicle(form.car_num, { agentId, packageId }),
    enabled: !!form.car_num && form.car_num.length >= 5,
  });

  const { data: coverageData } = useQuery({
    queryKey: queryKeys.openCall.coverage(agentId, packageId, clProblem),
    queryFn: () => getCoverage({ agentId, packageId, reasonId: clProblem }),
    enabled: !!agentId && !!packageId && !!clProblem,
  });

  const create = useMutation({
    mutationFn: () =>
      createAppeal({
        dep: 3,
        qstype: 2,
        sub_num: privateService ? 0 : selectedSub?.sub_num || 0,
        sub_id: privateService ? 0 : selectedSub?.sub_id || 0,
        client_id: privateService ? undefined : subDetail?.client_id,
        requester: form.requester,
        passport: form.passport,
        tel: form.tel,
        tel1: form.tel1,
        req_email: form.req_email,
        req_address: form.req_address,
        car_num: form.car_num,
        cl_problem: Number(clProblem),
        address: form.address,
        city: form.city,
        grar_address: form.grar_address,
        grar_city: form.grar_city,
        num_of_km: form.num_of_km ? Number(form.num_of_km) : 0,
        q_notes: form.q_notes,
        contacts: form.tel ? { tel0: form.tel } : undefined,
      }),
    onSuccess: (result) => {
      toast.success(`קריאה מספר ${result.appeal_id} נפתחה בהצלחה`);
      navigate(createPageUrl(`CallDetails?id=${result.appeal_id}`));
    },
    onError: (error) => toast.error(error?.message || 'שגיאה בפתיחת קריאה'),
  });

  const canSubmit =
    (privateService ? form.passport && form.requester : selectedSub) &&
    form.car_num &&
    clProblem &&
    form.address &&
    form.city;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D]">פתיחת קריאה — גרירה</h1>
          <p className="text-[#6B778C] text-sm">איתור מנוי, בדיקת כיסוי ורישוי, ופרטי הקריאה</p>
        </div>
      </div>

      {/* Subscription lookup */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-[#6B778C]" />
            מנוי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {privateService ? (
            <div className="flex items-center justify-between">
              <Badge className="bg-gray-100 text-gray-700">שירות פרטי (ללא מנוי)</Badge>
              <Button variant="ghost" size="sm" onClick={() => setPrivateService(false)}>
                בטל
              </Button>
            </div>
          ) : selectedSub ? (
            <div className="flex items-start justify-between border rounded-lg p-3 bg-gray-50">
              <div>
                <div className="font-semibold">{selectedSub.full_name}</div>
                <div className="text-xs text-[#6B778C] mt-0.5">
                  מנוי #{selectedSub.sub_num} · {selectedSub.pac_name} · {selectedSub.car_number}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedSub(null);
                  setSubQuery('');
                }}
                aria-label="בטל בחירה"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
                <Input
                  placeholder="חיפוש מנוי לפי שם, ת.ז., טלפון, מספר מנוי או רכב..."
                  value={subQuery}
                  onChange={(e) => setSubQuery(e.target.value)}
                  className="ps-10"
                />
              </div>
              {subSearching && <p className="text-xs text-[#6B778C]">מחפש...</p>}
              {subResults?.data?.length > 0 && (
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {subResults.data.map((r) => (
                    <button
                      key={r.sub_id}
                      type="button"
                      onClick={() => setSelectedSub(r)}
                      className="w-full text-start border rounded-lg p-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-sm">{r.full_name}</div>
                      <div className="text-xs text-[#6B778C]">
                        מנוי #{r.sub_num} · {r.car_number} · {r.client_tel}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="px-0"
                onClick={() => setPrivateService(true)}
              >
                אין מנוי — פתח בשירות פרטי
              </Button>
            </>
          )}

          {privateService && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label>שם הפונה</Label>
                <Input value={form.requester} onChange={set('requester')} />
              </div>
              <div>
                <Label>ת.ז.</Label>
                <Input value={form.passport} onChange={set('passport')} dir="ltr" />
              </div>
              <div>
                <Label>טלפון</Label>
                <Input value={form.tel} onChange={set('tel')} dir="ltr" />
              </div>
              <div>
                <Label>דוא״ל</Label>
                <Input value={form.req_email} onChange={set('req_email')} dir="ltr" />
              </div>
            </div>
          )}

          {subDetail?.products && (
            <div className="text-xs bg-blue-50 text-blue-800 rounded p-2">
              מוצרים מכוסים: {subDetail.products}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4 text-[#6B778C]" />
            רכב
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>מספר רכב</Label>
            <Input value={form.car_num} onChange={set('car_num')} dir="ltr" className="w-48" />
          </div>
          {vehicleData && (
            <div
              className={`flex items-center gap-2 text-sm rounded p-2 ${
                vehicleData.license_valid
                  ? 'bg-green-50 text-green-800'
                  : vehicleData.blocks_cover
                    ? 'bg-red-50 text-red-800'
                    : 'bg-amber-50 text-amber-800'
              }`}
            >
              {vehicleData.license_valid ? (
                <ShieldCheck className="w-4 h-4 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              )}
              {!vehicleData.found
                ? 'לא נמצא רישום רכב במשרד התחבורה'
                : vehicleData.license_valid
                  ? `רישוי בתוקף עד ${vehicleData.tokef_dt}`
                  : `רישוי פג תוקף (${vehicleData.tokef_dt || 'לא ידוע'})${
                      vehicleData.blocks_cover === true
                        ? ' — חוסם כיסוי, שירות בתשלום בלבד'
                        : vehicleData.blocks_cover === false
                          ? ' — לא חוסם כיסוי'
                          : ''
                    }`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Problem / coverage */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#6B778C]" />
            סוג תקלה וכיסוי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>סוג תקלה</Label>
            <Input
              placeholder="חיפוש סוג תקלה..."
              value={problemQuery}
              onChange={(e) => setProblemQuery(e.target.value)}
            />
            {problemsData?.data?.length > 0 && !clProblem && (
              <div className="space-y-1 mt-1 max-h-40 overflow-y-auto">
                {problemsData.data.map((p) => (
                  <button
                    key={p.problem_id}
                    type="button"
                    onClick={() => {
                      setClProblem(String(p.problem_id));
                      setProblemQuery(p.problem);
                    }}
                    className="w-full text-start text-sm border rounded p-1.5 hover:bg-gray-50"
                  >
                    {p.problem}
                  </button>
                ))}
              </div>
            )}
          </div>
          {coverageData && (
            <div
              className={`flex items-center gap-2 text-sm rounded p-2 ${
                coverageData.covered ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {coverageData.covered ? (
                <ShieldCheck className="w-4 h-4 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              )}
              {coverageData.covered ? 'בכיסוי' : `לא בכיסוי (${coverageData.cover_name || ''})`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#6B778C]" />
            מיקום
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>כתובת איסוף</Label>
              <Input value={form.address} onChange={set('address')} />
            </div>
            <div>
              <Label>עיר איסוף</Label>
              <Input value={form.city} onChange={set('city')} />
            </div>
            <div>
              <Label>מרחק (ק״מ)</Label>
              <Input type="number" value={form.num_of_km} onChange={set('num_of_km')} dir="ltr" />
            </div>
            <div className="col-span-2">
              <Label>כתובת יעד (מוסך)</Label>
              <Input value={form.grar_address} onChange={set('grar_address')} />
            </div>
            <div>
              <Label>עיר יעד</Label>
              <Input value={form.grar_city} onChange={set('grar_city')} />
            </div>
          </div>
          <div>
            <Label>הערות</Label>
            <Textarea value={form.q_notes} onChange={set('q_notes')} className="min-h-[70px]" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          ביטול
        </Button>
        <Button
          className="gap-2 bg-[#FF0000] hover:bg-[#CC0000]"
          disabled={!canSubmit || create.isPending}
          onClick={() => create.mutate()}
        >
          <Save className="w-4 h-4" />
          פתח קריאה
        </Button>
      </div>
    </div>
  );
}
