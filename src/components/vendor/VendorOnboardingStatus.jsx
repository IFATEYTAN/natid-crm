import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, User, Mail, Phone, MapPin, Shield } from 'lucide-react';

function StatusIcon({ ok }) {
  return ok
    ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
    : <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
}

function getVendorReadiness(vendor, users) {
  const linkedUser = users.find(u => u.email === vendor.email);
  const hasEmail = !!vendor.email;
  const hasPhone = !!vendor.phone;
  const hasUser = !!linkedUser;
  const isVendorRole = linkedUser?.role === 'vendor' || linkedUser?.role === 'ספק';
  const hasCoverage = vendor.coverage_areas?.length > 0;
  const hasServiceType = vendor.service_type?.length > 0;

  const checks = [
    { key: 'email', label: 'אימייל מקושר', ok: hasEmail },
    { key: 'user', label: 'חשבון משתמש', ok: hasUser },
    { key: 'role', label: 'תפקיד ספק', ok: isVendorRole },
    { key: 'phone', label: 'טלפון', ok: hasPhone },
    { key: 'coverage', label: 'אזורי כיסוי', ok: hasCoverage },
    { key: 'service', label: 'סוגי שירות', ok: hasServiceType },
  ];

  const score = checks.filter(c => c.ok).length;
  const total = checks.length;
  const ready = score === total;

  return { checks, score, total, ready, linkedUser };
}

export default function VendorOnboardingStatus({ vendors = [], users = [] }) {
  const enriched = vendors.map(v => ({
    vendor: v,
    ...getVendorReadiness(v, users),
  }));

  // Sort: not-ready first, then by score ascending
  enriched.sort((a, b) => {
    if (a.ready !== b.ready) return a.ready ? 1 : -1;
    return a.score - b.score;
  });

  return (
    <div className="space-y-3">
      {enriched.map(({ vendor, checks, score, total, ready }) => (
        <Card key={vendor.id} className={ready ? 'border-green-200' : 'border-amber-200'}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm">{vendor.vendor_name}</h3>
                {vendor.email && (
                  <p className="text-xs text-gray-500" dir="ltr">{vendor.email}</p>
                )}
              </div>
              <Badge className={ready
                ? 'bg-green-100 text-green-800'
                : score >= 4
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-800'
              }>
                {ready ? 'מוכן' : `${score}/${total}`}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {checks.map(check => (
                <div key={check.key} className="flex items-center gap-1.5 text-xs">
                  <StatusIcon ok={check.ok} />
                  <span className={check.ok ? 'text-gray-700' : 'text-gray-400'}>{check.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}