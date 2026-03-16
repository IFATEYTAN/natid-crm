import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ExportMenu from '@/components/ui/ExportMenu';
import { Star, Loader2, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import QueryErrorState from '@/components/ui/QueryErrorState';

export default function FeedbackManagement() {
  const {
    data: feedbacks,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.feedbacks.all(),
    queryFn: () => base44.entities.CallFeedback.list('-created_at', 50),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return <QueryErrorState error={error} entityName="CallFeedback" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">משובי לקוחות</h1>
        <ExportMenu
          data={feedbacks || []}
          columns={[
            { header: 'לקוח', accessor: 'customer_name' },
            { header: 'טלפון', accessor: 'customer_phone' },
            { header: 'קריאה', accessor: 'call_number' },
            { header: 'דירוג', accessor: 'overall_rating' },
            { header: 'ממליץ?', accessor: 'would_recommend' },
            { header: 'משוב מילולי', accessor: 'feedback_text' },
            { header: 'ספק', accessor: 'vendor_name' },
            { header: 'תאריך', accessor: 'created_at' },
          ]}
          filename="customer_feedback"
          title="דוח משובי לקוחות"
        />
      </div>

      <div className="grid gap-4">
        {feedbacks?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">אין משובים להצגה</CardContent>
          </Card>
        ) : (
          feedbacks?.map((feedback) => (
            <Card key={feedback.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">
                        {feedback.customer_name || 'לקוח ללא שם'}
                      </h3>
                      <span className="text-sm text-gray-500">• {feedback.customer_phone}</span>
                      <span className="text-sm text-gray-400">• קריאה #{feedback.call_number}</span>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-100">
                        <span className="text-sm font-medium text-yellow-700">דירוג כללי:</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'w-4 h-4',
                                star <= feedback.overall_rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-200'
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      {feedback.would_recommend !== undefined && (
                        <div
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-md border text-sm font-medium',
                            feedback.would_recommend
                              ? 'bg-green-50 border-green-100 text-green-700'
                              : 'bg-red-50 border-red-100 text-red-700'
                          )}
                        >
                          {feedback.would_recommend ? (
                            <>
                              <ThumbsUp className="w-3 h-3" /> ממליץ
                            </>
                          ) : (
                            <>
                              <ThumbsDown className="w-3 h-3" /> לא ממליץ
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {feedback.feedback_text && (
                      <div className="bg-gray-50 p-3 rounded-lg flex gap-3 items-start">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">
                          {feedback.feedback_text}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex gap-4 text-xs text-gray-500">
                      <span>נותן שירות: {feedback.vendor_name || '-'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 text-xs text-gray-400 whitespace-nowrap">
                    <span>{format(new Date(feedback.created_at), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
