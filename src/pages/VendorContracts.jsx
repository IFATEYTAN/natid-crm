import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, DollarSign } from 'lucide-react';
import GeneralContractsTab from '@/components/contracts/GeneralContractsTab.jsx';
import PricingAgreementsTab from '@/components/contracts/PricingAgreementsTab.jsx';

export default function VendorContractsPage() {
  return (
    <div className="space-y-6 text-end" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">ניהול חוזים והסכמי תמחור</h1>
        <p className="text-[#6b7280] text-sm">ניהול מרוכז של חוזים והסכמי מחיר עם ספקים</p>
      </div>

      <Tabs defaultValue="general" className="w-full" dir="rtl">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            חוזי ספקים
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            הסכמי תמחור
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-0">
          <GeneralContractsTab />
        </TabsContent>
        <TabsContent value="pricing" className="mt-0">
          <PricingAgreementsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
