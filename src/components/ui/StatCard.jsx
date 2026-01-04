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
  const cardClasses = cn(
    "card-base transition-all duration-200", // Using global card-base class
    (onClick || to) && "cursor-pointer hover:shadow-md",
    className
  );

  const cardContent = (
    <div className="flex flex-col h-full justify-between">
      <div className="flex items-start justify-between">
        <div className="text-right w-full">
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-[#000000] leading-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-[var(--color-text-disabled)] mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {/* Icon removed for clean look */}
      </div>
        {trend && (
          <div className={cn(
            "mt-3 flex items-center gap-1 text-xs font-medium flex-row-reverse justify-end",
            trend === 'up' ? "text-[var(--color-status-normal)]" : "text-[var(--color-status-urgent)]"
          )}>
            <span>{trendValue}</span>
            <span>{trend === 'up' ? '↑' : '↓'}</span>
          </div>
        )}
      </div>
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