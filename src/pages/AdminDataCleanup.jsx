import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 1000; // 1 second between batches

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AdminDataCleanup() {
  const [log, setLog] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const abortRef = useRef(false);

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

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6" dir="rtl">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-6 h-6" />
            מחיקת כל הנתונים - Cases & Customers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-600 font-medium">
            פעולה זו תמחק את כל הקריאות (Cases) ואת כל הלקוחות (Customers) מהמערכת. פעולה זו בלתי
            הפיכה!
          </p>

          {!confirmed ? (
            <Button
              variant="destructive"
              onClick={() => setConfirmed(true)}
              className="w-full"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 me-2" />
              אני מבין, אני רוצה למחוק
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 me-2" />
                )}
                {isDeleting ? 'מוחק...' : 'אישור סופי - מחק הכל!'}
              </Button>
              {isDeleting && (
                <Button variant="outline" onClick={handleAbort}>
                  עצור
                </Button>
              )}
              {!isDeleting && (
                <Button variant="outline" onClick={() => setConfirmed(false)}>
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
