import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Download, Loader2, TrendingUp, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function InsightsReportGenerator({ data, stats }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState(null);

  const generateInsights = async () => {
    setIsGenerating(true);
    
    try {
      // Prepare data summary for AI analysis
      const serveTypeCounts = {};
      const carTypeCounts = {};
      const botMatchByType = {};
      const nayedetFixedByType = {};
      
      data.forEach(d => {
        const serveType = d.serve_type || 'לא ידוע';
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

צור דוח עם המבנה הבא (בפורמט JSON):
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

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>דוח תובנות - נתי שירותי דרך</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Heebo', Arial, sans-serif;
      background: #f8f9fa;
      color: #1a1a2e;
      line-height: 1.7;
      direction: rtl;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 40px rgba(0,0,0,0.1);
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%);
      color: white;
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
    }
    
    .header-content {
      position: relative;
      z-index: 1;
    }
    
    .logo-container {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .logo {
      height: 60px;
      filter: brightness(0) invert(1);
    }
    
    .company-name {
      font-size: 28px;
      font-weight: 700;
    }
    
    .report-title {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .report-subtitle {
      font-size: 18px;
      opacity: 0.9;
    }
    
    .report-date {
      margin-top: 20px;
      font-size: 14px;
      opacity: 0.8;
    }
    
    /* Stats Bar */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: #1a1a2e;
      color: white;
    }
    
    .stat-item {
      padding: 25px 20px;
      text-align: center;
      border-left: 1px solid rgba(255,255,255,0.1);
    }
    
    .stat-item:last-child {
      border-left: none;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #FF0000;
    }
    
    .stat-label {
      font-size: 13px;
      opacity: 0.8;
      margin-top: 5px;
    }
    
    /* Content */
    .content {
      padding: 50px;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #FF0000;
      display: inline-block;
    }
    
    .executive-summary {
      background: linear-gradient(135deg, #fff5f5 0%, #fff 100%);
      border-right: 4px solid #FF0000;
      padding: 25px;
      font-size: 17px;
      line-height: 1.8;
      border-radius: 0 10px 10px 0;
    }
    
    /* Findings */
    .findings-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .finding-card {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      border-right: 4px solid #FF0000;
    }
    
    .finding-number {
      display: inline-block;
      width: 28px;
      height: 28px;
      background: #FF0000;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-weight: 700;
      font-size: 14px;
      margin-left: 10px;
    }
    
    /* Analysis */
    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    
    .analysis-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 25px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    
    .analysis-card h4 {
      color: #FF0000;
      font-size: 15px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .analysis-card p {
      font-size: 14px;
      color: #555;
      line-height: 1.6;
    }
    
    /* Recommendations */
    .recommendation {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 15px;
      display: flex;
      gap: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    
    .recommendation-priority {
      width: 6px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    
    .recommendation-priority.high { background: #FF0000; }
    .recommendation-priority.medium { background: #f59e0b; }
    .recommendation-priority.low { background: #10b981; }
    
    .recommendation-content h4 {
      font-size: 16px;
      color: #1a1a2e;
      margin-bottom: 8px;
    }
    
    .recommendation-content p {
      font-size: 14px;
      color: #666;
    }
    
    .priority-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 10px;
    }
    
    .priority-badge.high { background: #fee2e2; color: #FF0000; }
    .priority-badge.medium { background: #fef3c7; color: #d97706; }
    .priority-badge.low { background: #d1fae5; color: #059669; }
    
    /* Risks & Opportunities */
    .risk-opp-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 30px;
    }
    
    .risk-card, .opp-card {
      border-radius: 10px;
      padding: 25px;
    }
    
    .risk-card {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }
    
    .opp-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }
    
    .risk-card h4 {
      color: #dc2626;
      margin-bottom: 15px;
    }
    
    .opp-card h4 {
      color: #16a34a;
      margin-bottom: 15px;
    }
    
    .risk-card ul, .opp-card ul {
      list-style: none;
    }
    
    .risk-card li, .opp-card li {
      padding: 8px 0;
      padding-right: 25px;
      position: relative;
      font-size: 14px;
    }
    
    .risk-card li::before {
      content: '⚠';
      position: absolute;
      right: 0;
    }
    
    .opp-card li::before {
      content: '✓';
      position: absolute;
      right: 0;
      color: #16a34a;
      font-weight: bold;
    }
    
    /* Action Items */
    .action-items {
      background: #1a1a2e;
      border-radius: 10px;
      padding: 30px;
      color: white;
    }
    
    .action-items h3 {
      color: #FF0000;
      margin-bottom: 20px;
    }
    
    .action-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .action-item:last-child {
      border-bottom: none;
    }
    
    .action-number {
      width: 30px;
      height: 30px;
      background: #FF0000;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
    }
    
    /* Conclusion */
    .conclusion {
      background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
      color: white;
      padding: 40px;
      border-radius: 10px;
      text-align: center;
    }
    
    .conclusion h3 {
      color: #FF0000;
      margin-bottom: 15px;
      font-size: 20px;
    }
    
    .conclusion p {
      font-size: 16px;
      line-height: 1.8;
      max-width: 700px;
      margin: 0 auto;
    }
    
    /* Footer */
    .footer {
      background: #1a1a2e;
      color: white;
      padding: 30px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .footer-text {
      font-size: 13px;
      opacity: 0.7;
    }
    
    .footer-logo {
      height: 40px;
      filter: brightness(0) invert(1);
    }
    
    /* Print Styles */
    @media print {
      body { background: white; }
      .container { box-shadow: none; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .stats-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="header-content">
        <div class="logo-container">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png" alt="נתי" class="logo">
        </div>
        <h1 class="report-title">דוח תובנות וניתוח ביצועים</h1>
        <p class="report-subtitle">ניתוח מעמיק של נתוני קריאות השירות והמלצות לשיפור</p>
        <p class="report-date">תאריך הפקה: ${new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </header>
    
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-value">${report.stats.total.toLocaleString()}</div>
        <div class="stat-label">סה"כ קריאות</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${report.stats.botMatchRate}%</div>
        <div class="stat-label">דיוק הבוט</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${report.stats.nayedetFixedRate}%</div>
        <div class="stat-label">תיקוני תפעול</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${report.topServeTypes?.length || 0}</div>
        <div class="stat-label">סוגי שירות</div>
      </div>
    </div>
    
    <div class="content">
      <section class="section">
        <h2 class="section-title">סיכום מנהלים</h2>
        <div class="executive-summary">
          ${report.executive_summary}
        </div>
      </section>
      
      <section class="section">
        <h2 class="section-title">ממצאים מרכזיים</h2>
        <div class="findings-grid">
          ${report.key_findings?.map((finding, i) => `
            <div class="finding-card">
              <span class="finding-number">${i + 1}</span>
              ${finding}
            </div>
          `).join('') || ''}
        </div>
      </section>
      
      <section class="section">
        <h2 class="section-title">ניתוח ביצועים</h2>
        <div class="analysis-grid">
          <div class="analysis-card">
            <h4>🤖 ביצועי הבוט</h4>
            <p>${report.performance_analysis?.bot_performance || ''}</p>
          </div>
          <div class="analysis-card">
            <h4>⚙️ יעילות תפעולית</h4>
            <p>${report.performance_analysis?.operational_efficiency || ''}</p>
          </div>
          <div class="analysis-card">
            <h4>📊 התפלגות שירותים</h4>
            <p>${report.performance_analysis?.service_distribution || ''}</p>
          </div>
        </div>
      </section>
      
      <section class="section">
        <h2 class="section-title">המלצות</h2>
        ${report.recommendations?.map(rec => `
          <div class="recommendation">
            <div class="recommendation-priority ${rec.priority}"></div>
            <div class="recommendation-content">
              <h4>
                ${rec.title}
                <span class="priority-badge ${rec.priority}">
                  ${rec.priority === 'high' ? 'עדיפות גבוהה' : rec.priority === 'medium' ? 'עדיפות בינונית' : 'עדיפות נמוכה'}
                </span>
              </h4>
              <p>${rec.description}</p>
            </div>
          </div>
        `).join('') || ''}
      </section>
      
      <section class="section">
        <h2 class="section-title">סיכונים והזדמנויות</h2>
        <div class="risk-opp-grid">
          <div class="risk-card">
            <h4>⚠️ סיכונים לתשומת לב</h4>
            <ul>
              ${report.risks_and_opportunities?.risks?.map(risk => `<li>${risk}</li>`).join('') || ''}
            </ul>
          </div>
          <div class="opp-card">
            <h4>✨ הזדמנויות לשיפור</h4>
            <ul>
              ${report.risks_and_opportunities?.opportunities?.map(opp => `<li>${opp}</li>`).join('') || ''}
            </ul>
          </div>
        </div>
      </section>
      
      <section class="section">
        <div class="action-items">
          <h3>📋 פעולות נדרשות</h3>
          ${report.action_items?.map((item, i) => `
            <div class="action-item">
              <span class="action-number">${i + 1}</span>
              <span>${item}</span>
            </div>
          `).join('') || ''}
        </div>
      </section>
      
      <section class="section">
        <div class="conclusion">
          <h3>מסקנות</h3>
          <p>${report.conclusion}</p>
        </div>
      </section>
    </div>
    
    <footer class="footer">
      <div class="footer-text">
        דוח זה הופק אוטומטית על ידי מערכת נתי CRM | כל הזכויות שמורות © ${new Date().getFullYear()}
      </div>
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png" alt="נתי" class="footer-logo">
    </footer>
  </div>
</body>
</html>
`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `דוח_תובנות_נתי_${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('הדוח הורד בהצלחה - ניתן לפתוח בדפדפן ולהדפיס ל-PDF');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#1a1a2e] hover:bg-[#2d2d44]">
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
                className="gap-2 bg-red-600 hover:bg-red-700"
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
              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4 border">
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
                          <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
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
                <Button onClick={downloadReport} className="flex-1 gap-2 bg-red-600 hover:bg-red-700">
                  <Download className="w-4 h-4" />
                  הורד דוח HTML מעוצב
                </Button>
                <Button variant="outline" onClick={() => setReport(null)}>
                  צור מחדש
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                💡 פתח את קובץ ה-HTML בדפדפן ולחץ Ctrl+P להדפסה או שמירה כ-PDF
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}