'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor } from '@/lib/api';
import { UptimeBar } from '@/components/ui/UptimeBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTranslation } from '@/lib/i18n';

export default function StatusPage() {
  const { t } = useTranslation();
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
        <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>
          {t('stat_sub')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'var(--color-txt-primary)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          {t('stat_title')}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-txt-muted)', margin: 0 }}>
          {t('stat_desc')}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[100, 100].map((h, i) => (
            <div key={i} style={{ height: h, background: 'var(--color-bg-card)', borderRadius: 3, border: '1px solid var(--color-border-main)', opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <>
          {/* Overall status banner */}
          <div style={{
            background: allOperational ? 'rgba(22,163,74,0.06)' : hasIssues ? 'rgba(220,38,38,0.06)' : 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${allOperational ? 'rgba(22,163,74,0.25)' : hasIssues ? 'rgba(220,38,38,0.25)' : 'rgba(255,255,255,0.85)'}`,
            borderRadius: 20, padding: '24px 28px', marginBottom: 24,
            boxShadow: '0 4px 24px rgba(124,58,237,0.06)',
            display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: allOperational ? '#00E676' : hasIssues ? '#FF1744' : 'var(--color-txt-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {allOperational ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <polyline points="20 6 9 17 4 12" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="var(--color-txt-btn-primary)" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="var(--color-txt-btn-primary)" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--color-txt-primary)', margin: '0 0 4px' }}>
                {monitors.length === 0
                  ? t('stat_no_monitors')
                  : allOperational
                  ? t('stat_all_operational')
                  : t('stat_has_issues')}
              </h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)', margin: 0 }}>
                {t('stat_last_updated')}: {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          {/* Monitor list */}
          {monitors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.85)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(124,58,237,0.06)' }}>
              <div style={{ padding: '14px 24px', background: 'rgba(249,250,251,0.6)', borderBottom: '1px solid rgba(229,231,235,0.6)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {monitors.length} {t('stat_services_count')}
                </span>
              </div>
              {monitors.map((monitor, idx) => {
                const status = (monitor.checks?.[0]?.status ?? 'unknown') as any;
                return (
                  <div key={monitor.id} style={{
                    background: status === 'down' ? 'rgba(255,23,68,0.03)' : 'var(--color-bg-card)',
                    borderBottom: idx < monitors.length - 1 ? '1px solid var(--color-border-main)' : 'none',
                    padding: '20px 24px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: monitor.checks && monitor.checks.length > 0 ? 14 : 0 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-txt-primary)' }}>{monitor.name}</span>
                          <StatusBadge status={status} />
                        </div>
                        {monitor.url && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>{monitor.url}</span>
                        )}
                      </div>
                      {monitor.checks?.[0]?.responseTimeMs != null && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-txt-muted)' }}>
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
