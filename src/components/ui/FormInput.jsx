import React from 'react';
import { cn } from "@/lib/utils";
import { AlertCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <Label className="block text-right text-[#212121] font-medium text-[14px]">
          {label}
          {required && <span className="text-[#D32F2F] mr-1 text-base">*</span>}
        </Label>
      )}
      <Input
        className={cn(
          "border border-[#E0E0E0] rounded-[4px] px-4 py-3 text-base text-right bg-white",
          "focus:border-[#0D47A1] focus:shadow-[0_0_0_3px_rgba(13,71,161,0.1)] focus:outline-none",
          error && "border-[#D32F2F] focus:border-[#D32F2F] focus:shadow-[0_0_0_3px_rgba(211,47,47,0.1)]",
          props.disabled && "bg-[#FAFAFA] text-[#9E9E9E] cursor-not-allowed",
          className
        )}
        {...props}
      />
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