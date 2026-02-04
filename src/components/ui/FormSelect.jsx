import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronDown, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function FormSelect({
  label,
  required = false,
  error,
  helperText,
  className,
  children,
  ...props
}) {
  return (
    <div className="space-y-2">
      {label && (
        <Label className="block text-right text-[#212121] font-medium text-[14px]">
          {label}
          {required && <span className="text-[#D32F2F] mr-1 text-base">*</span>}
        </Label>
      )}
      <Select {...props}>
        <SelectTrigger
          className={cn(
            'border border-[#E0E0E0] rounded-[4px] px-4 py-3 text-base text-right bg-white h-auto',
            'focus:border-[#0D47A1] focus:ring-[3px] focus:ring-[rgba(13,71,161,0.1)]',
            error && 'border-[#D32F2F] focus:border-[#D32F2F] focus:ring-[rgba(211,47,47,0.1)]',
            className
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white border border-[#E0E0E0] rounded-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] max-h-[300px] z-[1000]">
          {children}
        </SelectContent>
      </Select>
      {error && (
        <div className="flex items-center gap-1 text-[#D32F2F] text-xs caption">
          <AlertCircle className="w-4 h-4" strokeWidth={2} />
          {error}
        </div>
      )}
      {helperText && !error && (
        <p className="text-[#616161] text-xs caption text-right">{helperText}</p>
      )}
    </div>
  );
}
