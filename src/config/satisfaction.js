/**
 * Customer-satisfaction color scheme — mirrors base44/functions/_shared/satisfaction.
 * Single source of truth for labels/colors of the aggregated per-call result
 * returned by the getCallSatisfaction function.
 */

export const satisfactionLabels = {
  green: 'ירוק',
  yellow: 'צהוב',
  red: 'אדום',
  no_answer: 'לא ענה',
  pending: 'ממתין למענה',
  not_sent: 'לא נשלח סקר',
};

export const satisfactionColors = {
  green: 'bg-green-100 text-green-800 border-green-300',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  red: 'bg-red-100 text-red-800 border-red-300',
  no_answer: 'bg-gray-100 text-gray-600 border-gray-300',
  pending: 'bg-blue-100 text-blue-700 border-blue-300',
  not_sent: 'bg-gray-100 text-gray-500 border-gray-300',
};

export function ratingToSatisfactionColor(rating) {
  if (rating >= 4) return 'green';
  if (rating === 3) return 'yellow';
  return 'red';
}
