import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CallChat({ callId, currentUserRole, currentUserName }) {
  const [messageText, setMessageText] = useState('');
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch messages. 30s poll keeps the MySQL backend from being hammered when
  // many call windows are open at once; chat is not a real-time medium, and
  // the user can pull-to-refresh if needed.
  const { data: messages = [], isLoading } = useQuery({
    queryKey: queryKeys.callMessages.byCall(callId),
    queryFn: () => base44.entities.Message.filter({ call_id: callId }, 'created_date', 100),
    refetchInterval: 90000,
    staleTime: 15000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      await base44.entities.Message.create({
        call_id: callId,
        sender_name: currentUserName,
        sender_role: currentUserRole,
        message_text: text,
        is_read: false,
      });

      // Also log as an activity for the case history
      try {
        await base44.entities.CaseActivity.create({
          case_id: callId,
          activity_type: 'note',
          description: `הודעה מ-${currentUserName}: ${text}`,
        });
      } catch (e) {
        console.error('Failed to log activity', e);
      }
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: queryKeys.callMessages.byCall(callId) });
      // Scroll to bottom
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  // Scroll to bottom on load/new message
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col h-[400px] bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
      <div className="p-3 bg-[#F5F5F5] border-b border-[#E0E0E0]">
        <h3 className="font-semibold text-sm text-[#212121]">צ'אט קריאה</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-[#9E9E9E]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-[#9E9E9E] text-sm py-8">אין הודעות. התחל שיחה...</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_role === currentUserRole && msg.sender_name === currentUserName;
            const isSystem = msg.sender_role === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                    {msg.message_text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col max-w-[80%]',
                  isMe ? 'self-end items-end' : 'self-start items-start'
                )}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs text-[#616161] font-medium">{msg.sender_name}</span>
                  <span className="text-[10px] text-[#9E9E9E]">
                    {msg.created_date && format(parseISO(msg.created_date), 'HH:mm')}
                  </span>
                </div>
                <div
                  className={cn(
                    'p-3 rounded-lg text-sm',
                    isMe
                      ? 'bg-[#0D47A1] text-white rounded-tl-none'
                      : msg.sender_role === 'operator'
                        ? 'bg-[#E3F2FD] text-[#0D47A1] rounded-tr-none'
                        : 'bg-[#F5F5F5] text-[#212121] rounded-tr-none'
                  )}
                >
                  {msg.message_text}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-[#E0E0E0] bg-white flex gap-2">
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="כתוב הודעה..."
          className="flex-1"
          disabled={sendMessageMutation.isPending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!messageText.trim() || sendMessageMutation.isPending}
          className="bg-[#0D47A1] hover:bg-[#1565C0]"
          aria-label="שלח"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
