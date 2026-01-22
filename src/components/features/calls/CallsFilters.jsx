import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from 'lucide-react';

export default function CallsFilters({ onFiltersChange }) {
  const handleChange = (key, value) => {
    onFiltersChange(prev => ({ ...prev, [key]: value === 'all' ? undefined : value }));
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="relative flex-1">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="חיפוש לפי שם לקוח, טלפון או מספר קריאה..."
          className="pr-9"
          onChange={(e) => handleChange('search', e.target.value)}
        />
      </div>
      
      <div className="flex gap-4">
        <div className="w-48">
          <Select onValueChange={(val) => handleChange('status', val)}>
            <SelectTrigger>
              <SelectValue placeholder="סינון לפי סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="waiting_treatment">ממתין לטיפול</SelectItem>
              <SelectItem value="assigning">בשיוך</SelectItem>
              <SelectItem value="in_progress">בטיפול</SelectItem>
              <SelectItem value="completed">הושלם</SelectItem>
              <SelectItem value="cancelled">בוטל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select onValueChange={(val) => handleChange('priority', val)}>
            <SelectTrigger>
              <SelectValue placeholder="עדיפות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל העדיפויות</SelectItem>
              <SelectItem value="normal">רגיל</SelectItem>
              <SelectItem value="high">גבוה</SelectItem>
              <SelectItem value="urgent">דחוף</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}