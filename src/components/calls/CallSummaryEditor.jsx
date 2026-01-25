import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Sparkles, 
  Save, 
  RefreshCw, 
  Check, 
  Edit2,
  Clock,
  Loader2
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CallSummaryEditor({ call, onSummaryUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (call?.summary_draft) {
      setEditedSummary(call.summary_draft);
    }
  }, [call?.summary_draft]);

  // Generate summary mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateCallSummary', {
        call_id: call.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      setEditedSummary(data.summary);
      queryClient.invalidateQueries({ queryKey: ['call', call.id] });
      toast.success('סיכום נוצר בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה ביצירת סיכום: ' + error.message);
    }
  });

  // Save summary mutation
  const saveMutation = useMutation({
    mutationFn: async (summary) => {
      await base44.entities.Call.update(call.id, {
        summary_final: summary,
        summary_draft: summary
      });
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['call', call.id] });
      toast.success('סיכום נשמר בהצלחה');
      if (onSummaryUpdated) {
        onSummaryUpdated(editedSummary);
      }
    },
    onError: (error) => {
      toast.error('שגיאה בשמירת סיכום: ' + error.message);
    }
  });

  const hasSummary = call?.summary_draft || call?.summary_final;
  const displaySummary = call?.summary_final || call?.summary_draft;
  const isCompleted = call?.call_status === 'completed';

  if (!isCompleted) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            סיכום קריאה
          </CardTitle>
          <div className="flex items-center gap-2">
            {call?.summary_final && (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
                <Check className="w-3 h-3" />
                סיכום סופי
              </Badge>
            )}
            {call?.summary_generated_at && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(call.summary_generated_at), 'HH:mm dd/MM')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSummary ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Sparkles className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">
              צור סיכום אוטומטי של הקריאה באמצעות בינה מלאכותית
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="gap-2"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  יוצר סיכום...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  צור סיכום אוטומטי
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  rows={8}
                  className="resize-none"
                  placeholder="ערוך את הסיכום..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedSummary(displaySummary);
                    }}
                  >
                    ביטול
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate(editedSummary)}
                    disabled={saveMutation.isPending}
                    className="gap-2"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    שמור סיכום
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
                  {displaySummary}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    className="gap-2"
                  >
                    {generateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    צור מחדש
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    ערוך
                  </Button>
                  {!call?.summary_final && (
                    <Button
                      size="sm"
                      onClick={() => saveMutation.mutate(editedSummary)}
                      disabled={saveMutation.isPending}
                      className="gap-2"
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      אשר כסופי
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}