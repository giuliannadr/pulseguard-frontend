'use client';

import type { Check } from '@/lib/api';

interface Props {
  checks: Check[];
  segments?: number;
}

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
    <div className="uptime-bar" title="Last 60 checks">
      {bars.map((s, i) => (
        <div key={i} className={`seg ${s}`} />
      ))}
    </div>
  );
}
