import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FormInput({
  label,
  required = false,
  error,
  helperText,
  className,
  ...props
}) {
  return (
    <div className="space-y-2">
      {label && (
        <Label className="block text-end text-neutral-soft-800 font-medium text-[14px]">
          {label}
          {required && <span className="text-error-soft-500 ms-1 text-base">*</span>}
        </Label>
      )}
      <Input
        className={cn(
          'border border-neutral-soft-200 rounded-[4px] px-4 py-3 text-base text-end bg-white',
          'focus:border-secondary-soft-500 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)] focus:outline-none',
          error &&
            'border-error-soft-500 focus:border-error-soft-600 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]',
          props.disabled && 'bg-neutral-soft-50 text-neutral-soft-400 cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && (
        <div className="flex items-center gap-1 text-error-soft-600 text-xs caption flex-row-reverse justify-end">
          <span>{error}</span>
          <AlertCircle className="w-4 h-4" strokeWidth={2} />
        </div>
      )}
      {helperText && !error && (
        <p className="text-neutral-soft-500 text-xs caption text-end">{helperText}</p>
      )}
    </div>
  );
}
