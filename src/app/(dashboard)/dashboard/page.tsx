'use client';

import { useEffect, useState, useCallback } from 'react';
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
  PieChart,
  Pie
} from 'recharts';

function getLastStatus(monitor: Monitor): MonitorStatus {
  return (monitor.checks?.[0]?.status as MonitorStatus) ?? 'unknown';
}

function ms(val: number | null | undefined) {
  if (val == null) return '—';
  return `${val}ms`;
}

function getGradeColor(grade: string) {
  if (!grade) return '#6D7B9B';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return '#00F0FF';
  if (g.startsWith('B')) return '#FFB300';
  if (g.startsWith('C')) return '#FFB300';
  if (g.startsWith('D')) return '#FF007F';
  if (g.startsWith('F')) return '#FF007F';
  return '#6D7B9B';
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

  // Prepare data for the Bar Chart (latency flow)
  const barChartData = monitors.map(m => {
    const lastCheck = m.checks?.[0];
    return {
      name: m.name.substring(0, 12),
      ms: lastCheck?.responseTimeMs ?? 0
    };
  }).filter(d => d.ms > 0);

  // Prepare data for the Pie Chart (status distribution)
  const pieChartData = [
    { name: 'Operational', value: upCount, color: '#00F0FF' },
    { name: 'Down', value: downCount, color: '#FF007F' },
    { name: 'Degraded', value: degradedCount, color: '#FFB300' }
  ].filter(d => d.value > 0);

  // If there are no data entries for status breakdown, default placeholder
  if (pieChartData.length === 0 && !loading) {
    pieChartData.push({ name: 'No monitors', value: 1, color: 'rgba(255,255,255,0.05)' });
  }

  // General Average Uptime & Latency calculations
  const avgLatency = barChartData.length > 0
    ? Math.round(barChartData.reduce((acc, curr) => acc + curr.ms, 0) / barChartData.length)
    : 0;

  const uptimeRatio = monitors.length > 0
    ? Math.round((upCount / monitors.length) * 100)
    : 100;

  const customTooltipStyle = {
    background: '#0B133A',
    border: '1px solid rgba(0, 240, 255, 0.2)',
    borderRadius: '12px',
    padding: '10px 14px',
    color: '#F0F0F0',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)'
  };

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-acid)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            // {t('dash_system')}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: '#F0F0F0', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {t('nav_projects')}
          </h1>
        </div>
        <Link href="/import" style={{ textDecoration: 'none' }}>
          <button className="btn-solid-glow" style={{ height: 40, fontSize: 12, padding: '0 24px', borderRadius: 999 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ marginRight: 6 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('btn_import')}
          </button>
        </Link>
      </div>

      {/* ── Dashboard Cards Grid (Resumen) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 20, marginBottom: 28 }} className="dashboard-summary-grid">
        
        {/* Main Performance Balance Card */}
        <div className="glass-card" style={{
          borderRadius: 24,
          padding: 24,
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(255, 0, 127, 0.15) 100%)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-acid)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>System Health</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: '#F0F0F0', margin: 0 }}>{loading ? '—' : `${uptimeRatio}%`}</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-acid)' }}>{upCount} / {monitors.length} Active</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Link href="/import" style={{ textDecoration: 'none' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 16px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 999, color: '#F0F0F0', fontSize: 11, fontWeight: 600, border: '1px solid rgba(255, 255, 255, 0.15)', cursor: 'pointer' }}>
                Add New
              </span>
            </Link>
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 16px', background: 'transparent', borderRadius: 999, color: 'var(--color-acid)', fontSize: 11, fontWeight: 600, border: '1px solid rgba(0, 240, 255, 0.25)' }}>
              Avg Latency: {loading ? '—' : `${avgLatency}ms`}
            </span>
          </div>
        </div>

        {/* Operational card */}
        <div className="glass-card" style={{ borderRadius: 24, padding: 24, background: 'rgba(8, 12, 36, 0.65)', border: '1px solid rgba(0, 240, 255, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6D7B9B', textTransform: 'uppercase' }}>{t('dash_operational')}</span>
            <div style={{ fontSize: 44, fontWeight: 800, color: '#00F0FF', marginTop: 12, fontFamily: 'var(--font-display)' }}>{loading ? '—' : upCount}</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B' }}>Active check running</span>
        </div>

        {/* Down card */}
        <div className="glass-card" style={{ borderRadius: 24, padding: 24, background: 'rgba(8, 12, 36, 0.65)', border: '1px solid rgba(0, 240, 255, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6D7B9B', textTransform: 'uppercase' }}>{t('dash_down')}</span>
            <div style={{ fontSize: 44, fontWeight: 800, color: '#FF007F', marginTop: 12, fontFamily: 'var(--font-display)' }}>{loading ? '—' : downCount}</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B' }}>Requires immediate review</span>
        </div>

        {/* Degraded card */}
        <div className="glass-card" style={{ borderRadius: 24, padding: 24, background: 'rgba(8, 12, 36, 0.65)', border: '1px solid rgba(0, 240, 255, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6D7B9B', textTransform: 'uppercase' }}>{t('dash_degraded')}</span>
            <div style={{ fontSize: 44, fontWeight: 800, color: '#FFB300', marginTop: 12, fontFamily: 'var(--font-display)' }}>{loading ? '—' : degradedCount}</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B' }}>High response times</span>
        </div>

      </div>

      {/* ── Graphics Row ── */}
      {!loading && monitors.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 28 }} className="dashboard-charts-grid">
          
          {/* Latency Flow Bar Chart */}
          <div className="glass-card" style={{ borderRadius: 24, padding: 24, background: 'rgba(8, 12, 36, 0.65)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: '0 0 20px' }}>Latency Flow (ms)</h3>
            <div style={{ height: 180, width: '100%', flex: 1 }}>
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6D7B9B', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#6D7B9B', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={customTooltipStyle} cursor={{ fill: 'rgba(0, 240, 255, 0.03)' }} />
                    <Bar dataKey="ms" fill="#00F0FF" radius={[6, 6, 0, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.ms > 1000 ? '#FFB300' : 'var(--color-acid)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6D7B9B', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  No latency metrics collected yet.
                </div>
              )}
            </div>
          </div>

          {/* Status Breakdown Donut Chart */}
          <div className="glass-card" style={{ borderRadius: 24, padding: 24, background: 'rgba(8, 12, 36, 0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: '0 0 10px', alignSelf: 'flex-start' }}>Status Split</h3>
            <div style={{ height: 140, width: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={customTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner ring text */}
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#F0F0F0', lineHeight: 1 }}>{monitors.length}</span>
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#6D7B9B', textTransform: 'uppercase', marginTop: 2 }}>Services</span>
              </div>
            </div>
            {/* Legend indicators */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              {pieChartData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6D7B9B' }}>{d.name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── Monitor list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 72, background: 'rgba(8, 12, 36, 0.4)', borderRadius: 20, opacity: 0.5 }} />
          ))}
        </div>
      ) : monitors.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="monitors-deck">
          <div style={{ display: 'flex', padding: '0 20px', marginBottom: -4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6D7B9B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Active Monitor Deck ({monitors.length})
            </span>
          </div>

          {monitors.map((monitor) => {
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
                  className="glass-card monitor-row-card"
                  style={{
                    borderRadius: 20,
                    padding: '16px 24px',
                    background: isDown ? 'rgba(255, 0, 127, 0.03)' : 'rgba(8, 12, 36, 0.65)',
                    border: isDown ? '1px solid rgba(255, 0, 127, 0.25)' : '1px solid rgba(0, 240, 255, 0.15)',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = isDown ? 'rgba(255, 0, 127, 0.45)' : 'rgba(0, 240, 255, 0.35)';
                    e.currentTarget.style.boxShadow = isDown ? '0 8px 30px rgba(255, 0, 127, 0.1)' : '0 8px 30px rgba(0, 240, 255, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = isDown ? 'rgba(255, 0, 127, 0.25)' : 'rgba(0, 240, 255, 0.15)';
                    e.currentTarget.style.boxShadow = '0 4px 20px 0 rgba(0, 0, 0, 0.15)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    
                    {/* Project details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 180, flex: 1.5 }}>
                      <StatusBadge status={status} showPulse={true} />
                      <div>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#F0F0F0', margin: '0 0 4px' }}>
                          {monitor.name}
                        </h4>
                        {monitor.url && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6D7B9B', wordBreak: 'break-all' }}>
                            {monitor.url}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats metrics */}
                    <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
                      
                      {/* Latency */}
                      <div>
                        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B', textTransform: 'uppercase', marginBottom: 2 }}>Response</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: lastCheck?.responseTimeMs && lastCheck.responseTimeMs > 1000 ? '#FFB300' : '#F0F0F0' }}>
                          {ms(lastCheck?.responseTimeMs)}
                        </span>
                      </div>

                      {/* SSL status */}
                      <div>
                        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B', textTransform: 'uppercase', marginBottom: 2 }}>SSL Days</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: (lastCheck?.sslDaysLeft ?? 999) < 14 ? '#FF007F' : '#00F0FF' }}>
                          {lastCheck?.sslDaysLeft != null ? `${lastCheck.sslDaysLeft}d` : '—'}
                        </span>
                      </div>

                      {/* Security grade */}
                      <div>
                        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B', textTransform: 'uppercase', marginBottom: 2 }}>Sec Grade</span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            fontWeight: 700,
                            color: getGradeColor(monitor.securityGrade ?? ''),
                            background: 'rgba(8, 12, 36, 0.4)',
                            border: `1px solid ${getGradeColor(monitor.securityGrade ?? '')}`,
                            padding: '1px 6px',
                            borderRadius: 999,
                          }}
                        >
                          {monitor.securityGrade ?? '—'}
                        </span>
                      </div>

                      {/* Check Interval */}
                      <div>
                        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B', textTransform: 'uppercase', marginBottom: 2 }}>Interval</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#6D7B9B' }}>
                          {monitor.intervalMinutes}m
                        </span>
                      </div>

                      {/* Next Check timer */}
                      <div>
                        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B', textTransform: 'uppercase', marginBottom: 2 }}>Next</span>
                        <NextCheck lastCheckedAt={lastCheck?.checkedAt ?? null} intervalMinutes={monitor.intervalMinutes} />
                      </div>

                    </div>

                    {/* Arrow arrow */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginLeft: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D7B9B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>

                  </div>

                  {/* Dynamic mini Uptime timeline bar inside card */}
                  {monitor.checks && monitor.checks.length > 0 && (
                    <div style={{ borderTop: '1px dashed rgba(0, 240, 255, 0.1)', paddingTop: 12 }}>
                      <UptimeBar checks={monitor.checks} segments={60} />
                    </div>
                  )}

                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Styled Responsive Queries */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-summary-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .dashboard-charts-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .dashboard-summary-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  const steps = [
    { n: '1', title: 'Add a monitor', desc: 'Paste any URL or connect a GitHub repo. Takes 30 seconds.', cta: true },
    { n: '2', title: 'Set up alerts', desc: 'Add a Discord/Slack webhook or email in Settings → Preferences.' },
    { n: '3', title: 'Go to sleep', desc: 'PulseGuard checks every minute and alerts you when something breaks.' },
  ];
  return (
    <div style={{ border: '1px dashed rgba(0, 240, 255, 0.2)', borderRadius: 24, padding: '56px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, background: 'rgba(8, 12, 36, 0.4)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-acid)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        // Getting started
      </p>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#F0F0F0', margin: '0 0 8px', textAlign: 'center' }}>
        {t('dash_empty_title')}
      </h3>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6D7B9B', margin: '0 0 40px', maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
        {t('dash_empty_desc')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36, width: '100%', maxWidth: 680 }} className="empty-steps-grid">
        {steps.map((s) => (
          <div key={s.n} className="glass-card" style={{ borderRadius: 20, padding: '20px' }}>
            <div style={{ width: 28, height: 28, background: s.n === '1' ? 'var(--color-acid)' : 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: s.n === '1' ? '#030514' : '#6D7B9B' }}>{s.n}</span>
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#F0F0F0', margin: '0 0 6px' }}>{s.title}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#6D7B9B', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
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

function NextCheck({ lastCheckedAt, intervalMinutes }: { lastCheckedAt: string | null; intervalMinutes: number }) {
  const [label, setLabel] = useState('—');

  useEffect(() => {
    function compute() {
      if (!lastCheckedAt) { setLabel(`${intervalMinutes}m`); return; }
      const nextMs = new Date(lastCheckedAt).getTime() + intervalMinutes * 60_000;
      const diffS = Math.round((nextMs - Date.now()) / 1000);
      if (diffS <= 0) { setLabel('now'); return; }
      if (diffS < 60) { setLabel(`${diffS}s`); return; }
      setLabel(`${Math.ceil(diffS / 60)}m`);
    }
    compute();
    const id = setInterval(compute, 5000);
    return () => clearInterval(id);
  }, [lastCheckedAt, intervalMinutes]);

  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: label === 'now' ? 'var(--color-acid)' : '#6D7B9B' }}>
      {label}
    </div>
  );
}
