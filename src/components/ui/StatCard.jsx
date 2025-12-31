import React from 'react';
import { cn } from "@/lib/utils";

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendValue,
  variant = 'default' 
}) {
  const variants = {
    default: 'bg-white border-[#E0E0E0]',
    primary: 'bg-[#0D47A1] text-white border-[#0D47A1]',
    success: 'bg-[#2E7D32] text-white border-[#2E7D32]',
    warning: 'bg-[#ED6C02] text-white border-[#ED6C02]',
    error: 'bg-[#D32F2F] text-white border-[#D32F2F]',
  };

  const isLight = variant === 'default';

  return (
    <div className={cn(
      "rounded-xl border p-5 transition-all duration-200 hover:shadow-md",
      variants[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-medium",
            isLight ? "text-[#616161]" : "text-white/80"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-2xl font-bold",
            isLight ? "text-[#212121]" : "text-white"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              "text-xs",
              isLight ? "text-[#9E9E9E]" : "text-white/70"
            )}>
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "p-2.5 rounded-lg",
            isLight ? "bg-[#FAFAFA]" : "bg-white/10"
          )}>
            <Icon className={cn(
              "w-5 h-5",
              isLight ? "text-[#0D47A1]" : "text-white"
            )} />
          </div>
        )}
      </div>
      {trend && (
        <div className={cn(
          "mt-3 flex items-center gap-1 text-xs font-medium",
          trend === 'up' ? "text-[#2E7D32]" : "text-[#D32F2F]"
        )}>
          <span>{trend === 'up' ? '↑' : '↓'}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}