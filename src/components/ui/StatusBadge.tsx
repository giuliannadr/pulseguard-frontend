'use client';

import type { MonitorStatus } from '@/lib/api';

const labels: Record<MonitorStatus, string> = {
  up: 'UP',
  down: 'DOWN',
  degraded: 'DEGRADED',
  unknown: 'UNKNOWN',
};

const styles: Record<MonitorStatus, string> = {
  up: 'bg-[var(--color-violet-primary)]/10 text-[var(--color-violet-primary)] border-[var(--color-violet-primary)]/30',
  down: 'bg-[var(--color-pink-primary)]/10 text-[var(--color-pink-primary)] border-[var(--color-pink-primary)]/30',
  degraded: 'bg-[#FFDF00]/10 text-[#FFDF00] border-[#FFDF00]/30',
  unknown: 'bg-white/5 text-[var(--color-text-muted)] border-[var(--color-border-subtle)]',
};

const pulseColors: Record<MonitorStatus, string> = {
  up: 'bg-[var(--color-violet-primary)] shadow-[0_0_8px_var(--color-violet-primary)]',
  down: 'bg-[var(--color-pink-primary)] shadow-[0_0_8px_var(--color-pink-primary)]',
  degraded: 'bg-[#FFDF00] shadow-[0_0_8px_#FFDF00]',
  unknown: 'bg-white/30',
};

interface Props {
  status: MonitorStatus;
  showPulse?: boolean;
}

export function StatusBadge({ status, showPulse = true }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded border text-[10px] font-mono tracking-widest uppercase font-bold ${styles[status]}`}>
      {showPulse && status !== 'unknown' && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColors[status]}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseColors[status]}`}></span>
        </span>
      )}
      {labels[status]}
    </span>
  );
}
