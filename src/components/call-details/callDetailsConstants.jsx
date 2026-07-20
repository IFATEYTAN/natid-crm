// Canonical labels are in @/config/labels.js — re-exported for backward compatibility.
export { statusLabels, issueTypeLabels } from '@/components/config/labels';

// statusColors is defined locally for backward compatibility
export const statusColors = {
  waiting_treatment: 'bg-gray-100 text-gray-700',
  awaiting_assignment: 'bg-yellow-100 text-yellow-800',
  assigning: 'bg-blue-100 text-blue-800',
  vendor_enroute: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-orange-100 text-orange-800',
  vendor_arrived: 'bg-purple-100 text-purple-800',
  future_service: 'bg-teal-100 text-teal-800',
  in_followup: 'bg-cyan-100 text-cyan-800',
  in_storage: 'bg-slate-100 text-slate-700',
  continued_treatment: 'bg-amber-100 text-amber-800',
  awaiting_payment: 'bg-red-100 text-red-800',
  awaiting_closure_call: 'bg-white text-gray-800 border border-gray-300',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-200 text-red-900',
};
