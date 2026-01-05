import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import anime from 'animejs';

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  variant,
  className,
  onClick,
  to
}) {
  const cardRef = useRef(null);

  useEffect(() => {
    anime({
      targets: cardRef.current,
      opacity: [0, 1],
      translateY: [20, 0],
      scale: [0.95, 1],
      duration: 800,
      easing: 'easeOutExpo',
      delay: anime.random(0, 150)
    });
  }, []);

  const cardClasses = cn(
    "bg-white border border-[#E5E7EB] rounded-lg p-5 transition-all duration-200",
    (onClick || to) && "cursor-pointer hover:shadow-md hover:border-[#D1D5DB]",
    className
  );

  const variantStyles = {
    primary: "bg-blue-50 text-blue-600",
    success: "bg-green-50 text-green-600",
    warning: "bg-orange-50 text-orange-600",
    info: "bg-indigo-50 text-indigo-600",
    danger: "bg-red-50 text-red-600",
    default: "bg-gray-50 text-gray-600"
  };

  const iconStyle = variantStyles[variant] || variantStyles.default;

  const cardContent = (
    <div className="text-right relative">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[13px] font-medium text-[#6B7280] mb-2">
            {title}
          </p>
          <p className="text-[28px] font-bold text-[#111827] leading-none">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-lg", iconStyle)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      
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
        <div ref={cardRef} className={cardClasses}>{cardContent}</div>
      </Link>
    );
  }

  if (onClick) {
    return (
      <div ref={cardRef} className={cardClasses} onClick={onClick}>{cardContent}</div>
    );
  }

  return (
    <div ref={cardRef} className={cardClasses}>{cardContent}</div>
  );
}