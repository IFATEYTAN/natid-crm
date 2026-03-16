import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneIncoming,
  User,
  Clock,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * CTI Caller Identification Popup
 *
 * Floating popup that displays incoming call information.
 * Slides in from the top-right corner with animation.
 *
 * @param {boolean} isOpen - Whether the popup is visible
 * @param {object} callerData - Caller information
 * @param {string} callerData.phone - Caller phone number
 * @param {string} callerData.name - Caller name (null if unknown)
 * @param {string} callerData.customerId - Customer ID in the system
 * @param {number} callerData.openCalls - Number of open calls for this customer
 * @param {string} callerData.lastCallDate - Last call date ISO string
 * @param {boolean} callerData.isExistingCustomer - Whether caller is a known customer
 * @param {function} onCreateCase - Handler for creating a new case
 * @param {function} onViewCustomer - Handler for viewing customer details
 * @param {function} onDismiss - Handler for dismissing the popup
 */
export default function CTICallerPopup({
  isOpen,
  callerData,
  onCreateCase,
  onViewCustomer,
  onDismiss,
}) {
  if (!callerData) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'אין מידע';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL');
    } catch {
      return 'אין מידע';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-4 z-50 w-96"
          dir="rtl"
        >
          <Card className="border-2 border-green-500 shadow-2xl bg-white">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="p-2 bg-green-100 rounded-full"
                  >
                    <PhoneIncoming className="h-5 w-5 text-green-600" />
                  </motion.div>
                  <span className="font-bold text-lg text-green-700">
                    שיחה נכנסת
                  </span>
                </div>
                <button
                  onClick={onDismiss}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="סגור"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {/* Caller Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="font-mono text-lg font-semibold" dir="ltr">
                    {callerData.phone}
                  </span>
                </div>

                {callerData.isExistingCustomer ? (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{callerData.name}</span>
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        לקוח מוכר
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>
                          קריאות פתוחות:{' '}
                          <span
                            className={
                              callerData.openCalls > 0
                                ? 'text-orange-600 font-semibold'
                                : 'text-gray-800'
                            }
                          >
                            {callerData.openCalls}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          קריאה אחרונה: {formatDate(callerData.lastCallDate)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-500">לקוח לא מזוהה</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      חדש
                    </Badge>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={onCreateCase}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Plus className="h-4 w-4 ml-1" />
                  פתח קריאה חדשה
                </Button>

                {callerData.isExistingCustomer && (
                  <Button
                    onClick={onViewCustomer}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <User className="h-4 w-4 ml-1" />
                    צפה בלקוח
                  </Button>
                )}

                <Button
                  onClick={onDismiss}
                  variant="ghost"
                  size="sm"
                >
                  דחה
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
