import React, { useState, useMemo } from "react";
import { useCalls } from "./hooks/useCalls";
import CallsTable from "./CallsTable";
import CallsFilters from "./CallsFilters";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function CallsFeature() {
  const [filters, setFilters] = useState({});
  // We pass empty object to fetch all, then filter client-side for search/complex filters 
  // (since the basic list API might not support all filters yet, or we optimize by fetching once)
  // Ideally, the API should handle filtering. For now, we'll fetch all and filter in memory if needed, 
  // or pass basic filters if the API supports them. 
  // The current useCalls implementation passes options to .list(). 
  // Base44 list() usually takes sort and limit. 
  // To support filtering, we should use .filter() in the API or filter client side.
  // The provided api.js uses .list(). Let's assume client-side filtering for now for search.
  
  const { data: calls = [], isLoading, error } = useCalls();

  const filteredCalls = useMemo(() => {
    let result = calls;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(call => 
        call.customer_name?.toLowerCase().includes(searchLower) ||
        call.call_number?.toLowerCase().includes(searchLower) ||
        call.customer_phone?.includes(searchLower)
      );
    }

    if (filters.status) {
      result = result.filter(call => call.call_status === filters.status);
    }

    if (filters.priority) {
      result = result.filter(call => call.call_priority === filters.priority);
    }

    return result;
  }, [calls, filters]);

  if (error) {
    return <ErrorMessage error={error} title="שגיאה בטעינת הקריאות" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול קריאות שירות</h1>
          <p className="text-gray-500 mt-1">צפייה, סינון וניהול של כל הקריאות במערכת</p>
        </div>
        <Link to={createPageUrl('NewCase')}>
          <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4 mr-2" />
            קריאה חדשה
          </Button>
        </Link>
      </div>

      <CallsFilters onFiltersChange={setFilters} />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            מציג <span className="font-bold text-gray-900">{filteredCalls.length}</span> קריאות
          </div>
        </div>
        <CallsTable calls={filteredCalls} isLoading={isLoading} />
      </div>
    </div>
  );
}