import React from 'react';
import { History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/components/utils';
import { statusLabels } from '@/config/labels';

export default function CallHistoryTab({ combinedTimeline }) {
  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-[#6B778C]" />
          היסטוריית שינויים
        </CardTitle>
      </CardHeader>
      <CardContent>
        {combinedTimeline.length === 0 ? (
          <div className="text-center py-8 text-[#6B778C]">
            <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>אין היסטוריה עדיין</p>
          </div>
        ) : (
          <div className="space-y-4">
            {combinedTimeline.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 pb-4 border-b border-[#F4F5F7] last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-[#6B778C] mt-2" />
                <div className="flex-1">
                  {item.__type === 'message' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs ${item.sender_role === 'operator' ? 'bg-blue-100 text-blue-700' : item.sender_role === 'vendor' ? 'bg-green-100 text-green-700' : item.sender_role === 'customer' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {item.sender_role === 'operator'
                            ? 'מוקדן'
                            : item.sender_role === 'vendor'
                              ? 'ספק'
                              : item.sender_role === 'customer'
                                ? 'לקוח'
                                : 'מערכת'}
                        </Badge>
                        <span className="font-medium text-sm">{item.sender_name || ''}</span>
                      </div>
                      {item.message_text && <p className="text-sm mt-1">{item.message_text}</p>}
                      {item.file_url && (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 underline mt-1 inline-block"
                        >
                          קובץ מצורף
                        </a>
                      )}
                      <p className="text-xs text-[#6B778C] mt-1">
                        {formatDateTime(item.created_date)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">
                        <span className="font-medium">
                          {item.change_type === 'status'
                            ? 'שינוי סטטוס'
                            : item.change_type === 'vendor_assignment'
                              ? 'שיבוץ ספק'
                              : item.change_type}
                        </span>
                        {item.old_value && item.new_value && (
                          <span className="text-[#6B778C]">
                            {' '}
                            מ-{statusLabels[item.old_value] || item.old_value} ל-
                            {statusLabels[item.new_value] || item.new_value}
                          </span>
                        )}
                        {!item.old_value && item.new_value && (
                          <span className="text-[#6B778C]">: {item.new_value}</span>
                        )}
                      </p>
                      <p className="text-xs text-[#6B778C] mt-1">
                        {formatDateTime(item.created_date)} • {item.changed_by}
                      </p>
                      {item.notes && <p className="text-sm text-[#6B778C] mt-1">{item.notes}</p>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
