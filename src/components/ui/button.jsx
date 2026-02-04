import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-[#3b82f6] text-white shadow-sm hover:bg-[#2563eb]',
        destructive: 'bg-[#ef4444] text-white shadow-sm hover:bg-[#dc2626]',
        outline: 'border border-[#6b7280] bg-transparent text-[#6b7280] shadow-sm hover:bg-gray-50',
        secondary: 'bg-[#f3f4f6] text-[#111827] shadow-sm hover:bg-[#e5e7eb]',
        ghost: 'hover:bg-[#f3f4f6] hover:text-[#111827]',
        link: 'text-[#3b82f6] underline-offset-4 hover:underline',
        // Brand button - now uses blue
        brand: 'bg-[#3b82f6] text-white shadow-sm hover:bg-[#2563eb] active:scale-[0.98]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-[8px] px-3 text-xs',
        lg: 'h-11 rounded-[8px] px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // If loading, show spinner and optionally loading text
    if (isLoading) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={true}
          {...props}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText || children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
