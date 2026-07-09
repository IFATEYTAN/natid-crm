import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { resolveAppRole } from './_shared/appRole.ts';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { vendor_id, month, year } = await req.json();

  if (!vendor_id) {
    return Response.json({ error: 'vendor_id is required' }, { status: 400 });
  }

  // Fetch vendor profile
  const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: vendor_id });
  if (vendors.length === 0) {
    return Response.json({ error: 'Vendor not found' }, { status: 404 });
  }
  const vendor = vendors[0];

  const appRole = await resolveAppRole(base44, user);

  // Vendor users can only generate their own report
  if (appRole === 'vendor' && vendor.email !== user.email) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch calls for this vendor
  const allCalls = await base44.asServiceRole.entities.Call.filter(
    { assigned_vendor_id: vendor_id },
    '-created_date',
    5000
  );

  // Filter by month/year if provided
  const now = new Date();
  const targetMonth = month || (now.getMonth() + 1);
  const targetYear = year || now.getFullYear();

  const calls = allCalls.filter((c) => {
    if (!c.created_date) return false;
    const d = new Date(c.created_date);
    return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
  });

  const completedCalls = calls.filter((c) => c.call_status === 'completed');
  const totalDistance = completedCalls.reduce((sum, c) => sum + (c.actual_distance_km || c.estimated_distance_km || 0), 0);
  const totalCost = completedCalls.reduce((sum, c) => sum + (c.cost_to_vendor || 0), 0);

  // Build PDF
  const doc = new jsPDF({ putOnlyUsedFonts: true });

  // Title
  doc.setFontSize(22);
  doc.text('Vendor Performance Report', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`${vendor.vendor_name}`, 105, 30, { align: 'center' });
  doc.text(`${targetMonth}/${targetYear}`, 105, 38, { align: 'center' });

  // Summary stats
  doc.setFontSize(14);
  doc.text('Summary', 20, 55);

  doc.setFontSize(11);
  const stats = [
    ['Total Calls', String(calls.length)],
    ['Completed', String(completedCalls.length)],
    ['Completion Rate', calls.length > 0 ? `${Math.round((completedCalls.length / calls.length) * 100)}%` : 'N/A'],
    ['Total Distance (km)', String(Math.round(totalDistance))],
    ['Total Cost (ILS)', totalCost.toFixed(2)],
    ['Avg Rating', vendor.average_rating ? vendor.average_rating.toFixed(1) : 'N/A'],
  ];

  let y = 65;
  stats.forEach(([label, value]) => {
    doc.text(`${label}:`, 25, y);
    doc.text(value, 100, y);
    y += 8;
  });

  // Calls table header
  y += 10;
  doc.setFontSize(14);
  doc.text('Calls Detail', 20, y);
  y += 10;

  doc.setFontSize(9);
  doc.text('Call #', 20, y);
  doc.text('Date', 50, y);
  doc.text('Status', 85, y);
  doc.text('Issue', 115, y);
  doc.text('Distance', 155, y);
  doc.text('Cost', 180, y);
  y += 2;
  doc.line(20, y, 195, y);
  y += 5;

  // Calls rows
  calls.slice(0, 60).forEach((call) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    const date = call.created_date ? new Date(call.created_date).toLocaleDateString('he-IL') : '-';
    doc.text(call.call_number || '-', 20, y);
    doc.text(date, 50, y);
    doc.text(call.call_status || '-', 85, y);
    doc.text((call.issue_type || '-').substring(0, 15), 115, y);
    doc.text(String(call.actual_distance_km || call.estimated_distance_km || '-'), 155, y);
    doc.text(call.cost_to_vendor ? call.cost_to_vendor.toFixed(0) : '-', 180, y);
    y += 7;
  });

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toISOString()}`, 20, 290);

  const pdfBytes = doc.output('arraybuffer');

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=vendor_report_${targetMonth}_${targetYear}.pdf`,
    },
  });
});