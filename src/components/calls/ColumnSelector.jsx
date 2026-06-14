import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * כפתור "התאמת עמודות" - מאפשר לכל משתמש לבחור אילו עמודות יוצגו בטבלה.
 *
 * @param {object} props
 * @param {string[]} props.allColumns - כל כותרות העמודות הזמינות
 * @param {(header:string)=>boolean} props.isHidden - האם עמודה מוסתרת
 * @param {(header:string)=>void} props.onToggle - החלפת מצב נראות
 * @param {()=>void} props.onReset - איפוס (הצגת כל העמודות)
 */
export default function ColumnSelector({ allColumns, isHidden, onToggle, onReset }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-10">
          <SlidersHorizontal className="w-4 h-4" />
          עמודות
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2" dir="rtl">
        <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b">
          <span className="text-sm font-semibold text-gray-700">התאמת עמודות</span>
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-blue-600 hover:underline"
          >
            נקה הכל
          </button>
        </div>
        <div className="space-y-0.5 max-h-72 overflow-y-auto">
          {allColumns.map((header) => (
            <label
              key={header}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
            >
              <Checkbox
                checked={!isHidden(header)}
                onCheckedChange={() => onToggle(header)}
              />
              <span className="text-sm text-gray-700">{header}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}