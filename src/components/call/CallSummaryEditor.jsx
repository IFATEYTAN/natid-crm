import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Sparkles, 
  Save, 
  Loader2, 
  CheckCircle,
  RotateCcw,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';

export default function CallSummaryEditor({ 
  callId, 
  callNumber,
  summaryDraft,
  summaryFinal,
  onSummaryGenerated 
}) {
  const [summary, setSummary] = useState(summaryDraft || summaryFinal || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setSummary(summaryDraft || summaryFinal || '');
  }, [summaryDraft, summaryFinal]);

  // Generate summary mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const response = await base44.functions.invoke('generateCallSummary', { call_id: callId });
      return response.data;
    },
    onSuccess: (data) => {
      setSummary(data.summary);
      setIsEditing(true);
      toast.success('הסיכום נוצר בהצלחה');
      if (onSummaryGenerated) {
        onSummaryGenerated(data.summary);
      }
    },
    onError: (error) => {
      toast.error('שגיאה ביצירת הסיכום');
      console.error(error);
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  // Save summary mutation
  const saveMutation = useMutation({
    mutationFn: async (finalSummary) => {
      await base44.entities.Call.update(callId, {
        summary_final: finalSummary,
        summary_draft: finalSummary
      });
    },
    onSuccess: () => {
      setIsEditing(false);
      toast.success('הסיכום נשמר');
      queryClient.invalidateQueries({ queryKey: ['call', callId] });
    },
    onError: () => {
      toast.error('שגיאה בשמירת הסיכום');
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleSave = () => {
    saveMutation.mutate(summary);
  };

  const handleCancel = () => {
    setSummary(summaryFinal || summaryDraft || '');
    setIsEditing(false);
  };

  const hasFinalSummary = !!summaryFinal;
  const hasDraft = !!summaryDraft && !summaryFinal;

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#6B778C]" />
            סיכום קריאה
            {hasFinalSummary && (
              <Badge className="bg-green-100 text-green-700 text-xs">נשמר</Badge>
            )}
            {hasDraft && (
              <Badge className="bg-yellow-100 text-yellow-700 text-xs">טיוטה</Badge>
            )}
          </CardTitle>
          
          {!isEditing && !isGenerating && (
            <div className="flex gap-2">
              {!summary && (
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  className="gap-1 bg-[#3b82f6] hover:bg-[#2563eb]"
                >
                  <Sparkles className="w-4 h-4" />
                  צור סיכום
                </Button>
              )}
              {summary && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerate}
                    className="gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    צור מחדש
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-1"
                  >
                    <Pencil className="w-4 h-4" />
                    ערוך
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-8 text-[#6B778C]">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p>יוצר סיכום אוטומטי...</p>
          </div>
        ) : !summary && !isEditing ? (
          <div className="text-center py-8 text-[#6B778C]">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">טרם נוצר סיכום לקריאה זו</p>
            <p className="text-sm">לחץ על "צור סיכום" ליצירת סיכום אוטומטי</p>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[150px] text-sm leading-relaxed"
              placeholder="כתוב או ערוך את סיכום הקריאה..."
              dir="rtl"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saveMutation.isPending}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !summary.trim()}
                className="gap-1 bg-[#3b82f6] hover:bg-[#2563eb]"
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
          <div className="bg-[#F4F5F7] rounded-lg p-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}