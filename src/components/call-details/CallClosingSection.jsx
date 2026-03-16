/**
 * CallClosingSection.jsx
 * -------------------------------------------------------
 * מודול סגירת קריאה — כולל:
 * 1. חישוב סקרס (משימה 333) — ציון איכות לקריאה
 * 2. צ'קבוקס BOY (משימה 336) — סימון "בוי" על כל תפעול
 * 3. הודעת הרגעה ללקוח לשירות עתידי (משימה 252)
 * -------------------------------------------------------
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  CheckSquare,
  MessageCircle,
  Award,
  AlertCircle,
  Clock,
  Send,
  Loader2,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { showToast } from '@/components/ui/FeedbackToast';

// ─── Score calculation logic (משימה 333) ─────────────────────────────────────

/**
 * Calculates a quality score (0–100) for a call based on multiple criteria.
 * Returns: { score, breakdown, grade }
 */
function calculateCallScore(call) {
  const breakdown = [];
  let total = 0;

  // 1. SLA compliance (25 points)
  if (call?.sla_met === true) {
    breakdown.push({ label: 'עמידה ב-SLA', points: 25, max: 25, ok: true });
    total += 25;
  } else if (call?.sla_met === false) {
    breakdown.push({ label: 'חריגה מ-SLA', points: 0, max: 25, ok: false });
  } else {
    // Calculate from timestamps if sla_met not set
    const created = call?.created_date ? new Date(call.created_date) : null;
    const completed = call?.service_end_time ? new Date(call.service_end_time) : null;
    const slaTarget = call?.sla_target || 60; // minutes
    if (created && completed) {
      const diffMins = (completed - created) / 60000;
      const slaOk = diffMins <= slaTarget;
      const pts = slaOk ? 25 : Math.max(0, Math.round(25 * (1 - (diffMins - slaTarget) / slaTarget)));
      breakdown.push({ label: `זמן טיפול (${Math.round(diffMins)} דק' מתוך ${slaTarget})`, points: pts, max: 25, ok: slaOk });
      total += pts;
    }
  }

  // 2. Vendor assigned (15 points)
  if (call?.assigned_vendor_id || call?.assigned_vendor_name) {
    breakdown.push({ label: 'ספק שובץ', points: 15, max: 15, ok: true });
    total += 15;
  } else {
    breakdown.push({ label: 'ספק לא שובץ', points: 0, max: 15, ok: false });
  }

  // 3. Customer feedback (20 points)
  const feedback = call?.customer_satisfaction_score;
  if (feedback !== undefined && feedback !== null) {
    const pts = Math.round((feedback / 5) * 20);
    breakdown.push({ label: `שביעות רצון לקוח (${feedback}/5)`, points: pts, max: 20, ok: feedback >= 4 });
    total += pts;
  }

  // 4. Call questionnaire completed (10 points)
  if (call?.questionnaire_engine_starts !== undefined || call?.questionnaire_answers) {
    breakdown.push({ label: 'שאלון לקוח מולא', points: 10, max: 10, ok: true });
    total += 10;
  }

  // 5. No exceptions / complications (10 points)
  const hasComplications = call?.is_in_parking || call?.is_dirt_road || call?.is_toll_road;
  if (!hasComplications) {
    breakdown.push({ label: 'ללא חריגים מיוחדים', points: 10, max: 10, ok: true });
    total += 10;
  } else {
    breakdown.push({ label: 'קריאה עם חריגים', points: 5, max: 10, ok: false });
    total += 5;
  }

  // 6. BOY marked (10 points)
  if (call?.boy_marked === true) {
    breakdown.push({ label: 'בוי (BOY) סומן', points: 10, max: 10, ok: true });
    total += 10;
  }

  // 7. Call notes / documentation (10 points)
  if (call?.internal_notes?.length > 10 || call?.closing_notes?.length > 10) {
    breakdown.push({ label: 'תיעוד מלא', points: 10, max: 10, ok: true });
    total += 10;
  }

  // Grade
  let grade = 'F';
  if (total >= 90) grade = 'A+';
  else if (total >= 80) grade = 'A';
  else if (total >= 70) grade = 'B';
  else if (total >= 60) grade = 'C';
  else if (total >= 50) grade = 'D';

  return { score: Math.min(100, total), breakdown, grade };
}

const gradeColors = {
  'A+': 'bg-green-100 text-green-800 border-green-300',
  A: 'bg-green-100 text-green-700 border-green-200',
  B: 'bg-blue-100 text-blue-700 border-blue-200',
  C: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  D: 'bg-orange-100 text-orange-700 border-orange-200',
  F: 'bg-red-100 text-red-700 border-red-200',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CallClosingSection({ call, callId, currentUser }) {
  const queryClient = useQueryClient();
  const [boyMarked, setBoyMarked] = useState(call?.boy_marked || false);
  const [closingNotes, setClosingNotes] = useState(call?.closing_notes || '');
  const [saving, setSaving] = useState(false);
  const [sendingReassurance, setSendingReassurance] = useState(false);
  const [reassuranceSent, setReassuranceSent] = useState(false);
  const [scheduledTimeDisplay, setScheduledTimeDisplay] = useState('');

  const isFutureService = call?.call_status === 'future_service';
  const isCompleted = call?.call_status === 'completed';

  // Calculate score
  const scoreData = useMemo(() => {
    const callWithBoy = { ...call, boy_marked: boyMarked, closing_notes: closingNotes };
    return calculateCallScore(callWithBoy);
  }, [call, boyMarked, closingNotes]);

  const handleSaveClosing = async () => {
    setSaving(true);
    try {
      await base44.entities.Call.update(callId, {
        boy_marked: boyMarked,
        closing_notes: closingNotes,
        call_score: scoreData.score,
        call_grade: scoreData.grade,
      });
      await base44.entities.CallHistory.create({
        call_id: callId,
        call_number: call?.call_number,
        change_type: 'closing',
        new_value: `ציון: ${scoreData.score} (${scoreData.grade})${boyMarked ? ' | BOY ✓' : ''}`,
        notes: closingNotes || 'פרטי סגירה עודכנו',
        changed_by: currentUser?.full_name || currentUser?.email || 'מוקדן',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(callId) });
      showToast.success('פרטי סגירה נשמרו');
    } catch (err) {
      showToast.error('שגיאה בשמירת פרטי סגירה');
    } finally {
      setSaving(false);
    }
  };

  const handleSendReassurance = async () => {
    setSendingReassurance(true);
    try {
      const res = await base44.functions.invoke('sendWhatsApp', {
        type: 'customer_reassurance',
        call_id: callId,
        scheduled_time: scheduledTimeDisplay,
      });
      if (res?.data?.success) {
        setReassuranceSent(true);
        showToast.success('הודעת הרגעה נשלחה ללקוח בהצלחה');
      } else {
        showToast.error('שגיאה בשליחת הודעת הרגעה');
      }
    } catch {
      showToast.error('שגיאה בשליחת הודעת הרגעה');
    } finally {
      setSendingReassurance(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Future Service Reassurance (משימה 252) ── */}
      {isFutureService && (
        <Card className="border-violet-200 bg-violet-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-600" />
              הודעת הרגעה ללקוח — שירות עתידי (משימה 252)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-violet-700">
              שלח ללקוח הודעת WhatsApp מרגיעה שמאשרת את קליטת הקריאה ומציינת את מועד השירות המתוכנן.
            </p>
            <div>
              <Label className="text-sm">מועד שירות מתוכנן (לציון בהודעה)</Label>
              <Input
                value={scheduledTimeDisplay}
                onChange={(e) => setScheduledTimeDisplay(e.target.value)}
                placeholder="לדוגמה: יום ג' 18/3 בין 10:00-12:00"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleSendReassurance}
              disabled={sendingReassurance || reassuranceSent}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              {sendingReassurance ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {reassuranceSent ? 'הודעה נשלחה ✓' : 'שלח הודעת הרגעה ללקוח'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Score Card (משימה 333) ── */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            ציון איכות קריאה — סקרס (משימה 333)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score display */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-700">{scoreData.score}</div>
              <div className="text-xs text-gray-500">מתוך 100</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-lg px-3 py-1 border ${gradeColors[scoreData.grade]}`}>
                  {scoreData.grade}
                </Badge>
                <span className="text-sm text-gray-600">
                  {scoreData.grade === 'A+' ? 'מצוין' :
                   scoreData.grade === 'A' ? 'טוב מאוד' :
                   scoreData.grade === 'B' ? 'טוב' :
                   scoreData.grade === 'C' ? 'בינוני' :
                   scoreData.grade === 'D' ? 'חלש' : 'לא עומד בתקן'}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    scoreData.score >= 80 ? 'bg-green-500' :
                    scoreData.score >= 60 ? 'bg-blue-500' :
                    scoreData.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${scoreData.score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="space-y-1">
            {scoreData.breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1 ${item.ok ? 'text-gray-700' : 'text-red-500'}`}>
                  {item.ok ? '✓' : '✗'} {item.label}
                </span>
                <span className={`font-medium ${item.ok ? 'text-green-700' : 'text-red-500'}`}>
                  {item.points}/{item.max}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── BOY Checkbox (משימה 336) ── */}
      <Card className={`border-2 transition-colors ${boyMarked ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="boy_marked"
              checked={boyMarked}
              onChange={(e) => setBoyMarked(e.target.checked)}
              className="w-5 h-5 accent-amber-500"
            />
            <div>
              <Label
                htmlFor="boy_marked"
                className={`cursor-pointer font-bold text-base flex items-center gap-2 ${boyMarked ? 'text-amber-700' : 'text-gray-700'}`}
              >
                <CheckSquare className={`w-5 h-5 ${boyMarked ? 'text-amber-600' : 'text-gray-400'}`} />
                BOY — בוי (משימה 336)
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                סמן "בוי" לאחר אישור שכל שלבי התפעול בוצעו כנדרש: שיבוץ ספק, עדכון לקוח, תיעוד מלא.
              </p>
            </div>
            {boyMarked && (
              <Badge className="mr-auto bg-amber-100 text-amber-800 border-amber-300">
                ✓ BOY
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Closing Notes ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">הערות סגירה</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
            rows={3}
            placeholder="הערות לסגירת הקריאה, סיכום הטיפול..."
          />
        </CardContent>
      </Card>

      {/* ── Save Button ── */}
      <Button
        onClick={handleSaveClosing}
        disabled={saving}
        className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
        {saving ? 'שומר...' : 'שמור ציון ופרטי סגירה'}
      </Button>
    </div>
  );
}
