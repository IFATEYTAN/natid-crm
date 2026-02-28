import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Pause, Clock, CheckCircle2 } from 'lucide-react';

export default function AgentCard({ agent, onToggle, isLoading = false }) {
  const isActive = agent.status === 'active';

  return (
    <Card
      className={cn(
        'card-hover transition-all duration-200 border-t-4',
        isActive
          ? 'border-t-primary border-x-border border-b-border shadow-sm'
          : 'border-t-transparent hover:border-t-gray-300'
      )}
    >
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {agent.name}
              {isActive && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-sm text-gray-500 line-clamp-2 h-10">
              {agent.description}
            </CardDescription>
          </div>
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              'me-2 whitespace-nowrap',
              isActive ? 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20' : ''
            )}
          >
            {isActive ? 'פעיל' : 'לא פעיל'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {agent.stats && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg text-xs">
            <div className="space-y-1">
              <span className="text-gray-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                בוצעו
              </span>
              <span className="font-semibold text-gray-900 text-sm block">
                {agent.stats.completedTasks?.toLocaleString() || 0}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                אחרון
              </span>
              <span className="font-semibold text-gray-900 text-sm block">
                {agent.stats.lastRun || '-'}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          onClick={() => onToggle(agent.id)}
          disabled={isLoading}
          variant={isActive ? 'outline' : 'default'}
          className={cn(
            'w-full gap-2',
            !isActive && 'bg-primary hover:bg-primary-hover text-white'
          )}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>מעבד...</span>
            </>
          ) : isActive ? (
            <>
              <Pause className="w-4 h-4" />
              <span>עצור פעילות</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>הפעל סוכן</span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
