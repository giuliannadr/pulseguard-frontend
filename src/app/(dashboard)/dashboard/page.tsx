'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor, type MonitorStatus } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UptimeBar } from '@/components/ui/UptimeBar';
import { useTranslation } from '@/lib/i18n';


function getLastStatus(monitor: Monitor): MonitorStatus {
  return (monitor.checks?.[0]?.status as MonitorStatus) ?? 'unknown';
}

function ms(val: number | null | undefined) {
  if (val == null) return '—';
  return `${val}ms`;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  const [token, setToken] = useState<string | null>(null);

  const supabase = createClient();

  const loadMonitors = useCallback(async (tok: string) => {
    try {
      const data = await api.monitors.list(tok);
      setMonitors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase.auth.getSession().then(({ data: { session } }) => {
        const tok = session?.access_token ?? null;
        setToken(tok);
        if (tok) loadMonitors(tok);
        else setLoading(false);
      });
    });
  }, [loadMonitors]);

  useEffect(() => {
    if (!token) return;
    const channel = supabase
      .channel('checks-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checks' }, () => {
        loadMonitors(token);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, loadMonitors]);

  const upCount       = monitors.filter((m) => getLastStatus(m) === 'up').length;
  const downCount     = monitors.filter((m) => getLastStatus(m) === 'down').length;
  const degradedCount = monitors.filter((m) => getLastStatus(m) === 'degraded').length;

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#CAFF00', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            // {t('dash_system')}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: '#F0F0F0', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {t('nav_projects')}
          </h1>
        </div>
        <Link href="/import" style={{ textDecoration: 'none' }}>
          <button className="btn-strict-primary" style={{ height: 38, fontSize: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('btn_import')}
          </button>
        </Link>
      </div>

      {/* ── Stat row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 32, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        {[
          { label: t('dash_total'),       value: monitors.length,  color: '#F0F0F0' },
          { label: t('dash_operational'), value: upCount,           color: '#00E676' },
          { label: t('dash_down'),        value: downCount,         color: '#FF1744' },
          { label: t('dash_degraded'),    value: degradedCount,     color: '#FFB300' },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: '20px 24px',
              background: '#080808',
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: s.color, lineHeight: 1, marginBottom: 6 }}>
              {loading ? '—' : s.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Monitor list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 72, background: '#080808', borderRadius: 3, opacity: 0.5 }} />
          ))}
        </div>
      ) : monitors.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
          {/* Table head */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 80px 60px 40px',
              gap: 0,
              padding: '10px 20px',
              background: '#050505',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {[t('dash_project'), t('dash_response'), t('dash_ssl'), t('dash_interval'), ''].map((h) => (
              <span
                key={h}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: '#4A4A4A',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {monitors.map((monitor, idx) => {
            const status    = getLastStatus(monitor);
            const lastCheck = monitor.checks?.[0];
            const isDown    = status === 'down';
            return (
              <Link
                key={monitor.id}
                href={`/monitors/${monitor.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{
                    background: isDown ? 'rgba(255,23,68,0.04)' : '#080808',
                    borderBottom: idx < monitors.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = isDown ? 'rgba(255,23,68,0.07)' : '#0F0F0F'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isDown ? 'rgba(255,23,68,0.04)' : '#080808'; }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 80px 60px 40px',
                      alignItems: 'center',
                      padding: '14px 20px',
                    }}
                  >
                    {/* Name + status */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#F0F0F0' }}>
                          {monitor.name}
                        </span>
                        <StatusBadge status={status} showPulse={false} />
                      </div>
                      {monitor.url && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>
                          {monitor.url}
                        </span>
                      )}
                    </div>

                    {/* Response */}
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: lastCheck?.responseTimeMs && lastCheck.responseTimeMs > 2000 ? '#FFB300' : '#F0F0F0' }}>
                        {ms(lastCheck?.responseTimeMs)}
                      </div>
                    </div>

                    {/* SSL */}
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: (lastCheck?.sslDaysLeft ?? 999) < 14 ? '#FF1744' : '#F0F0F0' }}>
                        {lastCheck?.sslDaysLeft != null ? `${lastCheck.sslDaysLeft}d` : '—'}
                      </div>
                    </div>

                    {/* Interval */}
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: '#4A4A4A' }}>
                        {monitor.intervalMinutes}m
                      </div>
                    </div>

                    {/* Arrow */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A4A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </div>

                  {/* Uptime bar */}
                  {monitor.checks && monitor.checks.length > 0 && (
                    <div style={{ padding: '0 20px 14px' }}>
                      <UptimeBar checks={monitor.checks} segments={60} />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        border: '1px dashed rgba(255,255,255,0.1)',
        borderRadius: 3,
        padding: '80px 40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          background: '#CAFF00',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#F0F0F0', margin: '0 0 8px' }}>
        {t('dash_empty_title')}
      </h3>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#4A4A4A', margin: '0 0 28px', maxWidth: 320 }}>
        {t('dash_empty_desc')}
      </p>
      <Link href="/import" style={{ textDecoration: 'none' }}>
        <button className="btn-strict-primary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('btn_import')}
        </button>
      </Link>
    </div>
  );
}
