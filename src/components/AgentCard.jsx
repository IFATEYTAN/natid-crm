import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AgentCard({
  agent,
  onToggle,
  isLoading = false
}) {
  const isActive = agent.status === 'active';

  return (
    <div className={cn(
      "bg-white border rounded-lg p-5 transition-all duration-200",
      isActive
        ? "border-[#3B82F6] shadow-sm"
        : "border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-md hover:translate-y-[-2px]"
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
          "px-3 py-1 rounded-full text-[12px] font-medium mr-3",
          isActive
            ? "bg-[#DBEAFE] text-[#1D4ED8]"
            : "bg-[#F3F4F6] text-[#6B7280]"
        )}>
          {isActive ? 'פעיל' : 'לא פעיל'}
        </div>
      </div>

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
