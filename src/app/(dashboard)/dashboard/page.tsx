'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor, type MonitorStatus } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UptimeBar } from '@/components/ui/UptimeBar';
import { useTranslation } from '@/lib/i18n';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

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
  return `${hr}h`;
}

function getLatencyStatus(ms: number): { label: string; color: string; bg: string } {
  if (ms === 0) return { label: '—', color: 'var(--color-txt-muted)', bg: 'var(--color-bg-card-hover)' };
  if (ms < 300) return { label: 'RÁPIDO', color: '#16A34A', bg: 'rgba(22,163,74,0.08)' };
  if (ms < 800) return { label: 'ESTABLE', color: '#D97706', bg: 'rgba(217,119,6,0.08)' };
  return { label: 'LENTO', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' };
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(124,58,237,0.15)',
        borderRadius: '12px',
        padding: '10px 14px',
        color: 'var(--color-txt-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        boxShadow: '0 4px 16px rgba(124,58,237,0.1)',
      }}>
        <div style={{ color: 'var(--color-txt-muted)', marginBottom: 4 }}>{payload[0].payload.name}</div>
        <div style={{ color: 'var(--color-brand-primary)', fontWeight: 700 }}>{payload[0].value}ms</div>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

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

  // Tick every 30s to refresh relative times
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
    .flatMap(m => (m.checks ?? []).map(c => ({ ...c, monitorName: m.name })))
    .filter(c => c.status === 'down' || c.status === 'degraded')
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
    .slice(0, 6);

  const selectedMonitor = monitors[selectedIndex] || monitors[0] || null;

  const barChartData = selectedMonitor?.checks
    ? [...selectedMonitor.checks]
        .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime())
        .slice(-12)
        .map(c => ({
          name: new Date(c.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ms: c.responseTimeMs ?? 0,
          status: c.status,
        }))
    : [];

  const checksUp       = selectedMonitor?.checks?.filter(c => c.status === 'up').length ?? 0;
  const checksTotal    = selectedMonitor?.checks?.length ?? 0;
  const selectedUptime = checksTotal > 0 ? Math.round((checksUp / checksTotal) * 100) : 100;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
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
          <Link href="/playground" style={{ textDecoration: 'none' }}>
            <button className="btn-glass" style={{ height: 36, fontSize: 11, padding: '0 16px', borderRadius: 10 }}>
              {t('dash_security_console')}
            </button>
          </Link>
        </div>
      </div>

      {/* ── Global Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
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
            bg: latencyStatus.bg,
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

      {/* ── Main Grid ── */}
      <div className="db-grid">

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>

          {/* Latency Chart */}
          <div className="glass-card" style={{ padding: 24, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-txt-primary)', margin: 0 }}>
                  {selectedMonitor ? `${selectedMonitor.name}` : t('dash_latency_flow')}
                </h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', textTransform: 'uppercase' }}>{t('dash_latency_label')} — {t('dash_recent_checks')}</span>
              </div>
              {selectedMonitor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#16A34A', background: 'rgba(22,163,74,0.08)', padding: '2px 8px', borderRadius: 6 }}>
                    {selectedUptime}% uptime
                  </span>
                </div>
              )}
            </div>
            <div style={{ height: 150, width: '100%' }}>
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={barChartData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="var(--color-brand-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'var(--color-txt-secondary)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: 'var(--color-txt-secondary)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="ms" stroke="var(--color-brand-primary)" strokeWidth={2} fill="url(#latGrad)" dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const color = payload.status === 'down' ? '#DC2626' : payload.status === 'degraded' ? '#D97706' : 'var(--color-brand-primary)';
                      return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} stroke="white" strokeWidth={1.5} />;
                    }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-txt-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {t('dash_no_metrics')}
                </div>
              )}
            </div>
          </div>

          {/* Incidents Log */}
          <div className="glass-card" style={{ padding: 24, minWidth: 0 }}>
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
                  <div key={inc.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px',
                    background: inc.status === 'down' ? 'rgba(220,38,38,0.04)' : 'rgba(217,119,6,0.04)',
                    borderRadius: 12,
                    border: `1px solid ${inc.status === 'down' ? 'rgba(220,38,38,0.15)' : 'rgba(217,119,6,0.15)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: inc.status === 'down' ? '#DC2626' : '#D97706',
                      }} />
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

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

          {/* Services header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-txt-primary)', margin: 0 }}>
              {t('dash_my_services')}
            </h3>
            <Link href="/import" style={{ textDecoration: 'none' }}>
              <button className="btn-solid-glow" style={{ height: 30, fontSize: 10, padding: '0 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {t('dash_add_monitor')}
              </button>
            </Link>
          </div>

          {/* Services Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 68px 62px 68px 48px 72px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--color-border-main)',
              background: 'rgba(249,250,251,0.6)',
            }}>
              {[t('dash_col_service'), t('dash_col_status'), t('dash_col_uptime'), t('dash_col_latency'), 'Hace', ''].map(h => (
                <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
              ))}
            </div>

            {/* Table rows */}
            {monitors.map((m, index) => {
              const status = getLastStatus(m);
              const totalChecks = m.checks?.length ?? 0;
              const upChecks = m.checks?.filter(c => c.status === 'up').length ?? 0;
              const uptimePct = totalChecks > 0 ? Math.round((upChecks / totalChecks) * 100) : 100;
              const latestMs = m.checks?.[0]?.responseTimeMs;
              const lastCheckedAt = m.checks?.[0]?.checkedAt;
              const statusColor = status === 'up' ? '#16A34A' : status === 'down' ? '#DC2626' : '#D97706';
              const isSelected = index === selectedIndex;
              const isChecking = checkingId === m.id;
              const isToggling = togglingId === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedIndex(index)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 68px 62px 68px 48px 72px',
                    padding: '12px 16px',
                    borderBottom: index < monitors.length - 1 ? '1px solid var(--color-border-main)' : 'none',
                    background: isSelected ? 'rgba(124,58,237,0.04)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    alignItems: 'center',
                    opacity: m.isActive ? 1 : 0.55,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(124,58,237,0.03)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Name */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {!m.isActive && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-txt-muted)', background: 'var(--color-border-main)', padding: '1px 5px', borderRadius: 4 }}>
                          PAUSADO
                        </span>
                      )}
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--color-txt-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name}
                      </div>
                    </div>
                    {m.url && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {m.url.replace('https://', '').replace('http://', '')}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 7px', borderRadius: 6,
                      background: status === 'up' ? 'rgba(22,163,74,0.1)' : status === 'down' ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)',
                      fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
                      color: statusColor, letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      <span style={{
                        width: 4, height: 4, borderRadius: '50%', background: statusColor, flexShrink: 0,
                        ...(status === 'down' ? { boxShadow: `0 0 0 2px rgba(220,38,38,0.3)` } : {}),
                      }} />
                      {status}
                    </span>
                  </div>

                  {/* Uptime */}
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: uptimePct >= 99 ? '#16A34A' : uptimePct >= 95 ? '#D97706' : '#DC2626' }}>
                      {uptimePct}%
                    </div>
                    <div style={{ height: 2, background: 'var(--color-border-main)', borderRadius: 1, marginTop: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${uptimePct}%`, background: uptimePct >= 99 ? '#16A34A' : uptimePct >= 95 ? '#D97706' : '#DC2626', borderRadius: 1, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>

                  {/* Latency */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: latestMs == null ? 'var(--color-txt-muted)' : latestMs > 1500 ? '#DC2626' : latestMs > 800 ? '#D97706' : 'var(--color-txt-primary)' }}>
                    {latestMs != null ? `${latestMs}ms` : '—'}
                  </div>

                  {/* Last check */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)' }}>
                    {lastCheckedAt ? timeAgo(lastCheckedAt) : '—'}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                    {/* Check Now */}
                    <button
                      onClick={e => handleCheckNow(m.id, e)}
                      disabled={isChecking}
                      title="Verificar ahora"
                      style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--color-border-main)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-txt-muted)', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-light)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; e.currentTarget.style.borderColor = 'var(--color-brand-mid)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-txt-muted)'; e.currentTarget.style.borderColor = 'var(--color-border-main)'; }}
                    >
                      {isChecking
                        ? <span style={{ fontSize: 8 }}>…</span>
                        : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.67"/></svg>
                      }
                    </button>

                    {/* Pause/Resume */}
                    <button
                      onClick={e => handleToggle(m, e)}
                      disabled={isToggling}
                      title={m.isActive ? 'Pausar' : 'Reanudar'}
                      style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--color-border-main)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-txt-muted)', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-light)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; e.currentTarget.style.borderColor = 'var(--color-brand-mid)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-txt-muted)'; e.currentTarget.style.borderColor = 'var(--color-border-main)'; }}
                    >
                      {m.isActive
                        ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      }
                    </button>

                    {/* Open detail */}
                    <Link href={`/monitors/${m.id}`} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--color-border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-txt-muted)', textDecoration: 'none', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-light)'; e.currentTarget.style.color = 'var(--color-brand-primary)'; e.currentTarget.style.borderColor = 'var(--color-brand-mid)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--color-txt-muted)'; e.currentTarget.style.borderColor = 'var(--color-border-main)'; }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected monitor detail */}
          {selectedMonitor && (
            <div className="glass-card" style={{ padding: 18, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-brand-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('dash_selected_monitor')}</span>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-txt-primary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedMonitor.name}
                  </div>
                </div>
                <StatusBadge status={getLastStatus(selectedMonitor)} showPulse />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: t('dash_response'), value: selectedMonitor.checks?.[0]?.responseTimeMs != null ? `${selectedMonitor.checks[0].responseTimeMs}ms` : '—', color: 'var(--color-brand-primary)' },
                  { label: t('dash_ssl'), value: selectedMonitor.checks?.[0]?.sslDaysLeft != null ? `${selectedMonitor.checks[0].sslDaysLeft}d` : '—', color: '#D97706' },
                  { label: t('dash_status_code'), value: selectedMonitor.checks?.[0]?.statusCode != null ? `${selectedMonitor.checks[0].statusCode}` : '—', color: 'var(--color-txt-primary)' },
                  { label: 'Uptime', value: `${selectedUptime}%`, color: selectedUptime >= 99 ? '#16A34A' : '#D97706' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--color-bg-card-hover)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--color-border-main)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-txt-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {selectedMonitor.checks && selectedMonitor.checks.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <UptimeBar checks={selectedMonitor.checks} segments={60} />
                </div>
              )}

              <Link href={`/monitors/${selectedMonitor.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <button className="btn-glass" style={{ width: '100%', height: 32, fontSize: 11, borderRadius: 8, justifyContent: 'center' }}>
                  {t('dash_view_details')}
                </button>
              </Link>
            </div>
          )}

        </div>
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
