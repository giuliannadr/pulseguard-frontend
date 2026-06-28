'use client';

import { use, useEffect, useState } from 'react';
import { UptimeBar } from '@/components/ui/UptimeBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type PublicMonitor = {
  id: string;
  name: string;
  url: string | null;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  uptime: number | null;
  responseTimeMs: number | null;
  checks: { status: string; checkedAt: string }[];
};

function StatusDot({ status }: { status: string }) {
  const color = status === 'up' ? '#16A34A' : status === 'down' ? '#DC2626' : status === 'degraded' ? '#D97706' : 'var(--color-txt-muted)';
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, boxShadow: status === 'up' ? `0 0 6px ${color}` : 'none',
    }} />
  );
}

export default function PublicStatusPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [monitors, setMonitors] = useState<PublicMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/public/status/${userId}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(setMonitors)
      .catch(() => setError('Status page not found or no public monitors.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const allUp = monitors.length > 0 && monitors.every(m => m.status === 'up');
  const hasDown = monitors.some(m => m.status === 'down');

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg-base)', color: 'var(--color-txt-primary)' }}>
      {/* Nav */}
      <div style={{ borderBottom: '1px solid var(--color-border-main)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}>
        <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--color-txt-primary)' }}>PulseGuard</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)', marginLeft: 8 }}>Status Page</span>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        {/* Overall banner */}
        {!loading && !error && (
          <div style={{
            background: allUp ? 'rgba(0,230,118,0.04)' : hasDown ? 'rgba(255,23,68,0.04)' : 'rgba(255,179,0,0.04)',
            border: `1px solid ${allUp ? 'rgba(0,230,118,0.2)' : hasDown ? 'rgba(255,23,68,0.2)' : 'rgba(255,179,0,0.2)'}`,
            borderRadius: 6, padding: '24px 28px', marginBottom: 32,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: allUp ? '#16A34A' : hasDown ? '#DC2626' : '#FFB300',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {allUp
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="var(--color-txt-btn-primary)" strokeWidth="3" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="var(--color-txt-btn-primary)" strokeWidth="3" strokeLinecap="round"/></svg>
              }
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--color-txt-primary)', margin: '0 0 4px' }}>
                {monitors.length === 0 ? 'No services configured' : allUp ? 'All Systems Operational' : hasDown ? 'Service Disruption Detected' : 'Partial Degradation'}
              </h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)', margin: 0 }}>
                Updated {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 80, background: 'var(--color-bg-card)', borderRadius: 3, opacity: 0.5 }} />)}
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-txt-muted)' }}>
            {error}
          </div>
        )}

        {!loading && !error && monitors.length > 0 && (
          <div style={{ border: '1px solid var(--color-border-main)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '12px 24px', background: 'var(--color-bg-sidebar)', borderBottom: '1px solid var(--color-border-main)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Services
              </span>
            </div>
            {monitors.map((m, idx) => (
              <div key={m.id} style={{
                padding: '20px 24px',
                borderBottom: idx < monitors.length - 1 ? '1px solid var(--color-border-main)' : 'none',
                background: m.status === 'down' ? 'rgba(255,23,68,0.02)' : 'var(--color-bg-card)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: m.checks.length > 0 ? 14 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <StatusDot status={m.status} />
                    <div>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-txt-primary)' }}>{m.name}</span>
                      {m.url && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)', marginTop: 2 }}>{m.url}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 24, textAlign: 'right' }}>
                    {m.uptime != null && (
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: m.uptime >= 99 ? '#16A34A' : m.uptime >= 95 ? '#FFB300' : '#DC2626' }}>{m.uptime}%</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>uptime</div>
                      </div>
                    )}
                    {m.responseTimeMs != null && (
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--color-txt-primary)' }}>{m.responseTimeMs}ms</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>response</div>
                      </div>
                    )}
                  </div>
                </div>
                {m.checks.length > 0 && (
                  <UptimeBar checks={m.checks as any} segments={90} />
                )}
              </div>
            ))}
          </div>
        )}

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)', textAlign: 'center', marginTop: 40 }}>
          Powered by PulseGuard
        </p>
      </div>
    </div>
  );
}
