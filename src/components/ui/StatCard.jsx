import React from 'react';
import { Link } from 'react-router-dom';
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
  className,
  onClick,
  to
}) {
  // SOFT DESIGN SYSTEM: Soft colors with gentle borders
  const softStyle = {
    border: 'border-r-4 border-r-primary-soft-400',
    iconBg: 'bg-primary-soft-50',
    iconColor: 'text-primary-soft-600',
    titleColor: 'text-neutral-soft-600',
    valueColor: 'text-neutral-soft-800'
  };

  const cardClasses = cn(
    "border-r-4 hover:shadow-lg transition-all duration-300 bg-white",
    softStyle.border,
    (onClick || to) && "cursor-pointer hover:scale-[1.02]",
    className
  );

  const cardContent = (
    <CardContent className="pt-6">
      <div className="flex items-center justify-between flex-row-reverse">
          {Icon && (
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
              softStyle.iconBg
            )}>
              <Icon className={cn("w-6 h-6", softStyle.iconColor)} strokeWidth={2} />
            </div>
          )}
          <div className="text-right">
            <p className={cn("text-sm mb-1 font-medium", softStyle.titleColor)}>
              {title}
            </p>
            <p className={cn("text-3xl font-bold", softStyle.valueColor)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-neutral-soft-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {trend && (
          <div className={cn(
            "mt-3 flex items-center gap-1 text-xs font-medium flex-row-reverse justify-end",
            trend === 'up' ? "text-success-soft-600" : "text-error-soft-600"
          )}>
            <span>{trendValue}</span>
            <span>{trend === 'up' ? '↑' : '↓'}</span>
          </div>
        )}
      </CardContent>
  );

  // If 'to' prop is provided, wrap in Link
  if (to) {
    return (
      <Link to={to} className="block">
        <Card className={cardClasses}>
          {cardContent}
        </Card>
      </Link>
    );
  }

  // If 'onClick' prop is provided, add onClick handler
  if (onClick) {
    return (
      <Card className={cardClasses} onClick={onClick}>
        {cardContent}
      </Card>
    );
  }

  // Otherwise, render as a regular card
  return (
    <Card className={cardClasses}>
      {cardContent}
    </Card>
  );
}