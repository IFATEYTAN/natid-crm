import * as XLSX from 'xlsx';

// ─── Excel (real .xlsx) ───────────────────────────────────────────────────────
export function exportToExcel(data, filename, title = '') {
  if (!data || data.length === 0) return;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data, { cellStyles: true });

  // Column widths – auto-fit up to 40 chars
  const cols = Object.keys(data[0]).map(k => ({
    wch: Math.min(40, Math.max(k.length, ...data.map(r => String(r[k] ?? '').length)))
  }));
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, title || filename.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── HTML table → styled RTL A4 HTML file ────────────────────────────────────
export function exportToHTML(data, filename, title = '') {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);

  const rows = data.map(row =>
    `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
  ).join('\n');

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${title || filename}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Heebo',Arial,sans-serif;direction:rtl;background:#fff;color:#111827;font-size:11pt}
  @page{size:A4 landscape;margin:15mm}
  .header{padding:8px 0 16px;border-bottom:2px solid #3b82f6;margin-bottom:16px}
  .header h1{font-size:18pt;font-weight:700;color:#1e3a5f}
  .header p{color:#6b7280;font-size:10pt;margin-top:4px}
  table{width:100%;border-collapse:collapse;table-layout:fixed;word-break:break-word}
  th{background:#1e3a5f;color:#fff;padding:7px 8px;font-size:10pt;font-weight:600;text-align:right;border:1px solid #1e40af}
  td{padding:6px 8px;border:1px solid #e5e7eb;font-size:9.5pt;text-align:right;vertical-align:top}
  tr:nth-child(even) td{background:#f0f7ff}
  tr:hover td{background:#dbeafe}
  .footer{margin-top:12px;color:#9ca3af;font-size:8.5pt;text-align:center}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="header">
  <h1>${title || filename}</h1>
  <p>תאריך הפקה: ${new Date().toLocaleDateString('he-IL')} | ${data.length} שורות</p>
</div>
<table>
<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="footer">הופק על ידי מערכת Natid CRM</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.html`; a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF via print-ready HTML (opens print dialog) ───────────────────────────
export function exportToPDF(data, filename, title = '') {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);

  const rows = data.map(row =>
    `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
  ).join('\n');

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${title || filename}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Heebo',Arial,sans-serif;direction:rtl;background:#fff;color:#111827;font-size:9pt}
  @page{size:A4 landscape;margin:12mm}
  .header{padding:6px 0 12px;border-bottom:2px solid #3b82f6;margin-bottom:12px}
  .header h1{font-size:15pt;font-weight:700;color:#1e3a5f}
  .header p{color:#6b7280;font-size:8.5pt;margin-top:3px}
  table{width:100%;border-collapse:collapse;table-layout:fixed;word-break:break-word}
  th{background:#1e3a5f;color:#fff;padding:5px 6px;font-size:8pt;font-weight:700;text-align:right;border:1px solid #1e40af}
  td{padding:4px 6px;border:1px solid #d1d5db;font-size:8pt;text-align:right;vertical-align:top}
  tr:nth-child(even) td{background:#eff6ff}
  .footer{margin-top:10px;color:#9ca3af;font-size:7.5pt;text-align:center}
  @media print{
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{margin:0}
    .no-print{display:none}
  }
</style>
</head>
<body>
<div class="header">
  <h1>${title || filename}</h1>
  <p>תאריך הפקה: ${new Date().toLocaleDateString('he-IL')} | ${data.length} רשומות</p>
</div>
<table>
<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="footer">הופק על ידי מערכת Natid CRM</div>
<script>window.onload=()=>{window.print();}<\/script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}