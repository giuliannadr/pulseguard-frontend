'use client';

import type { MonitorStatus } from '@/lib/api';

const cfg: Record<MonitorStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  up:       { label: 'UP',       dot: '#00E676', text: '#00E676', bg: 'rgba(0,230,118,0.08)',  border: 'rgba(0,230,118,0.2)' },
  down:     { label: 'DOWN',     dot: '#FF1744', text: '#FF1744', bg: 'rgba(255,23,68,0.08)',   border: 'rgba(255,23,68,0.2)' },
  degraded: { label: 'DEGRADED', dot: '#FFB300', text: '#FFB300', bg: 'rgba(255,179,0,0.08)',   border: 'rgba(255,179,0,0.2)' },
  unknown:  { label: 'UNKNOWN',  dot: 'var(--color-txt-muted)', text: 'var(--color-txt-muted)', bg: 'rgba(255,255,255,0.03)', border: 'var(--color-border-main)' },
};

interface Props {
  status: MonitorStatus;
  showPulse?: boolean;
}

export function StatusBadge({ status, showPulse = true }: Props) {
  const c = cfg[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 2,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.1em',
        color: c.text,
        lineHeight: 1.8,
      }}
    >
      {showPulse && (
        <span style={{ position: 'relative', display: 'inline-flex', width: 6, height: 6, flexShrink: 0 }}>
          {status !== 'unknown' && (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: c.dot,
                animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                opacity: 0.5,
              }}
            />
          )}
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
        </span>
      )}
      {c.label}
      <style>{`@keyframes ping { 75%,100% { transform: scale(2.2); opacity: 0; } }`}</style>
    </span>
  );
}
