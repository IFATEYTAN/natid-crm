import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Inbox, Search, FileX, Users, Truck, Phone, AlertCircle, Plus } from 'lucide-react';

// Pre-configured empty states for common scenarios
const presets = {
  calls: {
    icon: Phone,
    title: 'אין קריאות',
    description: 'לא נמצאו קריאות התואמות לחיפוש שלך',
  },
  customers: {
    icon: Users,
    title: 'אין לקוחות',
    description: 'התחל להוסיף לקוחות למערכת',
    actionLabel: 'הוסף לקוח',
  },
  vendors: {
    icon: Truck,
    title: 'אין ספקים',
    description: 'התחל להוסיף ספקים למערכת',
    actionLabel: 'הוסף ספק',
  },
  search: {
    icon: Search,
    title: 'לא נמצאו תוצאות',
    description: 'נסה לשנות את מונחי החיפוש או להסיר מסננים',
  },
  error: {
    icon: AlertCircle,
    title: 'שגיאה בטעינת הנתונים',
    description: 'אירעה שגיאה בעת טעינת הנתונים. אנא נסה שוב.',
    actionLabel: 'נסה שוב',
  },
  noData: {
    icon: FileX,
    title: 'אין נתונים להצגה',
    description: 'לא נמצאו נתונים בטווח התאריכים שנבחר',
  },
  default: {
    icon: Inbox,
    title: 'אין פריטים',
    description: 'לא נמצאו פריטים להצגה',
  },
};

export default function EmptyState({
  // Use preset or custom values
  preset,

  // Custom overrides
  icon: CustomIcon,
  title,
  description,

  // Action button
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,

  // Styling
  size = 'default', // 'sm', 'default', 'lg'
  className,
}) {
  // Get preset config or use default
  const config = preset ? presets[preset] || presets.default : presets.default;

  // Allow custom values to override preset
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActionLabel = actionLabel || config.actionLabel;

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'py-8',
      icon: 'w-10 h-10',
      title: 'text-base',
      description: 'text-sm',
      button: 'text-sm',
    },
    default: {
      container: 'py-12',
      icon: 'w-14 h-14',
      title: 'text-lg',
      description: 'text-sm',
      button: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-base',
      button: 'text-base',
    },
  };

  const sizes = sizeConfig[size] || sizeConfig.default;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      {/* Icon */}
      <div className="mb-4 p-4 bg-gray-50 rounded-full">
        <Icon className={cn('text-gray-400', sizes.icon)} strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3 className={cn('font-semibold text-gray-900 mb-2', sizes.title)}>{displayTitle}</h3>

      {/* Description */}
      <p className={cn('text-gray-500 max-w-sm mb-6', sizes.description)}>{displayDescription}</p>

      {/* Action Button */}
      {displayActionLabel && onAction && (
        <Button
          onClick={onAction}
          className={cn('bg-[#FF0000] hover:bg-[#CC0000] text-white', sizes.button)}
        >
          <ActionIcon className="w-4 h-4 ml-2" />
          {displayActionLabel}
        </Button>
      )}
    </div>
  );
}

// Named exports for common scenarios
export function EmptyCallsList({ onAction, ...props }) {
  return <EmptyState preset="calls" actionLabel="קריאה חדשה" onAction={onAction} {...props} />;
}

export function EmptyCustomersList({ onAction, ...props }) {
  return <EmptyState preset="customers" onAction={onAction} {...props} />;
}

export function EmptyVendorsList({ onAction, ...props }) {
  return <EmptyState preset="vendors" onAction={onAction} {...props} />;
}

export function EmptySearchResults(props) {
  return <EmptyState preset="search" {...props} />;
}

export function ErrorState({ onRetry, ...props }) {
  return <EmptyState preset="error" onAction={onRetry} actionIcon={AlertCircle} {...props} />;
}
