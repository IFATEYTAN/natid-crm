import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { User } from 'lucide-react';

export default function AssignAgentDialog({ open, onOpenChange, queueItem, mode = 'assign' }) {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState('');
  const [notes, setNotes] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: () => base44.entities.User.list(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const user = users.find((u) => u.email === selectedAgent);
      await base44.entities.WorkQueue.update(queueItem.id, {
        assigned_to_agent: selectedAgent,
        queue_status: 'assigned_to_agent',
        assigned_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
      onOpenChange(false);
      setSelectedAgent('');
      setNotes('');
    },
  });

  const title = mode === 'transfer' ? 'העברת משימה לנציג אחר' : 'שיבוץ משימה לנציג';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {queueItem && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="font-medium">
                {queueItem.call?.call_number || `#${queueItem.call_id?.slice(-6)}`}
              </div>
              <div className="text-gray-500">
                {queueItem.call?.customer_name} — {queueItem.call?.pickup_location_address}
              </div>
              {mode === 'transfer' && queueItem.assigned_to_agent && (
                <div className="text-xs text-gray-400 mt-1">
                  נציג נוכחי: {queueItem.assigned_to_agent}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">בחר נציג</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="בחר נציג..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.email}>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {u.full_name || u.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">הערות (אופציונלי)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="סיבת העברה / הערה..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!selectedAgent}
            isLoading={mutation.isPending}
          >
            {mode === 'transfer' ? 'העבר' : 'שבץ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
