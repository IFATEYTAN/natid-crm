export const getReportStyles = () => `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Heebo',Arial,sans-serif;background:#f8f9fa;color:#1e3a5f;line-height:1.7;direction:rtl}
.container{max-width:900px;margin:0 auto;background:#fff;box-shadow:0 0 40px rgba(0,0,0,.1)}
.header{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:40px;position:relative}
.logo{height:60px;filter:brightness(0) invert(1)}
.report-title{font-size:32px;font-weight:700;margin:20px 0 10px}
.report-subtitle{font-size:16px;opacity:.9}
.report-date{margin-top:15px;font-size:13px;opacity:.8}
.stats-bar{display:grid;grid-template-columns:repeat(4,1fr);background:#1e3a5f;color:#fff}
.stat-item{padding:20px;text-align:center;border-left:1px solid rgba(255,255,255,.1)}
.stat-item:last-child{border-left:none}
.stat-value{font-size:28px;font-weight:700;color:#3b82f6}
.stat-label{font-size:12px;opacity:.8;margin-top:5px}
.content{padding:40px}
.section{margin-bottom:35px}
.section-title{font-size:20px;font-weight:700;color:#1e3a5f;margin-bottom:15px;padding-bottom:8px;border-bottom:3px solid #2563eb;display:inline-block}
.executive-summary{background:#eff6ff;border-right:4px solid #2563eb;padding:20px;font-size:15px;line-height:1.8;border-radius:0 8px 8px 0}
.findings-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}
.finding-card{background:#f8f9fa;border-radius:8px;padding:15px;border-right:4px solid #2563eb}
.finding-number{display:inline-block;width:24px;height:24px;background:#2563eb;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-left:8px}
.analysis-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}
.analysis-card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:20px}
.analysis-card h4{color:#2563eb;font-size:14px;margin-bottom:10px}
.analysis-card p{font-size:13px;color:#555;line-height:1.6}
.recommendation{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:15px;margin-bottom:12px;display:flex;gap:12px}
.recommendation-priority{width:5px;border-radius:3px;flex-shrink:0}
.recommendation-priority.high{background:#dc2626}
.recommendation-priority.medium{background:#f59e0b}
.recommendation-priority.low{background:#10b981}
.recommendation-content h4{font-size:15px;color:#1e3a5f;margin-bottom:6px}
.recommendation-content p{font-size:13px;color:#666}
.priority-badge{display:inline-block;padding:2px 8px;border-radius:15px;font-size:10px;font-weight:600;margin-right:8px}
.priority-badge.high{background:#fee2e2;color:#dc2626}
.priority-badge.medium{background:#fef3c7;color:#d97706}
.priority-badge.low{background:#d1fae5;color:#059669}
.risk-opp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.risk-card{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px}
.opp-card{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px}
.risk-card h4{color:#dc2626;margin-bottom:12px}
.opp-card h4{color:#16a34a;margin-bottom:12px}
.risk-card ul,.opp-card ul{list-style:none}
.risk-card li,.opp-card li{padding:6px 0;padding-right:20px;position:relative;font-size:13px}
.risk-card li::before{content:'⚠';position:absolute;right:0}
.opp-card li::before{content:'✓';position:absolute;right:0;color:#16a34a;font-weight:bold}
.action-items{background:#1e3a5f;border-radius:8px;padding:25px;color:#fff}
.action-items h3{color:#3b82f6;margin-bottom:15px}
.action-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.1)}
.action-item:last-child{border-bottom:none}
.action-number{width:26px;height:26px;background:#2563eb;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px}
.conclusion{background:linear-gradient(135deg,#1e3a5f,#2d4a6f);color:#fff;padding:30px;border-radius:8px;text-align:center}
.conclusion h3{color:#3b82f6;margin-bottom:12px;font-size:18px}
.conclusion p{font-size:14px;line-height:1.8}
.footer{background:#1e3a5f;color:#fff;padding:25px 40px;display:flex;justify-content:space-between;align-items:center}
.footer-text{font-size:12px;opacity:.7}
.footer-logo{height:35px;filter:brightness(0) invert(1)}
@media print{body{background:#fff}.container{box-shadow:none}}
`;

export const generateReportHTML = (report) => {
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png";
  const currentDate = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>דוח תובנות - נתי שירותי דרך</title>
<style>${getReportStyles()}</style>
</head>
<body>
<div class="container">
<header class="header">
<div class="header-content">
<div class="logo-container">
<img src="${logoUrl}" alt="נתי" class="logo">
</div>
<h1 class="report-title">דוח תובנות וניתוח ביצועים</h1>
<p class="report-subtitle">ניתוח מעמיק של נתוני קריאות השירות והמלצות לשיפור</p>
<p class="report-date">תאריך הפקה: ${currentDate}</p>
</div>
</header>
<div class="stats-bar">
<div class="stat-item"><div class="stat-value">${report.stats.total.toLocaleString()}</div><div class="stat-label">סה"כ קריאות</div></div>
<div class="stat-item"><div class="stat-value">${report.stats.botMatchRate}%</div><div class="stat-label">דיוק הבוט</div></div>
<div class="stat-item"><div class="stat-value">${report.stats.nayedetFixedRate}%</div><div class="stat-label">תיקוני תפעול</div></div>
<div class="stat-item"><div class="stat-value">${report.topServeTypes?.length || 0}</div><div class="stat-label">סוגי שירות</div></div>
</div>
<div class="content">
<section class="section">
<h2 class="section-title">סיכום מנהלים</h2>
<div class="executive-summary">${report.executive_summary}</div>
</section>
<section class="section">
<h2 class="section-title">ממצאים מרכזיים</h2>
<div class="findings-grid">
${report.key_findings?.map((f, i) => `<div class="finding-card"><span class="finding-number">${i + 1}</span>${f}</div>`).join('') || ''}
</div>
</section>
<section class="section">
<h2 class="section-title">ניתוח ביצועים</h2>
<div class="analysis-grid">
<div class="analysis-card"><h4>🤖 ביצועי הבוט</h4><p>${report.performance_analysis?.bot_performance || ''}</p></div>
<div class="analysis-card"><h4>⚙️ יעילות תפעולית</h4><p>${report.performance_analysis?.operational_efficiency || ''}</p></div>
<div class="analysis-card"><h4>📊 התפלגות שירותים</h4><p>${report.performance_analysis?.service_distribution || ''}</p></div>
</div>
</section>
<section class="section">
<h2 class="section-title">המלצות</h2>
${report.recommendations?.map(r => `<div class="recommendation"><div class="recommendation-priority ${r.priority}"></div><div class="recommendation-content"><h4>${r.title}<span class="priority-badge ${r.priority}">${r.priority === 'high' ? 'עדיפות גבוהה' : r.priority === 'medium' ? 'עדיפות בינונית' : 'עדיפות נמוכה'}</span></h4><p>${r.description}</p></div></div>`).join('') || ''}
</section>
<section class="section">
<h2 class="section-title">סיכונים והזדמנויות</h2>
<div class="risk-opp-grid">
<div class="risk-card"><h4>⚠️ סיכונים לתשומת לב</h4><ul>${report.risks_and_opportunities?.risks?.map(r => `<li>${r}</li>`).join('') || ''}</ul></div>
<div class="opp-card"><h4>✨ הזדמנויות לשיפור</h4><ul>${report.risks_and_opportunities?.opportunities?.map(o => `<li>${o}</li>`).join('') || ''}</ul></div>
</div>
</section>
<section class="section">
<div class="action-items"><h3>📋 פעולות נדרשות</h3>${report.action_items?.map((a, i) => `<div class="action-item"><span class="action-number">${i + 1}</span><span>${a}</span></div>`).join('') || ''}</div>
</section>
<section class="section">
<div class="conclusion"><h3>מסקנות</h3><p>${report.conclusion}</p></div>
</section>
</div>
<footer class="footer">
<div class="footer-text">דוח זה הופק אוטומטית על ידי מערכת נתי CRM | כל הזכויות שמורות © ${currentYear}</div>
<img src="${logoUrl}" alt="נתי" class="footer-logo">
</footer>
</div>
</body>
</html>`;
};