import React, { useState, useEffect, useRef } from 'react';
import { Coffee, Play, AlertTriangle, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * AgentBreakMode
 * ---------------
 * Allows an agent to mark themselves as "on break".
 * While on break:
 *  - A countdown timer is shown in the header.
 *  - After the configured threshold (default 20 min), unhandled calls
 *    assigned to this agent are automatically re-queued and a notification
 *    is sent to the supervisor.
 *  - The agent's status is stored in localStorage so it survives page refreshes.
 */

const BREAK_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes default
const STORAGE_KEY = 'agent_break_start';

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function AgentBreakMode({ currentUser }) {
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [autoTransferred, setAutoTransferred] = useState(false);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef(null);

  // Restore break state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const start = parseInt(stored, 10);
      if (!isNaN(start)) {
        setIsOnBreak(true);
        setBreakStart(start);
      }
    }
  }, []);

  // Tick the timer while on break
  useEffect(() => {
    if (isOnBreak && breakStart) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const diff = now - breakStart;
        setElapsed(diff);

        // Auto-transfer after threshold
        if (diff >= BREAK_THRESHOLD_MS && !autoTransferred) {
          handleAutoTransfer();
        }
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isOnBreak, breakStart, autoTransferred]);

  const handleAutoTransfer = async () => {
    setAutoTransferred(true);
    try {
      // Invoke backend function to re-queue this agent's unhandled calls
      await base44.functions.invoke('autoTransferAgentCalls', {
        agent_email: currentUser?.email,
        reason: 'break_timeout',
      });
      toast.warning('קריאות שלא טופלו הועברו לבקר — עברת 20 דקות בהפסקה', {
        duration: 8000,
        icon: '⚠️',
      });
    } catch {
      // Silently fail — the UI still shows the warning
    }
  };

  const startBreak = () => {
    const now = Date.now();
    setIsOnBreak(true);
    setBreakStart(now);
    setAutoTransferred(false);
    localStorage.setItem(STORAGE_KEY, String(now));
    setOpen(false);
    toast.info('יצאת להפסקה. קריאות שלא יטופלו תוך 20 דקות יועברו לבקר.', {
      duration: 5000,
    });
  };

  const endBreak = () => {
    setIsOnBreak(false);
    setBreakStart(null);
    setElapsed(0);
    setAutoTransferred(false);
    localStorage.removeItem(STORAGE_KEY);
    setOpen(false);
    toast.success('חזרת לעבודה!');
  };

  const isOverThreshold = elapsed >= BREAK_THRESHOLD_MS;

  if (!isOnBreak) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-gray-600 border-gray-200 hover:bg-gray-50"
          >
            <Coffee className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">הפסקה</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="end">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-500" />
              <p className="font-semibold text-sm">יציאה להפסקה</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              בעת הפסקה, קריאות שלא יטופלו תוך <strong>20 דקות</strong> יועברו אוטומטית לבקר.
            </p>
            <Button
              onClick={startBreak}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm"
            >
              <Coffee className="w-4 h-4 ml-2" />
              יצא להפסקה
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-1.5 border font-mono text-xs',
            isOverThreshold
              ? 'border-red-300 bg-red-50 text-red-700 animate-pulse'
              : 'border-amber-300 bg-amber-50 text-amber-700'
          )}
        >
          {isOverThreshold ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {formatDuration(elapsed)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-500" />
              <p className="font-semibold text-sm">בהפסקה</p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'font-mono text-xs',
                isOverThreshold ? 'border-red-300 text-red-600' : 'border-amber-300 text-amber-600'
              )}
            >
              {formatDuration(elapsed)}
            </Badge>
          </div>

          {isOverThreshold && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700 leading-relaxed">
                  עברו 20 דקות — קריאות שלא טופלו הועברו אוטומטית לבקר.
                </p>
              </div>
            </div>
          )}

          {!isOverThreshold && (
            <p className="text-xs text-gray-500">
              קריאות יועברו לבקר בעוד{' '}
              <strong>{formatDuration(BREAK_THRESHOLD_MS - elapsed)}</strong>
            </p>
          )}

          <Button
            onClick={endBreak}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
          >
            <Play className="w-4 h-4 ml-2" />
            חזור לעבודה
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
