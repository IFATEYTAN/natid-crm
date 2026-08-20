import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { History, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/lib/queryKeys';
import { listAppealEvents, createAppealEvent } from '@/lib/srvApi';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';

// Historical PHP tracking notes contain inline HTML (<b style="color:red">,
// <br>, ...) meant for its own server-rendered page, and this endpoint's
// own POST stores whatever text a user submits verbatim. Rendering that as
// HTML would be a stored-XSS hole (a note containing a <script> tag would
// execute), so this strips all tags down to plain text instead — same
// approach as AppealInfoView.jsx's `instructions` field.
function stripHtml(value) {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * History feed + add-note form for a single appeal, backed by srv's
 * GET/POST /appeals/{id}/events (port of f_callMngEvents_list()/
 * add_tracking()). Phase 2 of the dispatcher rebuild plan.
 */
export default function AppealEventsSection({ appealId }) {
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('calls', 'edit');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.appeals.events(appealId),
    queryFn: () => listAppealEvents(appealId),
    enabled: !!appealId,
  });
  const events = data?.data ?? [];

  const addNote = useMutation({
    mutationFn: () => createAppealEvent(appealId, note.trim()),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: queryKeys.appeals.events(appealId) });
      toast.success('ההערה נוספה');
    },
    onError: (error) => toast.error(error?.message || 'שגיאה בהוספת הערה'),
  });

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-[#6B778C]" />
          היסטוריה והערות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <PermissionGuard category="calls" permission="edit">
          <div className="flex gap-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="הוסף הערה..."
              className="min-h-[60px]"
              disabled={!canEdit || addNote.isPending}
            />
            <Button
              size="icon"
              className="shrink-0 self-end"
              onClick={() => note.trim() && addNote.mutate()}
              disabled={!canEdit || !note.trim() || addNote.isPending}
              aria-label="שלח הערה"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </PermissionGuard>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-[#6B778C] text-center py-4">אין רשומות היסטוריה</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((e) => (
              <div key={e.event_id} className="border-b border-gray-50 last:border-0 pb-2">
                <div className="text-sm whitespace-pre-line">{stripHtml(e.call_note)}</div>
                <div className="text-xs text-[#6B778C] mt-1">
                  {e.dispatcher} · {e.event_date}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
