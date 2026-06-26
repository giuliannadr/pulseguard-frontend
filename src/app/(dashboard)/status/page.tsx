'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor } from '@/lib/api';
import { UptimeBar } from '@/components/ui/UptimeBar';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function StatusPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadMonitors = useCallback(async (tok: string) => {
    try {
      const data = await api.monitors.list(tok);
      setMonitors(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) loadMonitors(session.access_token);
        else setLoading(false);
      });
    });
  }, [loadMonitors]);

  const allOperational = monitors.length > 0 && monitors.every(m => m.checks?.[0]?.status === 'up');
  const hasIssues = monitors.some(m => {
    const s = m.checks?.[0]?.status;
    return s === 'down' || s === 'degraded';
  });

  return (
    <div style={{ width: '100%', maxWidth: 800, margin: '0 auto', animation: 'pg-fade-in 0.35s ease-out both' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-acid)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          // Infrastructure
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: '#F0F0F0', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          System Status
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#666', margin: 0 }}>
          Current status of all tracked infrastructure
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[100, 100].map((h, i) => (
            <div key={i} style={{ height: h, background: '#080808', borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)', opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <>
          {/* Overall status banner */}
          <div style={{
            background: allOperational ? 'rgba(0,230,118,0.04)' : hasIssues ? 'rgba(255,23,68,0.04)' : '#080808',
            border: `1px solid ${allOperational ? 'rgba(0,230,118,0.2)' : hasIssues ? 'rgba(255,23,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 3, padding: '24px 28px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: allOperational ? '#00E676' : hasIssues ? '#FF1744' : '#4A4A4A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {allOperational ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <polyline points="20 6 9 17 4 12" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#F0F0F0', margin: '0 0 4px' }}>
                {monitors.length === 0
                  ? 'No monitors configured'
                  : allOperational
                  ? 'All Systems Operational'
                  : 'Some Systems are Experiencing Issues'}
              </h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A', margin: 0 }}>
                Last updated: {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          {/* Monitor list */}
          {monitors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ padding: '10px 24px', background: '#050505', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Services — {monitors.length} monitored
                </span>
              </div>
              {monitors.map((monitor, idx) => {
                const status = (monitor.checks?.[0]?.status ?? 'unknown') as any;
                return (
                  <div key={monitor.id} style={{
                    background: status === 'down' ? 'rgba(255,23,68,0.03)' : '#080808',
                    borderBottom: idx < monitors.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    padding: '20px 24px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: monitor.checks && monitor.checks.length > 0 ? 14 : 0 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#F0F0F0' }}>{monitor.name}</span>
                          <StatusBadge status={status} />
                        </div>
                        {monitor.url && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>{monitor.url}</span>
                        )}
                      </div>
                      {monitor.checks?.[0]?.responseTimeMs != null && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#4A4A4A' }}>
                          {monitor.checks[0].responseTimeMs}ms
                        </span>
                      )}
                    </div>
                    {monitor.checks && monitor.checks.length > 0 && (
                      <UptimeBar checks={monitor.checks} segments={90} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
