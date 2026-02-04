import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ className, size = 'default', text }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-[#3b82f6]', sizeClasses[size])} />
      {text && <span className="text-sm text-[#6b7280] animate-pulse">{text}</span>}
    </div>
  );
}

// Full page loading state
export function PageLoader({ text = 'טוען...' }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// Inline loading for buttons/small areas
export function InlineLoader({ className }) {
  return <Loader2 className={cn('w-4 h-4 animate-spin', className)} />;
}

// Skeleton loader for cards
export function CardSkeleton({ className }) {
  return (
    <div
      className={cn('bg-white border border-[#e5e7eb] rounded-[8px] p-4 animate-pulse', className)}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#f3f4f6] rounded-[8px]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[#f3f4f6] rounded w-3/4" />
          <div className="h-3 bg-[#f3f4f6] rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-[#f3f4f6] rounded" />
        <div className="h-3 bg-[#f3f4f6] rounded w-5/6" />
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden animate-pulse">
      <div className="bg-[#f3f4f6] p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-[#e5e7eb] rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="p-4 border-t border-[#e5e7eb] flex gap-4">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div key={colIdx} className="h-4 bg-[#f3f4f6] rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default LoadingSpinner;
