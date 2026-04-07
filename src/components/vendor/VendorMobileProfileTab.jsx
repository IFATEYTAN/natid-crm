import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User, Star } from 'lucide-react';
import { format } from 'date-fns';

export default function VendorMobileProfileTab({
  vendorProfile,
  contract,
  calls,
  activeCalls,
  completedCalls,
}) {
  return (
    <div className="px-4 pt-6 space-y-5 pb-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{vendorProfile?.vendor_name}</h2>
        {vendorProfile?.phone && (
          <p className="text-gray-500 mt-1" dir="ltr">{vendorProfile.phone}</p>
        )}
      </div>

      {/* Rating */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">דירוג</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={cn(
                    'w-5 h-5',
                    star <= Math.round(vendorProfile?.average_rating || 0)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  )}
                />
              ))}
              <span className="text-sm text-gray-500 ms-2">
                {vendorProfile?.average_rating?.toFixed(1) || '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract info */}
      {contract && (
        <Card className="rounded-xl">
          <CardContent className="p-4 space-y-2">
            <div className="font-medium text-gray-900">חוזה פעיל</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">סוג</span>
              <span className="text-gray-900">{contract.contract_type || '-'}</span>
            </div>
            {contract.end_date && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">תוקף עד</span>
                <span className="text-gray-900">{format(new Date(contract.end_date), 'dd/MM/yyyy')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats summary */}
      <Card className="rounded-xl">
        <CardContent className="p-4 space-y-3">
          <div className="font-medium text-gray-900">סטטיסטיקות</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">סה&quot;כ קריאות</span>
            <span className="font-bold text-gray-900">{(calls || []).length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">הושלמו</span>
            <span className="font-bold text-green-600">{(completedCalls || []).length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">פעילות</span>
            <span className="font-bold text-blue-600">{(activeCalls || []).length}</span>
          </div>
        </CardContent>
      </Card>

      <Link to={createPageUrl('MyVendorProfile')}>
        <Button variant="outline" className="w-full h-12 rounded-xl text-base font-medium gap-2 border-2">
          <User className="w-5 h-5" />
          הפרופיל המלא
        </Button>
      </Link>
    </div>
  );
}