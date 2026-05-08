import { Input } from './input';
import { Search, Mail, Phone as PhoneIcon, Lock } from 'lucide-react';

/**
 * Input Component Stories
 *
 * The Input component is used for collecting user text input.
 * It supports various types and can be combined with icons.
 */
export default {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'search'],
      description: 'The type of input',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the input',
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'A styled input component for text entry.',
      },
    },
  },
};

// Default input
export const Default = {
  args: {
    placeholder: 'הזן טקסט...',
  },
};

// With label
export const WithLabel = {
  render: () => (
    <div className="space-y-2 w-[300px]" dir="rtl">
      <label className="text-sm font-medium">שם מלא</label>
      <Input placeholder="הזן את שמך המלא" />
    </div>
  ),
};

// Different types
export const Email = {
  args: {
    type: 'email',
    placeholder: 'your@email.com',
  },
};

export const Password = {
  args: {
    type: 'password',
    placeholder: 'הזן סיסמה',
  },
};

export const PhoneInput = {
  args: {
    type: 'tel',
    placeholder: '050-0000000',
  },
};

export const Number = {
  args: {
    type: 'number',
    placeholder: '0',
  },
};

// States
export const Disabled = {
  args: {
    placeholder: 'שדה לא זמין',
    disabled: true,
  },
};

// With icon (using wrapper)
export const WithIcon = {
  render: () => (
    <div className="relative w-[300px]" dir="rtl">
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input className="ps-10" placeholder="חיפוש..." />
    </div>
  ),
};

// Form example
export const FormExample = {
  render: () => (
    <form className="space-y-4 w-[350px]" dir="rtl">
      <div className="space-y-2">
        <label className="text-sm font-medium">שם מלא</label>
        <Input placeholder="ישראל ישראלי" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">טלפון</label>
        <div className="relative">
          <PhoneIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="ps-10" type="tel" placeholder="050-0000000" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">אימייל</label>
        <div className="relative">
          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="ps-10" type="email" placeholder="email@example.com" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">סיסמה</label>
        <div className="relative">
          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="ps-10" type="password" placeholder="••••••••" />
        </div>
      </div>
    </form>
  ),
};

// Search input
export const SearchInput = {
  render: () => (
    <div className="relative w-[400px]" dir="rtl">
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input className="ps-10" type="search" placeholder="חיפוש לפי שם, מספר קריאה או טלפון..." />
    </div>
  ),
};