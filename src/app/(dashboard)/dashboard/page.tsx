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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function getLatencyStatus(ms: number): { label: string; color: string; bg: string } {
  if (ms === 0) return { label: '—', color: 'var(--color-txt-muted)', bg: 'transparent' };
  if (ms < 300) return { label: 'RÁPIDO', color: '#16A34A', bg: 'rgba(22,163,74,0.08)' };
  if (ms < 800) return { label: 'ESTABLE', color: '#D97706', bg: 'rgba(217,119,6,0.08)' };
  return { label: 'LENTO', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' };
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [, setNow] = useState(Date.now());

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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function handleCheckNow(monitorId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) return;
    setCheckingId(monitorId);
    try {
      await api.monitors.checkNow(monitorId, token);
      await loadMonitors(token);
    } catch {}
    finally { setCheckingId(null); }
  }

  async function handleToggle(monitor: Monitor, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) return;
    setTogglingId(monitor.id);
    try {
      await api.monitors.update(monitor.id, { isActive: !monitor.isActive }, token);
      await loadMonitors(token);
    } catch {}
    finally { setTogglingId(null); }
  }

  const upCount       = monitors.filter(m => getLastStatus(m) === 'up').length;
  const downCount     = monitors.filter(m => getLastStatus(m) === 'down').length;
  const degradedCount = monitors.filter(m => getLastStatus(m) === 'degraded').length;

  const totalAllChecks = monitors.reduce((s, m) => s + (m.checks?.length ?? 0), 0);
  const totalAllUp     = monitors.reduce((s, m) => s + (m.checks?.filter(c => c.status === 'up').length ?? 0), 0);
  const uptimeRatio    = totalAllChecks > 0 ? Math.round((totalAllUp / totalAllChecks) * 100) : 100;

  const latestTimes = monitors.map(m => m.checks?.[0]?.responseTimeMs).filter((v): v is number => v != null);
  const avgLatency  = latestTimes.length > 0 ? Math.round(latestTimes.reduce((a, b) => a + b, 0) / latestTimes.length) : 0;
  const latencyStatus = getLatencyStatus(avgLatency);

  const incidents = monitors
    .flatMap(m => (m.checks ?? []).map(c => ({ ...c, monitorName: m.name, monitorId: m.id })))
    .filter(c => c.status === 'down' || c.status === 'degraded')
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
    .slice(0, 8);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!loading && monitors.length === 0) {
    return (
      <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: 'var(--font-body)' }}>{t('dash_overview')}</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--color-txt-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {t('dash_my_dashboard')}
            </h1>
          </div>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px', fontFamily: 'var(--font-body)' }}>{t('dash_overview')}</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: 'var(--color-txt-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            {t('dash_my_dashboard')}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/import" style={{ textDecoration: 'none' }}>
            <button className="btn-solid-glow" style={{ height: 36, fontSize: 11, padding: '0 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {t('dash_add_monitor')}
            </button>
          </Link>
          <Link href="/security" style={{ textDecoration: 'none' }}>
            <button className="btn-glass" style={{ height: 36, fontSize: 11, padding: '0 16px', borderRadius: 10 }}>
              {t('dash_security_console')}
            </button>
          </Link>
        </div>
      </div>

      {/* ── Global Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          {
            label: t('dash_system_health'),
            value: loading ? '—' : `${uptimeRatio}%`,
            sub: `${upCount} / ${monitors.length} ${t('dash_active')}`,
            color: uptimeRatio >= 99 ? '#16A34A' : uptimeRatio >= 95 ? '#D97706' : '#DC2626',
            bg: uptimeRatio >= 99 ? 'rgba(22,163,74,0.06)' : uptimeRatio >= 95 ? 'rgba(217,119,6,0.06)' : 'rgba(220,38,38,0.06)',
          },
          {
            label: t('dash_system_latency'),
            value: loading ? '—' : avgLatency > 0 ? `${avgLatency}ms` : '—',
            sub: latencyStatus.label,
            subColor: latencyStatus.color,
            color: latencyStatus.color,
            bg: latencyStatus.bg || 'rgba(255,255,255,0.72)',
          },
          {
            label: t('dash_down'),
            value: loading ? '—' : String(downCount + degradedCount),
            sub: downCount > 0 ? `${downCount} caídos` : degradedCount > 0 ? `${degradedCount} degradados` : 'Sin incidentes',
            color: (downCount + degradedCount) > 0 ? '#DC2626' : 'var(--color-txt-primary)',
            bg: (downCount + degradedCount) > 0 ? 'rgba(220,38,38,0.06)' : 'rgba(255,255,255,0.72)',
          },
          {
            label: t('dash_active_monitors'),
            value: loading ? '—' : String(monitors.filter(m => m.isActive).length),
            sub: `${monitors.length} ${t('dash_services')} total`,
            color: 'var(--color-brand-primary)',
            bg: 'rgba(255,255,255,0.72)',
          },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg,
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: 20,
            padding: '20px 24px',
            boxShadow: '0 4px 24px rgba(124,58,237,0.06)',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: s.subColor ?? 'var(--color-txt-muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Monitor Cards Grid ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-txt-primary)', margin: 0 }}>
          {t('dash_my_services')}
        </h3>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)' }}>
          {monitors.length} {t('dash_services')}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {monitors.map((m) => {
          const status = getLastStatus(m);
          const totalChecks = m.checks?.length ?? 0;
          const upChecks = m.checks?.filter(c => c.status === 'up').length ?? 0;
          const uptimePct = totalChecks > 0 ? Math.round((upChecks / totalChecks) * 100) : 100;
          const latestMs = m.checks?.[0]?.responseTimeMs;
          const sslDays = m.checks?.[0]?.sslDaysLeft;
          const lastCheckedAt = m.checks?.[0]?.checkedAt;
          const statusColor = status === 'up' ? '#16A34A' : status === 'down' ? '#DC2626' : '#D97706';
          const isChecking = checkingId === m.id;
          const isToggling = togglingId === m.id;
          const latSt = getLatencyStatus(latestMs ?? 0);

          return (
            <div
              key={m.id}
              className="glass-card"
              style={{
                padding: '20px',
                borderRadius: 20,
                opacity: m.isActive ? 1 : 0.6,
                borderLeft: `3px solid ${statusColor}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-txt-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                      {m.name}
                    </span>
                    {!m.isActive && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--color-txt-muted)', background: 'var(--color-border-main)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>
                        PAUSADO
                      </span>
                    )}
                  </div>
                  {m.url && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.url.replace('https://', '').replace('http://', '')}
                    </div>
                  )}
                </div>
                <StatusBadge status={status} showPulse={status !== 'up'} />
              </div>

              {/* Metrics row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ background: 'var(--color-bg-card-hover)', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--color-border-main)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{t('mon_metric_uptime')}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: uptimePct >= 99 ? '#16A34A' : uptimePct >= 95 ? '#D97706' : '#DC2626' }}>
                    {uptimePct}%
                  </div>
                </div>
                <div style={{ background: 'var(--color-bg-card-hover)', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--color-border-main)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{t('dash_response')}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: latSt.color }}>
                    {latestMs != null ? `${latestMs}ms` : '—'}
                  </div>
                </div>
                <div style={{ background: 'var(--color-bg-card-hover)', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--color-border-main)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>SSL</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: sslDays != null && sslDays < 14 ? '#DC2626' : 'var(--color-txt-primary)' }}>
                    {sslDays != null ? `${sslDays}d` : '—'}
                  </div>
                </div>
              </div>

              {/* Uptime bar */}
              {m.checks && m.checks.length > 0 && (
                <div>
                  <UptimeBar checks={m.checks} segments={30} />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-txt-muted)', marginTop: 4 }}>
                    {t('mon_last_checks')} 30 {t('mon_checks_unit')}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-main)', paddingTop: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)' }}>
                  {lastCheckedAt ? `Hace ${timeAgo(lastCheckedAt)}` : '—'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {/* Check Now */}
                  {m.url && (
                    <button
                      onClick={e => handleCheckNow(m.id, e)}
                      disabled={isChecking}
                      title={t('btn_check')}
                      style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--color-border-main)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-txt-muted)', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-light)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; e.currentTarget.style.borderColor = 'var(--color-brand-mid)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-txt-muted)'; e.currentTarget.style.borderColor = 'var(--color-border-main)'; }}
                    >
                      {isChecking
                        ? <span style={{ fontSize: 9 }}>…</span>
                        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.67"/></svg>
                      }
                    </button>
                  )}
                  {/* Pause/Resume */}
                  <button
                    onClick={e => handleToggle(m, e)}
                    disabled={isToggling}
                    title={m.isActive ? t('btn_pause') : t('btn_resume')}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--color-border-main)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-txt-muted)', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-light)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; e.currentTarget.style.borderColor = 'var(--color-brand-mid)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-txt-muted)'; e.currentTarget.style.borderColor = 'var(--color-border-main)'; }}
                  >
                    {m.isActive
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                      : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    }
                  </button>
                  {/* Open detail */}
                  <Link
                    href={`/monitors/${m.id}`}
                    title={t('dash_view_details')}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--color-border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-txt-muted)', textDecoration: 'none', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-light)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; e.currentTarget.style.borderColor = 'var(--color-brand-mid)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--color-txt-muted)'; e.currentTarget.style.borderColor = 'var(--color-border-main)'; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Incidents Log ── */}
      <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('dash_incidents_log')}</span>
          <Link href="/security" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-brand-primary)', background: 'var(--color-brand-light)', padding: '2px 8px', borderRadius: 6 }}>
              Ver todos →
            </span>
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {incidents.length > 0 ? (
            incidents.map(inc => (
              <Link key={inc.id} href={`/monitors/${inc.monitorId}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px',
                  background: inc.status === 'down' ? 'rgba(220,38,38,0.04)' : 'rgba(217,119,6,0.04)',
                  borderRadius: 12,
                  border: `1px solid ${inc.status === 'down' ? 'rgba(220,38,38,0.15)' : 'rgba(217,119,6,0.15)'}`,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: inc.status === 'down' ? '#DC2626' : '#D97706' }} />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--color-txt-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inc.monitorName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: inc.status === 'down' ? '#DC2626' : '#D97706' }}>
                      {inc.errorMessage || t('dash_check_failed')}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)' }}>
                      {timeAgo(inc.checkedAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 16px', background: 'rgba(22,163,74,0.04)', borderRadius: 16, border: '1px dashed rgba(22,163,74,0.2)', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#16A34A' }}>
                {t('dash_all_operational')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)', textAlign: 'center' }}>
                {t('dash_no_incidents')}
              </span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function Bone({ w = '100%', h = 16, r = 8, style }: { w?: string | number; h?: number; r?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, var(--color-bg-card-hover) 25%, var(--color-border-main) 50%, var(--color-bg-card-hover) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
      flexShrink: 0,
      ...style,
    }} />
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ width: '100%' }}>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Bone w={80} h={10} r={4} style={{ marginBottom: 10 }} />
        <Bone w={220} h={28} r={6} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: 20, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Bone w="60%" h={10} r={4} />
            <Bone w="40%" h={28} r={6} />
            <Bone w="80%" h={8} r={4} />
          </div>
        ))}
      </div>

      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Bone w={160} h={14} r={4} />
        <Bone w={80} h={14} r={4} />
      </div>

      {/* Monitor cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: 20, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <Bone w="55%" h={14} r={4} />
                <Bone w="70%" h={10} r={4} />
              </div>
              <Bone w={52} h={22} r={6} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[...Array(3)].map((_, j) => (
                <div key={j} style={{ background: 'var(--color-bg-card-hover)', borderRadius: 10, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Bone w="50%" h={8} r={3} />
                  <Bone w="70%" h={16} r={4} />
                </div>
              ))}
            </div>
            <Bone w="100%" h={6} r={3} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Bone w={60} h={10} r={4} />
              <div style={{ display: 'flex', gap: 6 }}>
                <Bone w={28} h={28} r={8} />
                <Bone w={28} h={28} r={8} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Incidents section */}
      <div className="glass-card" style={{ padding: 20, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Bone w={140} h={12} r={4} style={{ marginBottom: 6 }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--color-bg-card-hover)', borderRadius: 10 }}>
            <Bone w="30%" h={10} r={4} />
            <Bone w="20%" h={10} r={4} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  const steps = [
    { n: '1', title: t('dash_step1_title'), desc: t('dash_step1_desc'), cta: true },
    { n: '2', title: t('dash_step2_title'), desc: t('dash_step2_desc') },
    { n: '3', title: t('dash_step3_title'), desc: t('dash_step3_desc') },
  ];
  return (
    <div style={{ border: '1px dashed var(--color-border-hover)', borderRadius: 28, padding: '56px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, background: 'var(--color-bg-card)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-brand-primary)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        {t('dash_getting_started')}
      </p>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--color-txt-primary)', margin: '0 0 8px', textAlign: 'center' }}>
        {t('dash_empty_title')}
      </h3>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-secondary)', margin: '0 0 40px', maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
        {t('dash_empty_desc')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36, width: '100%', maxWidth: 680 }} className="empty-steps-grid">
        {steps.map(s => (
          <div key={s.n} className="glass-card" style={{ borderRadius: 24, padding: '20px' }}>
            <div style={{ width: 28, height: 28, background: s.n === '1' ? 'linear-gradient(135deg,#7C3AED,#2563EB)' : 'var(--color-bg-card-hover)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: s.n === '1' ? 'white' : 'var(--color-txt-secondary)' }}>{s.n}</span>
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-txt-primary)', margin: '0 0 6px' }}>{s.title}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-txt-secondary)', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
          </div>
        ))}
      </div>
      <Link href="/import" style={{ textDecoration: 'none' }}>
        <button className="btn-solid-glow" style={{ height: 42, fontSize: 13, padding: '0 28px', borderRadius: 999 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ marginRight: 6 }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('btn_import')}
        </button>
      </Link>
      <style>{`
        @media (max-width: 768px) {
          .empty-steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
