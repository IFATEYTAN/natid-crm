import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

// Standardized toast notifications with consistent styling
export const showToast = {
  success: (message, options = {}) => {
    toast.success(message, {
      icon: <CheckCircle className="w-5 h-5 text-[#111827]" />,
      duration: 3000,
      className: "bg-white border border-[#e5e7eb] text-[#111827]",
      ...options
    });
  },
  
  error: (message, options = {}) => {
    toast.error(message, {
      icon: <XCircle className="w-5 h-5 text-[#ef4444]" />,
      duration: 5000,
      className: "bg-white border border-[#e5e7eb] text-[#111827]",
      ...options
    });
  },
  
  warning: (message, options = {}) => {
    toast.warning(message, {
      icon: <AlertCircle className="w-5 h-5 text-[#f59e0b]" />,
      duration: 4000,
      className: "bg-white border border-[#e5e7eb] text-[#111827]",
      ...options
    });
  },
  
  info: (message, options = {}) => {
    toast.info(message, {
      icon: <Info className="w-5 h-5 text-[#3b82f6]" />,
      duration: 3000,
      className: "bg-white border border-[#e5e7eb] text-[#111827]",
      ...options
    });
  },
  
  loading: (message, options = {}) => {
    return toast.loading(message, {
      icon: <Loader2 className="w-5 h-5 text-[#3b82f6] animate-spin" />,
      className: "bg-white border border-[#e5e7eb] text-[#111827]",
      ...options
    });
  },
  
  // Promise-based toast for async operations
  promise: (promise, { loading, success, error }) => {
    return toast.promise(promise, {
      loading: loading || 'מעבד...',
      success: success || 'הפעולה הושלמה בהצלחה',
      error: (err) => error || err?.message || 'אירעה שגיאה',
    });
  },

  dismiss: (toastId) => {
    toast.dismiss(toastId);
  }
};

// Action feedback messages in Hebrew
export const feedbackMessages = {
  create: {
    loading: 'יוצר...',
    success: 'נוצר בהצלחה',
    error: 'שגיאה ביצירה'
  },
  update: {
    loading: 'מעדכן...',
    success: 'עודכן בהצלחה',
    error: 'שגיאה בעדכון'
  },
  delete: {
    loading: 'מוחק...',
    success: 'נמחק בהצלחה',
    error: 'שגיאה במחיקה'
  },
  save: {
    loading: 'שומר...',
    success: 'נשמר בהצלחה',
    error: 'שגיאה בשמירה'
  },
  send: {
    loading: 'שולח...',
    success: 'נשלח בהצלחה',
    error: 'שגיאה בשליחה'
  },
  upload: {
    loading: 'מעלה...',
    success: 'הועלה בהצלחה',
    error: 'שגיאה בהעלאה'
  },
  export: {
    loading: 'מייצא...',
    success: 'יוצא בהצלחה',
    error: 'שגיאה בייצוא'
  }
};

export default showToast;