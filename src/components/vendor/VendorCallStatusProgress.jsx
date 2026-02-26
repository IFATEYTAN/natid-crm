import React from 'react';
import { CheckCircle, Navigation, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const statusSteps = [
  { key: 'assigned', label: 'שובץ', icon: CheckCircle },
  { key: 'vendor_enroute', label: 'בדרך', icon: Navigation },
  { key: 'in_progress', label: 'בטיפול', icon: Clock },
  { key: 'completed', label: 'הושלם', icon: CheckCircle },
];

const statusToStepIndex = {
  assigned: 0,
  assigning: 0,
  vendor_enroute: 1,
  in_progress: 2,
  completed: 3,
};

export default function VendorCallStatusProgress({ callStatus }) {
  const currentStep = statusToStepIndex[callStatus] ?? 0;

  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {statusSteps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep;
            const isDone = idx < currentStep;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isDone
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs mt-1 ${isActive ? 'font-bold text-blue-600' : 'text-gray-500'}`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < statusSteps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${idx < currentStep ? 'bg-green-500' : 'bg-gray-200'}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
