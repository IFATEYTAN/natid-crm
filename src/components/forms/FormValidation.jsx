import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Form validation utilities and components
 */

// Validation rules
export const validators = {
  required: (value, fieldName = 'שדה זה') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} הוא שדה חובה`;
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'כתובת אימייל לא תקינה';
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^0[0-9]{8,9}$/;
    const cleaned = value.replace(/[\s-]/g, '');
    if (!phoneRegex.test(cleaned)) {
      return 'מספר טלפון לא תקין (לדוגמה: 0501234567)';
    }
    return null;
  },

  israeliId: (value) => {
    if (!value) return null;
    const id = value.toString().trim();
    if (id.length > 9 || isNaN(id)) return 'תעודת זהות לא תקינה';

    const paddedId = id.padStart(9, '0');
    let counter = 0;

    for (let i = 0; i < 9; i++) {
      let digit = Number(paddedId[i]) * ((i % 2) + 1);
      if (digit > 9) digit -= 9;
      counter += digit;
    }

    if (counter % 10 !== 0) {
      return 'תעודת זהות לא תקינה';
    }
    return null;
  },

  vehiclePlate: (value) => {
    if (!value) return null;
    const plateRegex = /^[0-9]{5,8}$/;
    const cleaned = value.replace(/[\s-]/g, '');
    if (!plateRegex.test(cleaned)) {
      return 'מספר רכב לא תקין';
    }
    return null;
  },

  minLength:
    (min) =>
    (value, fieldName = 'שדה זה') => {
      if (!value) return null;
      if (value.length < min) {
        return `${fieldName} חייב להכיל לפחות ${min} תווים`;
      }
      return null;
    },

  maxLength:
    (max) =>
    (value, fieldName = 'שדה זה') => {
      if (!value) return null;
      if (value.length > max) {
        return `${fieldName} לא יכול להכיל יותר מ-${max} תווים`;
      }
      return null;
    },

  number: (value, fieldName = 'שדה זה') => {
    if (!value) return null;
    if (isNaN(value)) {
      return `${fieldName} חייב להיות מספר`;
    }
    return null;
  },

  positiveNumber: (value, fieldName = 'שדה זה') => {
    if (!value) return null;
    if (isNaN(value) || Number(value) <= 0) {
      return `${fieldName} חייב להיות מספר חיובי`;
    }
    return null;
  },

  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'כתובת URL לא תקינה';
    }
  },

  date: (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'תאריך לא תקין';
    }
    return null;
  },

  futureDate: (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'תאריך לא תקין';
    }
    if (date < new Date()) {
      return 'התאריך חייב להיות בעתיד';
    }
    return null;
  },
};

// Validate a single field
export const validateField = (value, rules = [], fieldName) => {
  for (const rule of rules) {
    const error = typeof rule === 'function' ? rule(value, fieldName) : rule;
    if (error) return error;
  }
  return null;
};

// Validate entire form
export const validateForm = (data, schema) => {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(data[field], rules.validators, rules.label);
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
};

// Field error component
export function FieldError({ error }) {
  if (!error) return null;

  return (
    <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
      <AlertCircle className="w-3 h-3" />
      <span>{error}</span>
    </div>
  );
}

// Field success indicator
export function FieldSuccess({ show }) {
  if (!show) return null;

  return (
    <CheckCircle className="w-4 h-4 text-green-500 absolute start-3 top-1/2 -translate-y-1/2" />
  );
}

// Validated input wrapper
export function ValidatedInput({ children, error, touched, className }) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {touched && <FieldError error={error} />}
    </div>
  );
}

// Form validation schema builder
export function createValidationSchema(fields) {
  const schema = {};

  for (const [name, config] of Object.entries(fields)) {
    schema[name] = {
      label: config.label || name,
      validators: config.validators || [],
    };
  }

  return schema;
}

// Example usage:
// const schema = createValidationSchema({
//   customer_name: { label: 'שם לקוח', validators: [validators.required] },
//   customer_phone: { label: 'טלפון', validators: [validators.required, validators.phone] },
//   customer_email: { label: 'אימייל', validators: [validators.email] },
// });
//
// const { isValid, errors } = validateForm(formData, schema);
