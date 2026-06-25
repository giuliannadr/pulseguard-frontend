'use client';

import type { Check } from '@/lib/api';

interface Props {
  checks: Check[];
  segments?: number;
}

const colors: Record<string, string> = {
  up:       '#00E676',
  down:     '#FF1744',
  degraded: '#FFB300',
  empty:    'rgba(255,255,255,0.05)',
};

export function UptimeBar({ checks, segments = 60 }: Props) {
  const sorted = [...checks].sort(
    (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime(),
  );

  const bars = Array.from({ length: segments }, (_, i) => {
    const check = sorted[sorted.length - segments + i];
    return check ? check.status : 'empty';
  });

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 2, height: 24, width: '100%' }}>
      {bars.map((s, i) => (
        <div
          key={i}
          title={s}
          style={{
            flex: 1,
            background: colors[s] ?? colors.empty,
            borderRadius: 1,
            opacity: s === 'empty' ? 1 : 0.85,
            transition: 'opacity 0.15s, transform 0.15s',
            cursor: 'default',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; (e.currentTarget as HTMLDivElement).style.transform = 'scaleY(1.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = s === 'empty' ? '1' : '0.85'; (e.currentTarget as HTMLDivElement).style.transform = 'scaleY(1)'; }}
        />
      ))}
    </div>
  );
}
