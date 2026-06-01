import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Eye,
  Archive,
} from 'lucide-react';

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 1000; // 1 second between batches

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AdminDataCleanup() {
  const queryClient = useQueryClient();
  const [log, setLog] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const abortRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [isClosingStale, setIsClosingStale] = useState(false);
  const [closeStaleResult, setCloseStaleResult] = useState(null);

  const addLog = (msg, type = 'info') => {
    setLog((prev) => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const deleteEntity = async (entityName, entity) => {
    addLog(`מתחיל למחוק ${entityName}...`);
    let items;
    try {
      items = await entity.list('-created_date', 10000);
    } catch (err) {
      addLog(`שגיאה בטעינת ${entityName}: ${err.message}`, 'error');
      return 0;
    }

    addLog(`נמצאו ${items.length} רשומות ${entityName}`);
    if (items.length === 0) return 0;

    let deleted = 0;
    let errors = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      if (abortRef.current) {
        addLog('המחיקה בוטלה על ידי המשתמש', 'warn');
        break;
      }

      const batch = items.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map((item) => entity.delete(item.id)));

      const batchDeleted = results.filter((r) => r.status === 'fulfilled').length;
      const batchErrors = results.filter((r) => r.status === 'rejected').length;
      deleted += batchDeleted;
      errors += batchErrors;

      addLog(
        `${entityName}: נמחקו ${deleted}/${items.length} (${batchErrors > 0 ? `${batchErrors} שגיאות בקבוצה` : 'תקין'})`,
        batchErrors > 0 ? 'warn' : 'info'
      );

      if (i + BATCH_SIZE < items.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    addLog(
      `סיום ${entityName}: נמחקו ${deleted} מתוך ${items.length}${errors > 0 ? `, ${errors} שגיאות` : ''}`,
      errors > 0 ? 'warn' : 'success'
    );
    return deleted;
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    abortRef.current = false;
    setLog([]);
    addLog('=== מתחיל תהליך מחיקת נתונים ===');

    // Delete Cases first (they reference Customers)
    await deleteEntity('Case', base44.entities.Case);
    await sleep(2000);

    if (!abortRef.current) {
      // Then delete Customers
      await deleteEntity('Customer', base44.entities.Customer);
    }

    addLog('=== תהליך המחיקה הסתיים ===', 'success');
    setIsDeleting(false);
  };

  const handleAbort = () => {
    abortRef.current = true;
  };

  const handleSync = async (dryRun = false) => {
    setIsSyncing(true);
    setSyncResult(null);
    addLog(dryRun ? '=== מריץ בדיקת סנכרון (Dry Run) ===' : '=== מריץ סנכרון מלא מנתיד ===');
    try {
      const res = await base44.functions.invoke('syncNatiData', { dry_run: dryRun });
      setSyncResult(res.data);
      if (dryRun) {
        addLog(`סה"כ מנתיד: ${res.data.total_from_nati} קריאות`, 'info');
        addLog(`ספקים ייחודיים: ${res.data.vendors_found}`, 'info');
        addLog(`לקוחות ייחודיים: ${res.data.customers_found}`, 'info');
      } else {
        addLog(
          `ספקים: ${res.data.vendors?.created || 0} חדשים (${res.data.vendors?.existing || 0} קיימים)`,
          'success'
        );
        addLog(
          `לקוחות: ${res.data.customers?.created || 0} חדשים (${res.data.customers?.existing || 0} קיימים)`,
          'success'
        );
        addLog(
          `קריאות: ${res.data.cases?.created || 0} חדשות, ${res.data.cases?.updated || 0} עודכנו, ${res.data.cases?.errors || 0} שגיאות`,
          res.data.cases?.errors > 0 ? 'warn' : 'success'
        );
      }
      addLog('=== הסנכרון הסתיים ===', 'success');
      // Invalidate dashboard/queue/calls caches so the new data appears immediately
      if (!dryRun) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-cases'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-vendors'] }),
          queryClient.invalidateQueries({ queryKey: ['queue-cases'] }),
          queryClient.invalidateQueries({ queryKey: ['calls-list'] }),
        ]);
      }
    } catch (err) {
      addLog(`שגיאת סנכרון: ${err.message}`, 'error');
    }
    setIsSyncing(false);
  };

  const handleCloseStale = async (dryRun = false) => {
    setIsClosingStale(true);
    setCloseStaleResult(null);
    addLog(dryRun ? '=== בדיקת קריאות רפאים (Dry Run) ===' : '=== סוגר קריאות רפאים ===');
    try {
      const res = await base44.functions.invoke('closeStaleNatiCalls', { dry_run: dryRun });
      setCloseStaleResult(res.data);
      if (dryRun) {
        addLog(`פתוחות בנתי: ${res.data.nati_open_count}`, 'info');
        addLog(`קריאות רפאים: ${res.data.stale_calls}`, 'warn');
        addLog(`Cases רפאים: ${res.data.stale_cases}`, 'warn');
      } else {
        addLog(`נסגרו ${res.data.calls_closed} קריאות, ${res.data.cases_closed} cases`, 'success');
        if (res.data.errors > 0) addLog(`שגיאות: ${res.data.errors}`, 'error');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-cases'] }),
          queryClient.invalidateQueries({ queryKey: ['queue-cases'] }),
          queryClient.invalidateQueries({ queryKey: ['calls-list'] }),
        ]);
      }
      addLog('=== סיום ===', 'success');
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      addLog(`שגיאה: ${errMsg}`, 'error');
    }
    setIsClosingStale(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6" dir="rtl">
      {/* Sync Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-blue-700 text-base sm:text-lg">
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            סנכרון נתונים מנתיד
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <p className="text-blue-700 text-sm leading-relaxed">
            סנכרון יעדכן קריאות, ייצור ספקים ולקוחות חדשים, ויקשר ביניהם אוטומטית.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => handleSync(true)}
              disabled={isSyncing}
              className="flex-1 h-12 text-base"
            >
              {isSyncing ? (
                <Loader2 className="w-5 h-5 me-2 animate-spin" />
              ) : (
                <Eye className="w-5 h-5 me-2" />
              )}
              בדיקה (Dry Run)
            </Button>
            <Button
              onClick={() => handleSync(false)}
              disabled={isSyncing}
              className="flex-1 h-12 text-base"
            >
              {isSyncing ? (
                <Loader2 className="w-5 h-5 me-2 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5 me-2" />
              )}
              סנכרון מלא
            </Button>
          </div>
          {syncResult && (
            <div className="bg-white rounded-lg p-3 border text-sm space-y-1">
              <div className="font-medium">תוצאות אחרונות:</div>
              <pre className="text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">
                {JSON.stringify(syncResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close Stale Calls Section */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-amber-700 text-base sm:text-lg">
            <Archive className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            סגירת קריאות רפאים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <p className="text-amber-700 text-sm leading-relaxed">
            מסמן כ&quot;סגור&quot; קריאות שמופיעות אצלנו כפתוחות אבל כבר לא מופיעות ברשימת הפתוחות
            של נתי. רץ בbatches של 20 עם הגנה (לא סוגר אם נתי מחזיר פחות מ-10 פתוחות בטעות).
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => handleCloseStale(true)}
              disabled={isClosingStale}
              className="flex-1 h-12 text-base"
            >
              {isClosingStale ? (
                <Loader2 className="w-5 h-5 me-2 animate-spin" />
              ) : (
                <Eye className="w-5 h-5 me-2" />
              )}
              בדיקה (Dry Run)
            </Button>
            <Button
              onClick={() => handleCloseStale(false)}
              disabled={isClosingStale}
              className="flex-1 h-12 text-base bg-amber-600 hover:bg-amber-700"
            >
              {isClosingStale ? (
                <Loader2 className="w-5 h-5 me-2 animate-spin" />
              ) : (
                <Archive className="w-5 h-5 me-2" />
              )}
              סגור קריאות רפאים
            </Button>
          </div>
          {closeStaleResult && (
            <div className="bg-white rounded-lg p-3 border text-sm space-y-1">
              <div className="font-medium">תוצאות אחרונות:</div>
              <pre className="text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">
                {JSON.stringify(closeStaleResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-red-700 text-base sm:text-lg">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <span>מחיקת כל הנתונים - Cases & Customers</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <p className="text-red-600 font-medium text-sm sm:text-base leading-relaxed">
            פעולה זו תמחק את כל הקריאות (Cases) ואת כל הלקוחות (Customers) מהמערכת. פעולה זו בלתי
            הפיכה!
          </p>

          {!confirmed ? (
            <Button
              variant="destructive"
              onClick={() => setConfirmed(true)}
              className="w-full h-12 text-base"
              disabled={isDeleting}
            >
              <Trash2 className="w-5 h-5 me-2" />
              אני מבין, אני רוצה למחוק
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="flex-1 h-12 text-base"
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 me-2 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5 me-2" />
                )}
                {isDeleting ? 'מוחק...' : 'אישור סופי - מחק הכל!'}
              </Button>
              {isDeleting && (
                <Button variant="outline" onClick={handleAbort} className="h-12 text-base">
                  עצור
                </Button>
              )}
              {!isDeleting && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmed(false)}
                  className="h-12 text-base"
                >
                  ביטול
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">יומן מחיקה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-1">
              {log.map((entry, i) => (
                <div
                  key={i}
                  className={
                    entry.type === 'error'
                      ? 'text-red-400'
                      : entry.type === 'warn'
                        ? 'text-yellow-400'
                        : entry.type === 'success'
                          ? 'text-green-400'
                          : 'text-gray-300'
                  }
                >
                  <span className="text-gray-500">[{entry.time}]</span> {entry.msg}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
