import React from 'react';
import { Navigation, CheckCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VendorCallActionBar({
  callStatus,
  onStatusUpdate,
  onSignature,
  onComplete,
  isPending,
}) {
  if (callStatus === 'completed' || callStatus === 'cancelled') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3">
      {callStatus === 'assigned' || callStatus === 'assigning' ? (
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700 h-12"
          onClick={() => onStatusUpdate('vendor_enroute')}
          disabled={isPending}
        >
          <Navigation className="w-5 h-5 ml-2" />
          יצאתי לדרך
        </Button>
      ) : callStatus === 'vendor_enroute' ? (
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700 h-12"
          onClick={() => onStatusUpdate('in_progress')}
          disabled={isPending}
        >
          <CheckCircle className="w-5 h-5 ml-2" />
          הגעתי למקום
        </Button>
      ) : callStatus === 'in_progress' ? (
        <>
          <Button variant="outline" className="flex-1 h-12" onClick={onSignature}>
            <Pencil className="w-5 h-5 ml-2" />
            חתימת לקוח
          </Button>
          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-600 h-12"
            onClick={onComplete}
            disabled={isPending}
          >
            <CheckCircle className="w-5 h-5 ml-2" />
            סיים קריאה
          </Button>
        </>
      ) : null}
    </div>
  );
}
