import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function AgentCard({
  agent,
  onToggle,
  isLoading = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = agent.status === 'active';

  return (
    <div className={cn(
      "bg-white border rounded-lg p-5 transition-all duration-200",
      isActive
        ? "border-[#3B82F6] shadow-sm"
        : "border-[#E5E7EB] hover:border-[#D1D5DB]"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-[16px] font-semibold text-[#212121] mb-1">
            {agent.name}
          </h3>
          <p className="text-[13px] text-[#616161] leading-relaxed">
            {agent.description}
          </p>
        </div>

        {/* Status Indicator */}
        <div className={cn(
          "px-3 py-1 rounded-full text-[12px] font-medium mr-3 flex-shrink-0",
          isActive
            ? "bg-[#DBEAFE] text-[#1D4ED8]"
            : "bg-[#F3F4F6] text-[#6B7280]"
        )}>
          {isActive ? 'פעיל' : 'לא פעיל'}
        </div>
      </div>

      {/* Expand/Collapse Button */}
      {agent.details && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[13px] text-[#3B82F6] hover:text-[#2563EB] mb-3 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              הסתר פרטים
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              הצג פרטים נוספים
            </>
          )}
        </button>
      )}

      {/* Expanded Details */}
      {isExpanded && agent.details && (
        <div className="mb-4 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] space-y-4">
          {/* Full Description */}
          <div>
            <h4 className="text-[13px] font-semibold text-[#374151] mb-2">תיאור מפורט</h4>
            <p className="text-[13px] text-[#6B7280] leading-relaxed">
              {agent.details.fullDescription}
            </p>
          </div>

          {/* Use Cases */}
          {agent.details.useCases && agent.details.useCases.length > 0 && (
            <div>
              <h4 className="text-[13px] font-semibold text-[#374151] mb-2">תרחישי שימוש</h4>
              <ul className="space-y-1">
                {agent.details.useCases.map((useCase, idx) => (
                  <li key={idx} className="text-[13px] text-[#6B7280] flex items-start gap-2">
                    <span className="text-[#3B82F6] mt-1">•</span>
                    <span>{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Schedule & Integrations Row */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-[#E5E7EB]">
            {/* Schedule */}
            {agent.details.schedule && (
              <div>
                <h4 className="text-[12px] font-medium text-[#9CA3AF] mb-1">תדירות הרצה</h4>
                <span className="text-[13px] text-[#374151] font-medium">
                  {agent.details.schedule}
                </span>
              </div>
            )}

            {/* Integrations */}
            {agent.details.integrations && agent.details.integrations.length > 0 && (
              <div className="flex-1">
                <h4 className="text-[12px] font-medium text-[#9CA3AF] mb-1">אינטגרציות</h4>
                <div className="flex flex-wrap gap-1.5">
                  {agent.details.integrations.map((integration, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-[#E5E7EB] text-[#4B5563] text-[11px] rounded-md"
                    >
                      {integration}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Row */}
      {agent.stats && (
        <div className="flex items-center gap-4 mb-4 pt-3 border-t border-[#F3F4F6]">
          <div className="text-[13px]">
            <span className="text-[#9CA3AF]">משימות שהושלמו: </span>
            <span className="font-medium text-[#374151]">{agent.stats.completedTasks || 0}</span>
          </div>
          {agent.stats.lastRun && (
            <div className="text-[13px]">
              <span className="text-[#9CA3AF]">הפעלה אחרונה: </span>
              <span className="font-medium text-[#374151]">{agent.stats.lastRun}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={() => onToggle(agent.id)}
        disabled={isLoading}
        className={cn(
          "w-full transition-all duration-200 rounded-[6px] font-medium",
          isActive
            ? "bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151]"
            : "bg-[#3B82F6] hover:bg-[#2563EB] text-white"
        )}
      >
        {isLoading ? 'מעבד...' : isActive ? 'עצור' : 'הפעל'}
      </Button>
    </div>
  );
}
