import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User, Car, Phone } from 'lucide-react';
import { queryKeys } from '@/lib/queryKeys';
import { searchClients } from '@/lib/srvApi';

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Client/subscription search — real Nati data via srv GET /clients. Not the
 * same concept as the old base44 "Customer" entity (a B2B insurance-
 * company/fleet account); this searches individual policyholders and their
 * subscriptions by name, ID number, phone, subscription number, or plate,
 * matching PHP f_client_search().
 */
export default function CustomersPage() {
  const [searchInput, setSearchInput] = useState('');
  const q = useDebouncedValue(searchInput.trim(), 400);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: queryKeys.clientSearch.results(q, {}),
    queryFn: () => searchClients({ q }),
    enabled: q.length > 0,
  });

  const results = data?.data ?? [];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D]">חיפוש לקוחות ומנויים</h1>
        <p className="text-[#6B778C] text-sm">חיפוש לפי שם, ת.ז., טלפון, מספר מנוי או מספר רכב</p>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
            <Input
              placeholder="הקלד לחיפוש..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="ps-10"
              autoFocus
            />
          </div>
        </CardHeader>
        <CardContent>
          {q.length === 0 ? (
            <div className="text-center py-12 text-[#6B778C]">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>הקלידו לפחות תו אחד כדי לחפש</p>
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-600">{error?.message || 'שגיאה בחיפוש'}</div>
          ) : isLoading || isFetching ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-[#6B778C]">לא נמצאו תוצאות</div>
          ) : (
            <div className="space-y-2">
              {results.map((r) => (
                <Link
                  key={r.sub_id}
                  to={createPageUrl(`CustomerDetails?id=${r.sub_id}`)}
                  className="block border rounded-lg p-3 hover:shadow-md hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#6B778C] shrink-0" />
                        <span className="font-semibold text-[#172B4D] truncate">
                          {r.full_name || '—'}
                        </span>
                        {r.vip === 1 && (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">VIP</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6B778C] mt-1">
                        <span className="flex items-center gap-1">
                          <Car className="w-3 h-3" /> <span dir="ltr">{r.car_number || '—'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> <span dir="ltr">{r.client_tel || '—'}</span>
                        </span>
                        <span dir="ltr">מנוי #{r.sub_num}</span>
                        {r.pac_name && <span>{r.pac_name}</span>}
                      </div>
                    </div>
                    {r.agent_name && (
                      <span className="text-xs text-[#6B778C] whitespace-nowrap">
                        {r.agent_name}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
