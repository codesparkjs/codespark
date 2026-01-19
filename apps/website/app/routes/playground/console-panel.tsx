import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { cn } from '~/lib/utils';

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'dir' | 'table' | 'system-log' | 'system-warn' | 'assert' | 'trace' | 'clear';

export interface LogEntry {
  id: number;
  level: LogLevel;
  args: unknown[];
  timestamp: number;
  count: number;
}

const LOG_STYLES: Partial<Record<LogLevel, { icon?: React.ReactNode; bg?: string }>> = {
  info: { icon: <Info className="size-3.5 text-blue-500" /> },
  warn: { icon: <AlertTriangle className="size-3.5 text-yellow-500" />, bg: 'bg-yellow-500/10' },
  'system-warn': { icon: <AlertTriangle className="size-3.5 text-yellow-500" />, bg: 'bg-yellow-500/10' },
  error: { icon: <AlertCircle className="size-3.5 text-red-500" />, bg: 'bg-red-500/10' },
  assert: { icon: <AlertCircle className="size-3.5 text-red-500" />, bg: 'bg-red-500/10' }
};

const formatArgs = (args: unknown[]) => {
  if (args.length === 0) return '';

  const first = args[0];
  if (typeof first === 'string' && first.includes('%s')) {
    let result = first;
    let i = 1;
    result = result.replace(/%s/g, () => (i < args.length ? String(args[i++]) : '%s'));

    return result;
  }

  return args
    .map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
};

export interface ConsolePanelProps {
  logs: LogEntry[];
}

export function ConsolePanel(props: ConsolePanelProps) {
  const { logs } = props;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [logs]);

  return (
    <div ref={scrollRef} className="h-full overflow-auto font-mono text-xs">
      {logs.length === 0 ? (
        <div className="text-muted-foreground flex h-full items-center justify-center">No logs</div>
      ) : (
        logs.map(({ id, level, count, args }) => {
          const style = LOG_STYLES[level];

          return (
            <div key={id} className={cn('flex items-start gap-2 border-b px-3 py-1.5', style?.bg)}>
              {count > 1 && <span className="bg-muted-foreground/20 text-muted-foreground mt-0.5 shrink-0 rounded px-1 text-[10px] font-medium">{count}</span>}
              {style?.icon && <span className="mt-0.5 shrink-0">{style.icon}</span>}
              <pre className="flex-1 break-all whitespace-pre-wrap">{formatArgs(args)}</pre>
            </div>
          );
        })
      )}
    </div>
  );
}
