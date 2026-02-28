import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, User, MapPin, Loader2 } from 'lucide-react';
import { showToast } from '@/components/ui/FeedbackToast';

export default function FormView() {
  const pdfContentRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const employeeName = 'ישראל ישראלי';

  const handleDownloadPDF = async () => {
    if (!pdfContentRef.current) return;

    try {
      setIsGenerating(true);

      // Dynamically import libraries to reduce bundle size
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const element = pdfContentRef.current;

      // Capture with html2canvas using requested settings
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        x: -20,
        y: -20,
        width: element.offsetWidth + 40, // Compensate for padding offsets
        height: element.offsetHeight + 40,
        windowWidth: document.documentElement.offsetWidth + 100,
        windowHeight: document.documentElement.offsetHeight + 100,
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // 10mm margins

      const imgProps = pdf.getImageProperties(imgData);
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

      let heightLeft = contentHeight;
      let position = margin;
      let pageHeight = pdfHeight - margin * 2;

      // Add first page
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= pageHeight;

      // Handle multi-page overflow
      while (heightLeft > 0) {
        position -= pageHeight; // Shift image up by one page content height
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`form-${employeeName}.pdf`);
      showToast.success('PDF נוצר והורד בהצלחה');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      showToast.error('שגיאה ביצירת PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header Toolbar - Excluded from PDF */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">טופס עובד</h1>
          <p className="text-gray-500 text-sm">צפייה ועריכת פרטי עובד</p>
        </div>
        <Button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="bg-red-600 hover:bg-red-700 text-white gap-2"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          הורד PDF
        </Button>
      </div>

      {/* Main Content Area - Included in PDF */}
      <div ref={pdfContentRef} className="space-y-6 bg-white p-6 rounded-xl">
        {/* Employee Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              פרטי עובד
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>שם מלא</Label>
              <Input value={employeeName} readOnly />
            </div>
            <div className="space-y-2">
              <Label>תעודת זהות</Label>
              <Input value="123456789" readOnly />
            </div>
            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Input value="נהג משאית" readOnly />
            </div>
            <div className="space-y-2">
              <Label>מחלקה</Label>
              <Input value="תפעול" readOnly />
            </div>
          </CardContent>
        </Card>

        {/* Stations Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              תחנות ושיוך
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">תחנת מוצא</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">שם תחנה:</span>
                  <span>מרכז לוגיסטי צפון</span>
                </div>
                <div>
                  <span className="text-gray-500 block">כתובת:</span>
                  <span>חיפה, אזור תעשייה</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">תחנת יעד</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">שם תחנה:</span>
                  <span>סניף תל אביב</span>
                </div>
                <div>
                  <span className="text-gray-500 block">כתובת:</span>
                  <span>תל אביב, דרך בגין 1</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs - Excluded from PDF */}
      {/* (Placeholder for dialogs) */}
    </div>
  );
}
