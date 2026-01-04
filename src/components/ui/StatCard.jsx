import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  className,
  onClick,
  to
}) {
  const cardClasses = cn(
    "bg-white border border-[#E5E7EB] rounded-lg p-5 transition-all duration-200",
    (onClick || to) && "cursor-pointer hover:shadow-md hover:border-[#D1D5DB]",
    className
  );

  const cardContent = (
    <div className="text-right">
      <p className="text-[13px] font-medium text-[#6B7280] mb-2">
        {title}
      </p>
      <p className="text-[28px] font-bold text-[#111827] leading-none">
        {value}
      </p>
      {subtitle && (
        <p className="text-[12px] text-[#9CA3AF] mt-2">
          {subtitle}
        </p>
      )}
      {trend && (
        <div className={cn(
          "mt-2 flex items-center gap-1 text-[12px] font-medium flex-row-reverse justify-end",
          trend === 'up' ? "text-[#059669]" : "text-[#DC2626]"
        )}>
          <span>{trendValue}</span>
          <span>{trend === 'up' ? '↑' : '↓'}</span>
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        <div className={cardClasses}>{cardContent}</div>
      </Link>
    );
  }

  if (onClick) {
    return (
      <div className={cardClasses} onClick={onClick}>{cardContent}</div>
    );
  }

  return (
    <div className={cardClasses}>{cardContent}</div>
  );
}