import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/ui/StatusBadge';
import { Phone, MapPin, Clock, Wrench } from 'lucide-react';
import { issueTypeLabels, priorityLabels, priorityColors } from '@/config/labels';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * Read-only summary card for a call assigned to a field agent.
 * Agents have a reduced portal (view assigned calls), so this card surfaces the
 * essentials without linking into the operator-only CallDetails page.
 */
export default function AgentCallCard({ call }) {
  if (!call) return null;

  const location =
    call.pickup_location_address ||
    call.pickup_location_city ||
    call.incident_location ||
    'מיקום לא צוין';

  const createdAt = call.created_date
    ? formatDistanceToNow(new Date(call.created_date), { addSuffix: true, locale: he })
    : null;

  return (
    <Card className="bg-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[#172B4D]">
            {call.call_number || `#${call.id?.substring(0, 8)}`}
          </span>
          <StatusBadge status={call.call_status} />
        </div>

        <div className="space-y-1.5 text-sm text-[#42526E]">
          {call.customer_name && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#6B778C]" />
              <span>
                {call.customer_name}
                {call.customer_phone ? ` · ${call.customer_phone}` : ''}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#6B778C]" />
            <span>{location}</span>
          </div>
          {call.issue_type && (
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#6B778C]" />
              <span>{issueTypeLabels[call.issue_type] || call.issue_type}</span>
            </div>
          )}
          {createdAt && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#6B778C]" />
              <span>{createdAt}</span>
            </div>
          )}
        </div>

        {call.call_priority && (
          <Badge className={priorityColors[call.call_priority] || 'bg-gray-100 text-gray-700'}>
            {priorityLabels[call.call_priority] || call.call_priority}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
