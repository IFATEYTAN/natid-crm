import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function CollapsibleCard({ 
  title, 
  description, 
  headerRight, 
  children, 
  defaultOpen = true,
  className = '',
  headerClassName = ''
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={`hover:shadow-md transition-all duration-300 ${className}`}>
      <CardHeader className={`pb-2 ${headerClassName}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              aria-label={isOpen ? 'כווץ' : 'הרחב'}
            >
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            <div 
              className="cursor-pointer select-none" 
              onClick={() => setIsOpen(!isOpen)}
            >
              {typeof title === 'string' ? (
                <CardTitle className="text-lg font-bold text-gray-800">{title}</CardTitle>
              ) : title}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  );
}