import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/ui/FeedbackToast';

const MONTHS = [
  { value: '1', label: 'ינואר' },
  { value: '2', label: 'פברואר' },
  { value: '3', label: 'מרץ' },
  { value: '4', label: 'אפריל' },
  { value: '5', label: 'מאי' },
  { value: '6', label: 'יוני' },
  { value: '7', label: 'יולי' },
  { value: '8', label: 'אוגוסט' },
  { value: '9', label: 'ספטמבר' },
  { value: '10', label: 'אוקטובר' },
  { value: '11', label: 'נובמבר' },
  { value: '12', label: 'דצמבר' },
];

export default function VendorPDFDownload({ vendorId }) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [isGenerating, setIsGenerating] = useState(false);

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
    years.push(String(y));
  }

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateVendorPDF', {
        vendor_id: vendorId,
        month: parseInt(month),
        year: parseInt(year),
      });

      // The response is an axios response; for binary data we need to handle it
      // Since the function returns PDF bytes, we construct a download from the response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendor_report_${month}_${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast.success('הדוח הורד בהצלחה');
    } catch (error) {
      showToast.error('שגיאה ביצירת הדוח');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger className="w-28 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={setYear}>
        <SelectTrigger className="w-24 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        onClick={handleDownload}
        disabled={isGenerating}
        size="sm"
        className="gap-1"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        הורד דוח PDF
      </Button>
    </div>
  );
}