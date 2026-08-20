import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { listSuppliers } from '@/lib/srvApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Truck } from 'lucide-react';

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Supplier directory, sourced from srv GET /suppliers (real Nati data).
 * Read-only: activation toggles, ratings, and contracts are vendor-portal
 * / vendor-management concerns out of scope for the dispatcher rebuild —
 * see "Out of scope" in the migration plan.
 */
export default function ServiceProvidersPage() {
  const [searchInput, setSearchInput] = useState('');
  const query = useDebouncedValue(searchInput.trim(), 400);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.lookups.suppliers({ query }),
    queryFn: () => listSuppliers(query ? { query } : {}),
  });

  const suppliers = data?.data ?? [];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D]">נותני שירות</h1>
        <p className="text-[#6B778C] text-sm">
          {isLoading ? '...' : `${suppliers.length} ספקים פעילים`}
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
            <Input
              placeholder="חיפוש ספק לפי שם..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="text-center py-12 text-red-600">{error?.message || 'שגיאה בטעינה'}</div>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12 text-[#6B778C]">לא נמצאו ספקים</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {suppliers.map((s) => (
                <Link
                  key={s.kablan_id}
                  to={createPageUrl(`VendorDetails?id=${s.kablan_id}`)}
                  className="flex items-center gap-3 border rounded-lg p-3 hover:shadow-md hover:bg-gray-50 transition-all"
                >
                  <div className="w-9 h-9 rounded-full bg-[#F4F5F7] flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4 text-[#6B778C]" />
                  </div>
                  <span className="font-medium text-[#172B4D] truncate">{s.kablan_name}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
