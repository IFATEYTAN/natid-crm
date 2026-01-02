import React from 'react';
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendValue,
  variant = 'default',
  className
}) {
  const variants = {
    default: { border: 'border-l-[#212121]', iconBg: 'bg-[#F5F5F5]', iconColor: 'text-[#212121]', titleColor: 'text-[#212121]', valueColor: 'text-[#212121]' },
    primary: { border: 'border-l-[#0D47A1]', iconBg: 'bg-[#E3F2FD]', iconColor: 'text-[#0D47A1]', titleColor: 'text-[#212121]', valueColor: 'text-[#0D47A1]' },
    success: { border: 'border-l-[#2E7D32]', iconBg: 'bg-[#E8F5E9]', iconColor: 'text-[#2E7D32]', titleColor: 'text-[#212121]', valueColor: 'text-[#2E7D32]' },
    warning: { border: 'border-l-[#ED6C02]', iconBg: 'bg-[#FFF4E5]', iconColor: 'text-[#ED6C02]', titleColor: 'text-[#212121]', valueColor: 'text-[#ED6C02]' },
    error: { border: 'border-l-[#D32F2F]', iconBg: 'bg-[#FFEBEE]', iconColor: 'text-[#D32F2F]', titleColor: 'text-[#212121]', valueColor: 'text-[#D32F2F]' },
  };

  const style = variants[variant] || variants.default;

  return (
    <Card className={cn(
      "border-l-4 hover:shadow-lg transition-all duration-300 bg-white",
      style.border,
      className
    )}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn("text-sm mb-1 font-medium", style.titleColor)}>
              {title}
            </p>
            <p className={cn("text-3xl font-bold", style.valueColor)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-[#9E9E9E] mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
              style.iconBg
            )}>
              <Icon className={cn("w-6 h-6", style.iconColor)} strokeWidth={2} />
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
      </CardContent>
    </Card>
  );
}