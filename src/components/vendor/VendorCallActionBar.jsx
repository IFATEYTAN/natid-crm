import React from 'react';
import { Navigation, CheckCircle, Pencil, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VendorCallActionBar({
  callStatus,
  onStatusUpdate,
  onSignature,
  onComplete,
  onProblem,
  isPending,
}) {
  if (callStatus === 'completed' || callStatus === 'cancelled') return null;

  // A vendor can report a problem once they're actively handling the call
  const canReportProblem =
    onProblem && ['vendor_enroute', 'vendor_arrived', 'in_progress'].includes(callStatus);

  return (
    <div className="fixed bottom-0 start-0 end-0 bg-white border-t p-4 flex flex-col gap-2">
      <div className="flex gap-3">
        {callStatus === 'assigned' || callStatus === 'assigning' ? (
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-12"
            onClick={() => onStatusUpdate('vendor_enroute')}
            disabled={isPending}
          >
            <Navigation className="w-5 h-5 ms-2" />
            יצאתי לדרך
          </Button>
        ) : callStatus === 'vendor_enroute' ? (
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 h-12"
            onClick={() => onStatusUpdate('in_progress')}
            disabled={isPending}
          >
            <CheckCircle className="w-5 h-5 ms-2" />
            הגעתי למקום
          </Button>
        ) : callStatus === 'in_progress' ? (
          <>
            <Button variant="outline" className="flex-1 h-12" onClick={onSignature}>
              <Pencil className="w-5 h-5 ms-2" />
              חתימת לקוח
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 h-12"
              onClick={onComplete}
              disabled={isPending}
            >
              <CheckCircle className="w-5 h-5 ms-2" />
              סיים קריאה
            </Button>
          </>
        ) : null}
      </div>
      {canReportProblem && (
        <Button
          variant="ghost"
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 h-10"
          onClick={onProblem}
          disabled={isPending}
        >
          <AlertTriangle className="w-4 h-4 ms-2" />
          בעיה בטיפול / החזרת קריאה
        </Button>
      )}
    </div>
  );
}
