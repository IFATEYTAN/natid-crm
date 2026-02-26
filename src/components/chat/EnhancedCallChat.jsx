import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send,
  Loader2,
  Paperclip,
  X,
  CheckCheck,
  User,
  Truck,
  Headset,
  Bot,
  Download,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const roleIcons = {
  operator: Headset,
  vendor: Truck,
  customer: User,
  system: Bot,
};

const roleColors = {
  operator: 'bg-blue-500',
  vendor: 'bg-green-500',
  customer: 'bg-purple-500',
  system: 'bg-gray-400',
};

const roleLabels = {
  operator: 'מוקדן',
  vendor: 'ספק',
  customer: 'לקוח',
  system: 'מערכת',
};

export default function EnhancedCallChat({
  callId,
  currentUserRole,
  currentUserName,
  showParticipants = true,
  height = '500px',
}) {
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch messages with real-time subscription
  const { data: messages = [], isLoading } = useQuery({
    queryKey: queryKeys.callMessages.byCall(callId),
    queryFn: () => base44.entities.Message.filter({ call_id: callId }, 'created_date', 200),
    refetchInterval: 3000,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!callId) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.call_id === callId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.callMessages.byCall(callId) });
      }
    });

    return () => unsubscribe();
  }, [callId, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, fileUrl, fileName, messageType }) => {
      await base44.entities.Message.create({
        call_id: callId,
        sender_name: currentUserName,
        sender_role: currentUserRole,
        message_text: text,
        message_type: messageType || 'text',
        file_url: fileUrl || null,
        file_name: fileName || null,
        is_read: false,
        read_by: [],
      });
    },
    onSuccess: () => {
      setMessageText('');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.callMessages.byCall(callId) });
    },
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('הקובץ גדול מדי. מקסימום 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !selectedFile) return;

    let fileUrl = null;
    let fileName = null;
    let messageType = 'text';

    if (selectedFile) {
      setIsUploading(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file: selectedFile });
        fileUrl = result.file_url;
        fileName = selectedFile.name;
        messageType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
      } catch (error) {
        toast.error('שגיאה בהעלאת הקובץ');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    sendMessageMutation.mutate({
      text: messageText || (messageType === 'image' ? '📷 תמונה' : `📎 ${fileName}`),
      fileUrl,
      fileName,
      messageType,
    });
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Get unique participants
  const participants = [...new Set(messages.map((m) => m.sender_role))].filter(
    (r) => r !== 'system'
  );

  return (
    <div
      className="flex flex-col bg-white border border-[#e5e7eb] rounded-lg overflow-hidden"
      style={{ height }}
    >
      {/* Header */}
      <div className="p-3 bg-[#f3f4f6] border-b border-[#e5e7eb] flex items-center justify-between">
        <h3 className="font-semibold text-sm text-[#111827]">צ'אט קריאה</h3>
        {showParticipants && participants.length > 0 && (
          <div className="flex items-center gap-1">
            {participants.map((role) => {
              const Icon = roleIcons[role];
              return (
                <div
                  key={role}
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center',
                    roleColors[role]
                  )}
                  title={roleLabels[role]}
                >
                  <Icon className="w-3 h-3 text-white" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-[#6b7280]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-[#6b7280] text-sm py-8">אין הודעות. התחל שיחה...</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_role === currentUserRole && msg.sender_name === currentUserName;
            const isSystem = msg.sender_role === 'system' || msg.message_type === 'status_update';
            const Icon = roleIcons[msg.sender_role] || User;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="flex items-center gap-2 text-xs bg-[#f3f4f6] text-[#6b7280] px-3 py-1.5 rounded-full">
                    <Bot className="w-3 h-3" />
                    {msg.message_text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    roleColors[msg.sender_role] || 'bg-gray-400'
                  )}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>

                {/* Message Content */}
                <div
                  className={cn('max-w-[75%] flex flex-col', isMe ? 'items-end' : 'items-start')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[#111827]">{msg.sender_name}</span>
                    <span className="text-[10px] text-[#6b7280]">
                      {roleLabels[msg.sender_role]}
                    </span>
                  </div>

                  <div
                    className={cn(
                      'p-3 rounded-lg text-sm',
                      isMe
                        ? 'bg-[#3b82f6] text-white rounded-tl-none'
                        : 'bg-[#f3f4f6] text-[#111827] rounded-tr-none'
                    )}
                  >
                    {/* Image */}
                    {msg.message_type === 'image' && msg.file_url && (
                      <a
                        href={msg.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mb-2"
                      >
                        <img
                          src={msg.file_url}
                          alt="תמונה"
                          className="max-w-full max-h-48 rounded-lg"
                        />
                      </a>
                    )}

                    {/* File */}
                    {msg.message_type === 'file' && msg.file_url && (
                      <a
                        href={msg.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'flex items-center gap-2 p-2 rounded mb-2',
                          isMe ? 'bg-blue-400' : 'bg-white border border-[#e5e7eb]'
                        )}
                      >
                        <Paperclip className="w-4 h-4" />
                        <span className="text-xs truncate flex-1">{msg.file_name}</span>
                        <Download className="w-4 h-4" />
                      </a>
                    )}

                    {/* Text */}
                    {msg.message_type !== 'image' && <p>{msg.message_text}</p>}
                  </div>

                  {/* Time & Read Status */}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-[#6b7280]">
                      {msg.created_date && format(parseISO(msg.created_date), 'HH:mm')}
                    </span>
                    {isMe && (
                      <CheckCheck
                        className={cn('w-3 h-3', msg.is_read ? 'text-blue-500' : 'text-[#6b7280]')}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="px-3 py-2 bg-[#f3f4f6] border-t border-[#e5e7eb] flex items-center gap-2">
          {selectedFile.type.startsWith('image/') ? (
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="preview"
              className="w-12 h-12 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
              <Paperclip className="w-5 h-5 text-[#6b7280]" />
            </div>
          )}
          <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedFile(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#e5e7eb] bg-white flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Paperclip className="w-5 h-5 text-[#6b7280]" />
        </Button>

        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="כתוב הודעה..."
          className="flex-1"
          disabled={sendMessageMutation.isPending || isUploading}
        />

        <Button
          type="submit"
          size="icon"
          disabled={
            (!messageText.trim() && !selectedFile) || sendMessageMutation.isPending || isUploading
          }
          className="bg-[#3b82f6] hover:bg-[#2563eb] shrink-0"
        >
          {sendMessageMutation.isPending || isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

// Helper function to send system/status messages
export async function sendStatusMessage(callId, statusText) {
  await base44.entities.Message.create({
    call_id: callId,
    sender_name: 'מערכת',
    sender_role: 'system',
    message_text: statusText,
    message_type: 'status_update',
    is_read: false,
  });
}
