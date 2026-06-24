'use client';

import type { MonitorStatus } from '@/lib/api';

const labels: Record<MonitorStatus, string> = {
  up: 'UP',
  down: 'DOWN',
  degraded: 'DEGRADED',
  unknown: 'UNKNOWN',
};

const dots: Record<MonitorStatus, string> = {
  up: 'pulse-up',
  down: 'pulse-down',
  degraded: 'pulse-deg',
  unknown: '',
};

interface Props {
  status: MonitorStatus;
  showPulse?: boolean;
}

export function StatusBadge({ status, showPulse = true }: Props) {
  return (
    <span className={`badge badge-${status}`}>
      {showPulse && status !== 'unknown' && (
        <span className={`pulse-indicator ${dots[status]}`} style={{ width: 8, height: 8 }}>
          <span className="dot" />
        </span>
      )}
      {labels[status]}
    </span>
  );
}
