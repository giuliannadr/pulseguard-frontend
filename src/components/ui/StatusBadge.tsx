'use client';

import type { MonitorStatus } from '@/lib/api';

const labels: Record<MonitorStatus, string> = {
  up: 'UP',
  down: 'DOWN',
  degraded: 'DEGRADED',
  unknown: 'UNKNOWN',
};

const styles: Record<MonitorStatus, string> = {
  up: 'bg-[var(--green-start)]/10 text-[var(--green-start)] border-[var(--green-start)]/20 shadow-[0_0_10px_rgba(142,254,161,0.2)]',
  down: 'bg-[#FF5A79]/10 text-[#FF5A79] border-[#FF5A79]/20 shadow-[0_0_10px_rgba(255,90,121,0.2)]',
  degraded: 'bg-[#FFDF00]/10 text-[#FFDF00] border-[#FFDF00]/20 shadow-[0_0_10px_rgba(255,223,0,0.2)]',
  unknown: 'bg-white/5 text-[var(--text-muted)] border-white/10',
};

const pulseColors: Record<MonitorStatus, string> = {
  up: 'bg-[var(--green-start)] shadow-[0_0_8px_var(--green-start)]',
  down: 'bg-[#FF5A79] shadow-[0_0_8px_#FF5A79]',
  degraded: 'bg-[#FFDF00] shadow-[0_0_8px_#FFDF00]',
  unknown: 'bg-white/30',
};

interface Props {
  status: MonitorStatus;
  showPulse?: boolean;
}

export function StatusBadge({ status, showPulse = true }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-mono tracking-widest uppercase font-bold ${styles[status]}`}>
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
