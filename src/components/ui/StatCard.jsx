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
  // UNIFORM DESIGN: All cards use the same black/grey styling regardless of variant
  // This enforces the "uniform color" request
  const uniformStyle = {
    border: 'border-l-[#212121]', 
    iconBg: 'bg-[#F5F5F5]', 
    iconColor: 'text-[#212121]', 
    titleColor: 'text-[#616161]', 
    valueColor: 'text-[#212121]'
  };

  return (
    <Card className={cn(
      "border-l-4 hover:shadow-lg transition-all duration-300 bg-white",
      uniformStyle.border,
      className
    )}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn("text-sm mb-1 font-medium", uniformStyle.titleColor)}>
              {title}
            </p>
            <p className={cn("text-3xl font-bold", uniformStyle.valueColor)}>
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
              uniformStyle.iconBg
            )}>
              <Icon className={cn("w-6 h-6", uniformStyle.iconColor)} strokeWidth={2} />
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