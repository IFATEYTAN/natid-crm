import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Download, Loader2, TrendingUp, AlertTriangle, CheckCircle, Target, Mail, MessageCircle, FileDown } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function InsightsReportGenerator({ data, stats }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfContentRef = React.useRef(null);

  // Mapping of abbreviations to full Hebrew names
  const serveTypeMapping = {
    'ג': 'גרירה',
    'נ': 'ניידת',
    'א': 'איתור',
    'א+ג': 'איתור + גרירה',
    'ש': 'שמשות',
    'מ': 'מכונאי',
    'צ': 'צמיגים',
    'ד': 'דלק',
    'פ': 'פריצה',
    'ר': 'רדיו דיסק',
    'ח': 'חילוץ',
    'ק': 'קטנוע'
  };

  const getFullServeTypeName = (abbr) => {
    if (!abbr) return 'לא ידוע';
    return serveTypeMapping[abbr] || abbr;
  };

  const generateInsights = async () => {
    setIsGenerating(true);
    
    try {
      // Prepare data summary for AI analysis
      const serveTypeCounts = {};
      const carTypeCounts = {};
      const botMatchByType = {};
      const nayedetFixedByType = {};
      
      data.forEach(d => {
        const serveTypeAbbr = d.serve_type || 'לא ידוע';
        const serveType = getFullServeTypeName(serveTypeAbbr);
        const carType = d.car_type || 'לא ידוע';
        
        serveTypeCounts[serveType] = (serveTypeCounts[serveType] || 0) + 1;
        carTypeCounts[carType] = (carTypeCounts[carType] || 0) + 1;
        
        if (!botMatchByType[serveType]) botMatchByType[serveType] = { total: 0, matches: 0 };
        botMatchByType[serveType].total++;
        if (d.bot_match) botMatchByType[serveType].matches++;
        
        if (!nayedetFixedByType[serveType]) nayedetFixedByType[serveType] = { total: 0, fixed: 0 };
        nayedetFixedByType[serveType].total++;
        if (d.nayedet_fixed) nayedetFixedByType[serveType].fixed++;
      });

      const topServeTypes = Object.entries(serveTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => `${type}: ${count} קריאות`);

      const topCarTypes = Object.entries(carTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => `${type}: ${count} קריאות`);

      const botAccuracyByType = Object.entries(botMatchByType)
        .map(([type, data]) => ({
          type,
          accuracy: data.total > 0 ? ((data.matches / data.total) * 100).toFixed(1) : 0,
          total: data.total
        }))
        .filter(d => d.total >= 10)
        .sort((a, b) => b.accuracy - a.accuracy);

      const prompt = `
אתה מומחה לניתוח נתונים בתחום שירותי דרך וגרירה. נתח את הנתונים הבאים וצור דוח תובנות מקצועי בעברית.

חשוב מאוד: השתמש תמיד בשמות המלאים של סוגי השירות (גרירה, ניידת, איתור, שמשות וכו') ולא בקיצורים או אותיות בודדות!

סיכום נתונים:
- סה"כ קריאות: ${stats.total.toLocaleString()}
- דיוק הבוט: ${stats.botMatchRate}% (${stats.botMatches.toLocaleString()} התאמות)
- תיקוני תפעול: ${stats.nayedetFixedRate}% (${stats.nayedetFixed.toLocaleString()} מקרים)

התפלגות סוגי שירות (Top 5):
${topServeTypes.join('\n')}

התפלגות סוגי רכב (Top 5):
${topCarTypes.join('\n')}

דיוק הבוט לפי סוג שירות:
${botAccuracyByType.slice(0, 5).map(d => `${d.type}: ${d.accuracy}% (${d.total} קריאות)`).join('\n')}

צור דוח עם המבנה הבא (בפורמט JSON). חובה להשתמש בשמות מלאים של סוגי שירות ולא באותיות/קיצורים:
{
  "executive_summary": "סיכום מנהלים של 2-3 משפטים",
  "key_findings": ["ממצא 1", "ממצא 2", "ממצא 3", "ממצא 4"],
  "performance_analysis": {
    "bot_performance": "ניתוח ביצועי הבוט",
    "operational_efficiency": "ניתוח יעילות תפעולית",
    "service_distribution": "ניתוח התפלגות השירותים"
  },
  "recommendations": [
    {"title": "המלצה 1", "description": "פירוט", "priority": "high/medium/low"},
    {"title": "המלצה 2", "description": "פירוט", "priority": "high/medium/low"},
    {"title": "המלצה 3", "description": "פירוט", "priority": "high/medium/low"}
  ],
  "risks_and_opportunities": {
    "risks": ["סיכון 1", "סיכון 2"],
    "opportunities": ["הזדמנות 1", "הזדמנות 2"]
  },
  "action_items": ["פעולה 1", "פעולה 2", "פעולה 3"],
  "conclusion": "מסקנה סופית"
}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            key_findings: { type: "array", items: { type: "string" } },
            performance_analysis: {
              type: "object",
              properties: {
                bot_performance: { type: "string" },
                operational_efficiency: { type: "string" },
                service_distribution: { type: "string" }
              }
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            risks_and_opportunities: {
              type: "object",
              properties: {
                risks: { type: "array", items: { type: "string" } },
                opportunities: { type: "array", items: { type: "string" } }
              }
            },
            action_items: { type: "array", items: { type: "string" } },
            conclusion: { type: "string" }
          }
        }
      });

      setReport({
        ...response,
        stats,
        generatedAt: new Date().toISOString(),
        topServeTypes: Object.entries(serveTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topCarTypes: Object.entries(carTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
        botAccuracyByType: botAccuracyByType.slice(0, 5)
      });
      
      toast.success('הדוח נוצר בהצלחה');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('שגיאה ביצירת הדוח');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    
    // Import dynamically to avoid build size issues
    import('./reportStyles').then(({ generateReportHTML }) => {
      const htmlContent = generateReportHTML(report);

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `דוח_תובנות_נתי_${new Date().toISOString().split('T')[0]}.html`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('הדוח הורד בהצלחה - ניתן לפתוח בדפדפן ולהדפיס ל-PDF');
    });
  };

  const sendByEmail = async () => {
    if (!emailAddress || !report) return;
    
    setIsSendingEmail(true);
    try {
      const summaryText = `
דוח תובנות - נתי שירותי דרך
תאריך: ${new Date().toLocaleDateString('he-IL')}

📊 נתונים עיקריים:
• סה"כ קריאות: ${report.stats.total.toLocaleString()}
• דיוק הבוט: ${report.stats.botMatchRate}%
• תיקוני תפעול: ${report.stats.nayedetFixedRate}%

📝 סיכום מנהלים:
${report.executive_summary}

🔍 ממצאים מרכזיים:
${report.key_findings?.map((f, i) => `${i + 1}. ${f}`).join('\n')}

💡 המלצות:
${report.recommendations?.map(r => `• ${r.title}: ${r.description}`).join('\n')}

✅ פעולות נדרשות:
${report.action_items?.map((a, i) => `${i + 1}. ${a}`).join('\n')}

🎯 מסקנה:
${report.conclusion}
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: emailAddress,
        subject: `דוח תובנות - נתי שירותי דרך - ${new Date().toLocaleDateString('he-IL')}`,
        body: summaryText
      });
      
      toast.success('הדוח נשלח בהצלחה!');
      setEmailAddress('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('שגיאה בשליחת המייל');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const shareOnWhatsApp = () => {
    if (!report) return;
    
    const text = `📊 *דוח תובנות - נתי שירותי דרך*
📅 ${new Date().toLocaleDateString('he-IL')}

*נתונים עיקריים:*
• סה"כ קריאות: ${report.stats.total.toLocaleString()}
• דיוק הבוט: ${report.stats.botMatchRate}%

*סיכום:*
${report.executive_summary}

*המלצות עיקריות:*
${report.recommendations?.slice(0, 2).map(r => `• ${r.title}`).join('\n')}

*מסקנה:*
${report.conclusion}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const downloadPDF = async () => {
    if (!pdfContentRef.current || !report) return;
    
    setIsGeneratingPDF(true);
    try {
      const { exportToPDF } = await import('./pdfExporter');
      await exportToPDF(
        pdfContentRef.current, 
        `דוח_תובנות_נתי_${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast.success('הדוח הורד בהצלחה כ-PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('שגיאה ביצירת ה-PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <FileText className="w-4 h-4" />
          דוח תובנות מקצועי
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">יצירת דוח תובנות מקצועי</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {!report ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">צור דוח תובנות מבוסס AI</h3>
              <p className="text-gray-500 mb-6 text-sm">
                הדוח יכלול ניתוח מעמיק של הנתונים, ממצאים מרכזיים, המלצות לשיפור, וסיכום מנהלים
              </p>
              <Button 
                onClick={generateInsights} 
                disabled={isGenerating}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    מנתח נתונים...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    צור דוח תובנות
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview - PDF Content */}
              <div ref={pdfContentRef} className="bg-gray-50 rounded-lg p-4 border">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  הדוח נוצר בהצלחה!
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">סיכום מנהלים:</p>
                    <p className="text-sm bg-white p-3 rounded border">{report.executive_summary}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">ממצאים מרכזיים:</p>
                    <ul className="text-sm space-y-1">
                      {report.key_findings?.slice(0, 3).map((finding, i) => (
                        <li key={i} className="flex items-start gap-2 bg-white p-2 rounded border">
                          <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">המלצות עיקריות:</p>
                    <ul className="text-sm space-y-1">
                      {report.recommendations?.slice(0, 2).map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 bg-white p-2 rounded border">
                          <Target className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span><strong>{rec.title}:</strong> {rec.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={downloadPDF} 
                  disabled={isGeneratingPDF}
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  הורד דוח PDF
                </Button>
                <Button onClick={downloadReport} variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  HTML
                </Button>
                <Button variant="outline" onClick={() => setReport(null)}>
                  צור מחדש
                </Button>
              </div>

              {/* Share Options */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium mb-3">שתף את הדוח:</p>
                
                <div className="flex gap-2 mb-3">
                  <Input
                    type="email"
                    placeholder="הזן כתובת מייל..."
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={sendByEmail} 
                    disabled={!emailAddress || isSendingEmail}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    שלח
                  </Button>
                </div>
                
                <Button 
                  onClick={shareOnWhatsApp} 
                  variant="outline" 
                  className="w-full gap-2 border-green-500 text-green-600 hover:bg-green-50"
                >
                  <MessageCircle className="w-4 h-4" />
                  שתף בווטסאפ
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                💡 הורד את הדוח כ-PDF בעברית מלאה או כ-HTML לעיצוב מתקדם
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}