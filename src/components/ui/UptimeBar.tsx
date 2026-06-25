'use client';

import type { Check } from '@/lib/api';

interface Props {
  checks: Check[];
  segments?: number;
}

const segStyles: Record<string, string> = {
  up: 'bg-[var(--color-violet-primary)] hover:shadow-[0_0_12px_var(--color-violet-primary)] opacity-80 hover:opacity-100',
  down: 'bg-[var(--color-pink-primary)] hover:shadow-[0_0_12px_var(--color-pink-primary)] opacity-100',
  degraded: 'bg-[#FFDF00] hover:shadow-[0_0_12px_#FFDF00] opacity-100',
  empty: 'bg-white/5',
};

export function UptimeBar({ checks, segments = 60 }: Props) {
  const sorted = [...checks].sort(
    (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime(),
  );

  const bars = Array.from({ length: segments }, (_, i) => {
    const check = sorted[sorted.length - segments + i];
    if (!check) return 'empty';
    return check.status;
  });

  return (
    <div className="flex items-center gap-[2px] h-8 w-full">
      {bars.map((s, i) => (
        <div 
          key={i} 
          className={`flex-1 h-full rounded-[1px] transition-all duration-200 hover:scale-y-125 cursor-pointer ${segStyles[s]}`} 
        />
      ))}
    </div>
  );
}
