import React from 'react';
import { User, Car, MapPin, Truck, Shield, FileText, Info, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEPARTMENT_LABELS } from '@/config/appealLabels';

// PHP stores a few fields (mainly `instructions`) as inline-styled HTML meant
// for its own server-rendered page. The SPA renders its own markup, so this
// strips tags down to plain text instead of injecting raw HTML.
function stripHtml(value) {
  if (!value) return null;
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

const InfoField = ({ label, value, dir }) => (
  <div>
    <Label className="text-xs text-[#6B778C]">{label}</Label>
    <p className="font-medium text-right whitespace-pre-line" dir={dir}>
      {value || value === 0 ? value : '-'}
    </p>
  </div>
);

const SectionCard = ({ icon: Icon, title, children }) => (
  <Card className="bg-white">
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#6B778C]" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">{children}</CardContent>
  </Card>
);

/**
 * Read-only display of a single appeal, sourced from srv GET /appeals/{id}
 * (real Nati fields — see srv.natid.co.il CLAUDE.md). Write actions (status
 * change, assign supplier, close, edit) come back once Phase 2 of the
 * dispatcher rebuild ports the corresponding PATCH/POST endpoints.
 */
export default function AppealInfoView({ appeal, questions = [] }) {
  if (!appeal) return null;

  const isTow = appeal.department_id === 3;
  const contacts = [appeal.tel0, appeal.tel2, appeal.tel3, appeal.tel4].filter(Boolean);
  const names = [appeal.name1, appeal.name2, appeal.name3, appeal.name4].filter(Boolean);

  return (
    <div className="space-y-4">
      <SectionCard icon={Info} title="פרטי קריאה כלליים">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoField label="קוד קריאה" value={appeal.appeal_id} />
          <InfoField
            label="מחלקה"
            value={DEPARTMENT_LABELS[String(appeal.department_id)] || appeal.department_id}
          />
          <InfoField label="תאריך פתיחה" value={appeal.date_added} />
          <InfoField label="מוקדן" value={appeal.user_name} />
          <InfoField label="מספר מנוי" value={appeal.sub_num || 'שירות פרטי'} dir="ltr" />
          {appeal.sub_sequence && <InfoField label="ותק מנוי" value={appeal.sub_sequence} />}
          {appeal.reason_cover_name && (
            <InfoField label="סטטוס כיסוי" value={appeal.reason_cover_name} />
          )}
          {appeal.products && <InfoField label="מוצרים מכוסים" value={appeal.products} />}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard icon={User} title="פרטי פונה">
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="שם פונה" value={appeal.requester} />
            <InfoField label="ת.ז." value={appeal.passport} dir="ltr" />
            <InfoField label="טלפון ראשי" value={appeal.tel} dir="ltr" />
            <InfoField label="טלפון נוסף" value={appeal.tel1} dir="ltr" />
            {contacts.length > 0 && (
              <InfoField label="טלפונים נוספים" value={contacts.join(', ')} dir="ltr" />
            )}
            {names.length > 0 && <InfoField label="אנשי קשר נוספים" value={names.join(', ')} />}
            <InfoField label="דוא״ל" value={appeal.req_email} dir="ltr" />
            <InfoField label="כתובת פונה" value={appeal.req_address} />
          </div>
        </SectionCard>

        <SectionCard icon={Car} title="פרטי רכב">
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="מספר רכב" value={appeal.car_num} dir="ltr" />
            <InfoField label="דגם" value={appeal.car_type_name} />
            <InfoField label="שם רכב" value={appeal.car_name} />
            <InfoField label="סוג דלק" value={appeal.car_fuel_type} />
            <InfoField label="קטגוריית רכב" value={appeal.vehicle_class} />
            <InfoField label="מיקום מפתח" value={appeal.key_location} />
            <InfoField label="קוד PIN" value={appeal.car_pin} dir="ltr" />
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} title="מיקום">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <InfoField label="כתובת" value={appeal.address} />
            </div>
            <InfoField label="עיר" value={appeal.city_name} />
            <InfoField label="אזור" value={appeal.area_name} />
          </div>
          {isTow && (appeal.grar_address || appeal.grar_city_name) && (
            <div className="border-t pt-3 mt-1">
              <Label className="text-xs text-[#6B778C] font-semibold">יעד גרירה:</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="col-span-2">
                  <InfoField label="כתובת יעד" value={appeal.grar_address} />
                </div>
                <InfoField label="עיר" value={appeal.grar_city_name} />
                <InfoField label="אזור" value={appeal.grar_area_name} />
              </div>
            </div>
          )}
          {(appeal.store_address || appeal.store_city_name) && (
            <div className="border-t pt-3 mt-1">
              <Label className="text-xs text-[#6B778C] font-semibold">מיקום אחסנה:</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="col-span-2">
                  <InfoField label="כתובת" value={appeal.store_address} />
                </div>
                <InfoField label="עיר" value={appeal.store_city_name} />
                <InfoField label="אזור" value={appeal.store_area_name} />
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard icon={Truck} title="ספק משובץ">
          {appeal.supplier_name ? (
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="נותן השירות" value={appeal.supplier_name} />
              <InfoField label="אזור ספק" value={appeal.supp_region_name} />
              <InfoField label="שובץ ב-" value={appeal.supplier_assigned_date} />
              {appeal.claim_total_cost != null && (
                <InfoField
                  label="עלות"
                  value={`₪${Number(appeal.claim_total_cost).toLocaleString()}`}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-[#6B778C]">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>טרם שובץ ספק</p>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard icon={Shield} title="תקלה והוראות">
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="סוג תקלה" value={appeal.cl_problem_name} />
          {appeal.diagnose && <InfoField label="אבחון" value={appeal.diagnose} />}
        </div>
        {appeal.q_notes && (
          <div>
            <Label className="text-xs text-[#6B778C]">הערות</Label>
            <p className="text-sm bg-gray-50 p-2 rounded mt-1 whitespace-pre-line">
              {appeal.q_notes}
            </p>
          </div>
        )}
        {stripHtml(appeal.instructions) && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
            <Label className="text-xs text-amber-700 font-medium">הוראות תפעול:</Label>
            <p className="text-sm text-amber-800 mt-1 whitespace-pre-line">
              {stripHtml(appeal.instructions)}
            </p>
          </div>
        )}
        {appeal.finish_note && (
          <div>
            <Label className="text-xs text-[#6B778C]">הערת סיום</Label>
            <p className="text-sm bg-gray-50 p-2 rounded mt-1 whitespace-pre-line">
              {appeal.finish_note}
            </p>
          </div>
        )}
      </SectionCard>

      {questions.length > 0 && (
        <SectionCard icon={CheckCircle} title="שאלון">
          <div className="space-y-1">
            {questions.map((q, idx) => (
              <div
                key={q.question_num ?? idx}
                className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0"
              >
                <span className="text-sm text-[#6B778C]">
                  <span className="text-xs text-gray-400 ms-1">#{idx + 1}</span>
                  {q.question}
                </span>
                <span className="text-sm font-medium">{q.answer ?? '-'}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {appeal.inspected === 1 && (
        <SectionCard icon={FileText} title="בקרת איכות">
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="נבדק" value="כן" />
            <InfoField label="אושר ע״י בקר" value={appeal.inspector_approves ? 'כן' : 'לא'} />
            {appeal.inspector_name && <InfoField label="בקר" value={appeal.inspector_name} />}
          </div>
        </SectionCard>
      )}

      {appeal.vip === 1 && <Badge className="bg-amber-100 text-amber-800">לקוח VIP</Badge>}
    </div>
  );
}
