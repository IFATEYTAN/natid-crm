import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

export default function ChangePriorityDialog({ open, onOpenChange, queueItem }) {
  const queryClient = useQueryClient();
  const [priority, setPriority] = useState(queueItem?.priority_score || 50);

  React.useEffect(() => {
    if (queueItem) setPriority(queueItem.priority_score || 50);
  }, [queueItem]);

  const mutation = useMutation({
    mutationFn: async () => {
      await base44.entities.WorkQueue.update(queueItem.id, {
        priority_score: priority,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workQueue'] });
      onOpenChange(false);
    },
  });

  const getPriorityLabel = (score) => {
    if (score >= 80) return { label: 'קריטי', color: 'text-red-600' };
    if (score >= 60) return { label: 'גבוה', color: 'text-orange-600' };
    if (score >= 40) return { label: 'בינוני', color: 'text-yellow-600' };
    return { label: 'נמוך', color: 'text-gray-600' };
  };

  const { label, color } = getPriorityLabel(priority);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>שינוי עדיפות</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {queueItem && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="font-medium">{queueItem.call?.call_number}</div>
              <div className="text-gray-500">{queueItem.call?.customer_name}</div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-gray-600">ציון עדיפות</label>
              <span className={`text-lg font-bold ${color}`}>{priority} — {label}</span>
            </div>
            <Slider
              value={[priority]}
              onValueChange={([v]) => setPriority(v)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>נמוך (0)</span>
              <span>קריטי (100)</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            עדכן
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}