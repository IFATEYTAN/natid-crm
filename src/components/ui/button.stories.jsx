import { Button } from './button';
import { Plus, Trash2, Save, Download, Mail } from 'lucide-react';

/**
 * Button Component Stories
 *
 * The Button component is the primary interactive element in the UI.
 * It supports multiple variants, sizes, and states including loading.
 */
export default {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'brand'],
      description: 'The visual style of the button',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'The size of the button',
    },
    isLoading: {
      control: 'boolean',
      description: 'Shows a loading spinner when true',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button when true',
    },
    children: {
      control: 'text',
      description: 'Button content',
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'A versatile button component that supports multiple variants and states.',
      },
    },
  },
};

// Default button
export const Default = {
  args: {
    children: 'לחץ כאן',
    variant: 'default',
  },
};

// Brand red button (primary CTA)
export const Brand = {
  args: {
    children: 'קריאה חדשה',
    variant: 'brand',
  },
};

// Destructive button for delete actions
export const Destructive = {
  args: {
    children: 'מחק',
    variant: 'destructive',
  },
};

// Outline button
export const Outline = {
  args: {
    children: 'ביטול',
    variant: 'outline',
  },
};

// Secondary button
export const Secondary = {
  args: {
    children: 'שמור טיוטה',
    variant: 'secondary',
  },
};

// Ghost button
export const Ghost = {
  args: {
    children: 'ערוך',
    variant: 'ghost',
  },
};

// Link button
export const Link = {
  args: {
    children: 'קרא עוד',
    variant: 'link',
  },
};

// Different sizes
export const Small = {
  args: {
    children: 'כפתור קטן',
    size: 'sm',
  },
};

export const Large = {
  args: {
    children: 'כפתור גדול',
    size: 'lg',
  },
};

// Icon button
export const Icon = {
  args: {
    children: <Plus className="w-4 h-4" />,
    size: 'icon',
    variant: 'outline',
  },
};

// Button with icon
export const WithIcon = {
  args: {
    children: (
      <>
        <Plus className="w-4 h-4" />
        הוסף חדש
      </>
    ),
    variant: 'default',
  },
};

// Loading state
export const Loading = {
  args: {
    children: 'שומר...',
    isLoading: true,
    loadingText: 'טוען...',
  },
};

// Disabled state
export const Disabled = {
  args: {
    children: 'לא זמין',
    disabled: true,
  },
};

// All variants showcase
export const AllVariants = {
  render: () => (
    <div className="flex flex-wrap gap-4" dir="rtl">
      <Button variant="default">ברירת מחדל</Button>
      <Button variant="brand">ראשי (אדום)</Button>
      <Button variant="destructive">מחיקה</Button>
      <Button variant="outline">קווי</Button>
      <Button variant="secondary">משני</Button>
      <Button variant="ghost">רוח</Button>
      <Button variant="link">קישור</Button>
    </div>
  ),
};

// All sizes showcase
export const AllSizes = {
  render: () => (
    <div className="flex items-center gap-4" dir="rtl">
      <Button size="sm">קטן</Button>
      <Button size="default">רגיל</Button>
      <Button size="lg">גדול</Button>
      <Button size="icon" aria-label="הוסף">
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  ),
};

// Real-world examples
export const RealWorldExamples = {
  render: () => (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-2">
        <Button variant="brand">
          <Plus className="w-4 h-4" />
          קריאה חדשה
        </Button>
        <Button variant="outline">ביטול</Button>
      </div>

      <div className="flex gap-2">
        <Button variant="default">
          <Save className="w-4 h-4" />
          שמור
        </Button>
        <Button variant="destructive">
          <Trash2 className="w-4 h-4" />
          מחק
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary">
          <Download className="w-4 h-4" />
          ייצוא לאקסל
        </Button>
        <Button variant="ghost">
          <Mail className="w-4 h-4" />
          שלח מייל
        </Button>
      </div>
    </div>
  ),
};
