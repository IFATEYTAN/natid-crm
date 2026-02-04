import { AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ErrorMessage({
  error,
  title = 'שגיאה בטעינת הנתונים',
  onRetry,
  variant = 'default',
  className,
}) {
  const variants = {
    default: 'bg-[#fef2f2] border-[#ef4444] text-[#991b1b]',
    inline: 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]',
    subtle: 'bg-transparent border-[#e5e7eb] text-[#6b7280]',
  };

  return (
    <div className={cn('border rounded-[8px] p-4', variants[variant], className)} role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-[#111827]">{title}</p>
          <p className="text-sm mt-1 text-[#6b7280]">
            {error?.message || 'אירעה שגיאה לא צפויה. נסה שוב מאוחר יותר.'}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3 gap-2">
              <RefreshCw className="w-4 h-4" />
              נסה שוב
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty state component
export function EmptyState({
  icon: Icon = XCircle,
  title = 'לא נמצאו נתונים',
  description = 'נסה לשנות את תנאי החיפוש או לחזור מאוחר יותר.',
  action,
  className,
}) {
  return (
    <div className={cn('text-center py-12', className)}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f3f4f6] flex items-center justify-center">
        <Icon className="w-8 h-8 text-[#6b7280]" />
      </div>
      <h3 className="text-lg font-medium text-[#111827] mb-2">{title}</h3>
      <p className="text-sm text-[#6b7280] max-w-md mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default ErrorMessage;
