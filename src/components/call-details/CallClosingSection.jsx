/**
 * CallClosingSection.jsx
 * -------------------------------------------------------
 * מודול סגירת קריאה — כולל:
 * 1. חישוב סרק (משימה 333) — כמה ק"מ ריקים הספק נסע (מנקודת יציאה לנקודת הרכב)
 * 2. צ'קבוקס BOY (משימה 336) — כלי בקרה: בקר מסמן שבדק את הקריאה
 * 3. הודעת הרגעה ללקוח לשירות עתידי (משימה 252)
 *
 * הבהרות לפי דורית נתי גרופ (17.3.2026):
 * - "סרק" = כמה ק"מ ריקים הספק רוצה מנקודת יציאתו לנקודת הרכב (אין קשר לציון איכות)
 * - "BOY" = כלי בקרה — מי שבודק קריאות מסמן שבדק אותה (לא בסגירת קריאה)
 * -------------------------------------------------------
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  MessageCircle,
  Clock,
  Send,
  Loader2,
  Route,
  MapPin,
  Eye,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { showToast } from '@/components/ui/FeedbackToast';

// ─── Component ────────────────────────────────────────────────────────────────

export default function CallClosingSection({ call, callId, currentUser }) {
  const queryClient = useQueryClient();

  // ── סרק (משימה 333) — ק"מ ריקים ──
  const [sarakKm, setSarakKm] = useState(call?.sarak_km ? String(call.sarak_km) : '');
  const [sarakFromAddress, setSarakFromAddress] = useState(call?.sarak_from_address || '');
  const [sarakNotes, setSarakNotes] = useState(call?.sarak_notes || '');

  // ── BOY (משימה 336) — כלי בקרה ──
  const [boyMarked, setBoyMarked] = useState(call?.boy_marked || false);
  const [boyReviewedBy, setBoyReviewedBy] = useState(call?.boy_reviewed_by || '');

  // ── הערות סגירה ──
  const [closingNotes, setClosingNotes] = useState(call?.closing_notes || '');
  const [saving, setSaving] = useState(false);

  // ── הרגעה לשירות עתידי (משימה 252) ──
  const [sendingReassurance, setSendingReassurance] = useState(false);
  const [reassuranceSent, setReassuranceSent] = useState(false);
  const [scheduledTimeDisplay, setScheduledTimeDisplay] = useState('');

  const isFutureService = call?.call_status === 'future_service';

  const handleSaveClosing = async () => {
    setSaving(true);
    try {
      const updates = {
        closing_notes: closingNotes,
        // סרק
        sarak_km: sarakKm ? parseFloat(sarakKm) : null,
        sarak_from_address: sarakFromAddress,
        sarak_notes: sarakNotes,
        // BOY
        boy_marked: boyMarked,
        boy_reviewed_by: boyMarked ? (boyReviewedBy || currentUser?.full_name || 'בקר') : null,
        boy_reviewed_at: boyMarked ? new Date().toISOString() : null,
      };

      await base44.entities.Call.update(callId, updates);

      await base44.entities.CallHistory.create({
        call_id: callId,
        call_number: call?.call_number,
        change_type: 'closing',
        new_value: [
          sarakKm ? `סרק: ${sarakKm} ק"מ` : '',
          boyMarked ? `BOY ✓ (${boyReviewedBy || currentUser?.full_name || 'בקר'})` : '',
        ].filter(Boolean).join(' | ') || 'פרטי סגירה עודכנו',
        notes: closingNotes || '',
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

      {/* ── סרק — ק"מ ריקים (משימה 333) ── */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="w-4 h-4 text-blue-600" />
            סרק — ק"מ ריקים (משימה 333)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            כמה ק"מ ריקים נסע הספק מנקודת יציאתו עד לנקודת הרכב (סרק).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">כתובת יציאת הספק</Label>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <Input
                  value={sarakFromAddress}
                  onChange={(e) => setSarakFromAddress(e.target.value)}
                  placeholder="מאיפה יצא הספק?"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">ק"מ סרק</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={sarakKm}
                  onChange={(e) => setSarakKm(e.target.value)}
                  placeholder="0"
                  className="w-28"
                />
                <span className="text-sm text-gray-500">ק"מ</span>
                {sarakKm && parseFloat(sarakKm) > 0 && (
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    {parseFloat(sarakKm)} ק"מ סרק
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div>
            <Label className="text-sm">הערות סרק</Label>
            <Input
              value={sarakNotes}
              onChange={(e) => setSarakNotes(e.target.value)}
              placeholder="הערות נוספות לגבי הסרק..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── BOY — כלי בקרה (משימה 336) ── */}
      <Card className={`border-2 transition-colors ${boyMarked ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600" />
            BOY — בקרת קריאה (משימה 336)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            כלי בקרה: הבקר מסמן שבדק את הקריאה ואישר שכל שלבי התפעול בוצעו כנדרש.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="boy_marked"
              checked={boyMarked}
              onChange={(e) => setBoyMarked(e.target.checked)}
              className="w-5 h-5 accent-amber-500"
            />
            <Label
              htmlFor="boy_marked"
              className={`cursor-pointer font-bold text-base flex items-center gap-2 ${boyMarked ? 'text-amber-700' : 'text-gray-700'}`}
            >
              <CheckSquare className={`w-5 h-5 ${boyMarked ? 'text-amber-600' : 'text-gray-400'}`} />
              סמן BOY — קריאה נבדקה ואושרה
            </Label>
            {boyMarked && (
              <Badge className="mr-auto bg-amber-100 text-amber-800 border-amber-300">
                ✓ BOY
              </Badge>
            )}
          </div>
          {boyMarked && (
            <div>
              <Label className="text-sm">שם הבקר</Label>
              <Input
                value={boyReviewedBy}
                onChange={(e) => setBoyReviewedBy(e.target.value)}
                placeholder={currentUser?.full_name || 'שם הבקר...'}
                className="mt-1 max-w-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── הערות סגירה ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            הערות סגירה
          </CardTitle>
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

      {/* ── כפתור שמירה ── */}
      <Button
        onClick={handleSaveClosing}
        disabled={saving}
        className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
        {saving ? 'שומר...' : 'שמור פרטי סגירה'}
      </Button>
    </div>
  );
}
