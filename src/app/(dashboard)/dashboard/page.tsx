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
  if (!grade) return 'var(--color-txt-secondary)';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return '#00F0FF';
  if (g.startsWith('B')) return '#FFB300';
  if (g.startsWith('C')) return '#FFB300';
  if (g.startsWith('D')) return '#FF007F';
  if (g.startsWith('F')) return '#FF007F';
  return 'var(--color-txt-secondary)';
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--color-bg-sidebar)',
        border: '1px solid var(--color-border-main)',
        borderRadius: '12px',
        padding: '10px 14px',
        color: 'var(--color-txt-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontWeight: 'bold', color: 'var(--color-txt-muted)', marginBottom: 4 }}>Check Time: {payload[0].payload.name}</div>
        <div style={{ color: 'var(--color-brand-primary)', fontWeight: 600 }}>Latency: {payload[0].value}ms</div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--color-bg-sidebar)',
        border: '1px solid var(--color-border-main)',
        borderRadius: '12px',
        padding: '10px 14px',
        color: 'var(--color-txt-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontWeight: 'bold', color: payload[0].payload.color || 'var(--color-brand-primary)', marginBottom: 2 }}>{payload[0].name}</div>
        <div style={{ color: 'var(--color-txt-primary)' }}>Checks count: {payload[0].value}</div>
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
  
  // Interactive selected monitor index
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

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

  // Calculate overall uptime ratio across all monitors
  const totalAllChecks = monitors.reduce((sum, m) => sum + (m.checks?.length ?? 0), 0);
  const totalAllUpChecks = monitors.reduce((sum, m) => sum + (m.checks?.filter(c => c.status === 'up').length ?? 0), 0);
  const uptimeRatio = totalAllChecks > 0
    ? Math.round((totalAllUpChecks / totalAllChecks) * 100)
    : 100;

  // Calculate average latency across all monitors
  const latestResponseTimes = monitors
    .map(m => m.checks?.[0]?.responseTimeMs)
    .filter((ms): ms is number => ms != null);
  const avgLatency = latestResponseTimes.length > 0
    ? Math.round(latestResponseTimes.reduce((a, b) => a + b, 0) / latestResponseTimes.length)
    : 0;

  // Gather recent incidents from all monitors (status !== 'up')
  const incidents = monitors
    .flatMap(m => (m.checks ?? []).map(c => ({
      ...c,
      monitorName: m.name,
      url: m.url
    })))
    .filter(c => c.status === 'down' || c.status === 'degraded')
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
    .slice(0, 5);

  // Selected monitor for the credit card mock deck and charts
  const selectedMonitor = monitors[selectedIndex] || monitors[0] || null;

  // Prepare latency bar chart data specifically for the selected monitor's checks history
  const barChartData = selectedMonitor && selectedMonitor.checks
    ? [...selectedMonitor.checks]
        .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime())
        .slice(-10)
        .map((c) => {
          const date = new Date(c.checkedAt);
          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return {
            name: timeStr,
            ms: c.responseTimeMs ?? 0
          };
        })
    : [];

  // Prepare Pie Chart data specifically for the selected monitor's checks status breakdown
  const checksUp = selectedMonitor?.checks?.filter(c => c.status === 'up').length ?? 0;
  const checksDown = selectedMonitor?.checks?.filter(c => c.status === 'down').length ?? 0;
  const checksDegraded = selectedMonitor?.checks?.filter(c => c.status === 'degraded').length ?? 0;

  const pieChartData = [
    { name: 'Operational', value: checksUp, color: 'var(--color-status-up)' },
    { name: 'Down', value: checksDown, color: 'var(--color-status-down)' },
    { name: 'Degraded', value: checksDegraded, color: 'var(--color-status-degraded)' }
  ].filter(d => d.value > 0);

  // Default placeholder if empty
  if (pieChartData.length === 0 && !loading) {
    pieChartData.push({ name: 'No checks', value: 1, color: 'var(--color-border-main)' });
  }

  // Calculate selected monitor metrics
  const selectedAvgLatency = selectedMonitor?.checks && selectedMonitor.checks.length > 0
    ? Math.round(selectedMonitor.checks.reduce((acc, c) => acc + (c.responseTimeMs ?? 0), 0) / selectedMonitor.checks.length)
    : 0;

  const totalSelectedChecks = selectedMonitor?.checks?.length ?? 0;
  const selectedUptimeRatio = totalSelectedChecks > 0
    ? Math.round((checksUp / totalSelectedChecks) * 100)
    : 100;

  const customTooltipStyle = {
    background: 'var(--color-bg-sidebar)',
    border: '1px solid var(--color-border-main)',
    borderRadius: '16px',
    padding: '12px 16px',
    color: 'var(--color-txt-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  };

  if (!loading && monitors.length === 0) {
    return (
      <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>
        {/* ── Top Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, gap: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--color-txt-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              My Dashboard
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(0, 240, 255, 0.4)', background: 'linear-gradient(135deg, #00F0FF 0%, #FF007F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 'bold', color: 'var(--color-bg-base)', boxShadow: '0 0 10px rgba(0,240,255,0.2)' }}>
              PG
            </div>
          </div>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>

      {/* ── Top Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--color-txt-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            My Dashboard
          </h1>
        </div>
        {/* Top icons bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn-glass" style={{ width: 40, height: 40, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button className="btn-glass" style={{ width: 40, height: 40, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--color-border-hover)', background: 'linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-accent-amber) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 'bold', color: 'var(--color-txt-btn-primary)', boxShadow: '0 0 10px rgba(45,27,105,0.2)' }}>
            PG
          </div>
        </div>
      </div>

      {/* ── Dashboard Grid (Responsive wrapper) ── */}
      <div className="db-grid">
        
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          
          {/* Header statistics block */}
          <div className="db-row-2">
            
            {/* Main Uptime Hero Card */}
            <div className="glass-card" style={{
              borderRadius: 20,
              padding: 28,
              background: 'linear-gradient(135deg, rgba(45, 27, 105, 0.08) 0%, rgba(196, 181, 253, 0.08) 100%)',
              border: '1px solid var(--color-border-main)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 180,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-brand-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>System Health</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 800, color: 'var(--color-txt-primary)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>{uptimeRatio}%</h3>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-brand-primary)' }}>{upCount} / {monitors.length} Active</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <Link href="/import" style={{ textDecoration: 'none' }}>
                  <button className="btn-solid-glow" style={{ height: 36, fontSize: 11, padding: '0 20px', borderRadius: 8 }}>
                    Add Monitor
                  </button>
                </Link>
                <Link href="/playground" style={{ textDecoration: 'none' }}>
                  <button className="btn-glass" style={{ height: 36, fontSize: 11, padding: '0 20px', borderRadius: 8 }}>
                    Security Console
                  </button>
                </Link>
              </div>
            </div>

            {/* Smaller details cards stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Active Checks */}
              <div className="glass-card" style={{ flex: 1, padding: '18px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--color-bg-card)', borderRadius: 12 }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-secondary)', textTransform: 'uppercase' }}>Active Monitors</span>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-brand-primary)', marginTop: 6 }}>{monitors.length} Services</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)' }}>All systems checked</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-brand-primary)', background: 'var(--color-brand-light)', padding: '2px 6px', borderRadius: 4 }}>+12%</span>
                </div>
              </div>

              {/* Avg Latency */}
              <div className="glass-card" style={{ flex: 1, padding: '18px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--color-bg-card)', borderRadius: 12 }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-secondary)', textTransform: 'uppercase' }}>System Latency</span>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-accent-amber)', marginTop: 6 }}>{avgLatency} ms</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)' }}>Checks latency average</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-accent-amber)', background: 'var(--color-accent-amber-light)', padding: '2px 6px', borderRadius: 4 }}>STABLE</span>
                </div>
              </div>

          </div>

        </div>

          {/* Charts Row (Responsive wrapper) */}
          <div className="db-row-2">
            
            {/* Latency Flow Bar Chart */}
            <div className="glass-card" style={{ padding: 24, background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-txt-primary)', margin: 0 }}>
                  {selectedMonitor ? `${selectedMonitor.name} Latency` : 'Latency Flow'}
                </h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-txt-secondary)', textTransform: 'uppercase' }}>Recent Checks</span>
              </div>
              <div style={{ height: 160, width: '100%', position: 'relative' }}>
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--color-txt-secondary)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--color-txt-secondary)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} />
                      <Bar dataKey="ms" fill="var(--color-acid)" radius={[6, 6, 0, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.ms > 1000 ? '#FFB300' : 'var(--color-acid)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-txt-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    No check metrics.
                  </div>
                )}
              </div>
            </div>

            {/* Status Split Doughnut */}
            <div className="glass-card" style={{ padding: 24, background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-txt-primary)', margin: '0 0 10px', alignSelf: 'flex-start' }}>
                {selectedMonitor ? `${selectedMonitor.name} Stats` : 'Status Split'}
              </h3>
              <div style={{ height: 120, width: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-txt-primary)', lineHeight: 1 }}>
                    {selectedMonitor ? selectedUptimeRatio : 100}%
                  </span>
                  <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--color-txt-secondary)', textTransform: 'uppercase', marginTop: 2 }}>Uptime</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                {pieChartData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-secondary)' }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Performance timeline deck */}
          <div className="glass-card" style={{ padding: 24, background: 'rgba(255, 255, 255, 0.02)', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-secondary)', textTransform: 'uppercase' }}>Recent Incidents Log</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-secondary)' }}>System logs active</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {incidents.length > 0 ? (
                incidents.map((inc) => (
                  <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                      <StatusBadge status={inc.status} showPulse={false} />
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--color-txt-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.monitorName}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-status-down)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%', paddingLeft: 8 }}>
                      {inc.errorMessage || 'Status Check Failed'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'var(--color-bg-card-hover)', borderRadius: 16, border: '1px dashed var(--color-border-hover)', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-brand-light)', border: '1px solid var(--color-brand-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--color-txt-primary)' }}>
                    All Systems Operational
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-secondary)', textAlign: 'center' }}>
                    No incident reports in the last checks history.
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

          {/* My Services header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-txt-primary)', margin: 0 }}>
              My Services
            </h3>
            <Link href="/import" style={{ textDecoration: 'none' }}>
              <button className="btn-solid-glow" style={{ height: 32, fontSize: 11, padding: '0 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Monitor
              </button>
            </Link>
          </div>

          {/* Services Table Card */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12 }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 72px 80px 64px 32px',
              gap: 0,
              padding: '10px 16px',
              borderBottom: '1px solid var(--color-border-main)',
              background: 'var(--color-bg-card-hover)',
            }}>
              {['Service', 'Status', 'Uptime', 'Latency', ''].map((h) => (
                <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
              ))}
            </div>

            {/* Table rows */}
            {monitors.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-txt-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                No monitors configured yet.
              </div>
            ) : (
              monitors.map((m, index) => {
                const status = getLastStatus(m);
                const totalChecks = m.checks?.length ?? 0;
                const upChecks = m.checks?.filter(c => c.status === 'up').length ?? 0;
                const uptimePct = totalChecks > 0 ? Math.round((upChecks / totalChecks) * 100) : 100;
                const latestMs = m.checks?.[0]?.responseTimeMs;
                const statusColor = status === 'up' ? 'var(--color-status-up)' : status === 'down' ? 'var(--color-status-down)' : 'var(--color-status-degraded)';
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedIndex(index)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 72px 80px 64px 32px',
                      gap: 0,
                      padding: '13px 16px',
                      borderBottom: index < monitors.length - 1 ? '1px solid var(--color-border-main)' : 'none',
                      background: isSelected ? 'var(--color-bg-card-hover)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      alignItems: 'center',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--color-bg-card-hover)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Name + URL */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        fontSize: 13,
                        color: 'var(--color-txt-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {m.name}
                      </div>
                      {m.url && (
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--color-txt-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginTop: 2
                        }}>
                          {m.url.replace('https://', '').replace('http://', '')}
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <div>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: status === 'up'
                          ? 'rgba(22, 101, 52, 0.1)'
                          : status === 'down'
                          ? 'rgba(185, 28, 28, 0.1)'
                          : 'rgba(146, 64, 14, 0.1)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        fontWeight: 700,
                        color: statusColor,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                        {status}
                      </span>
                    </div>

                    {/* Uptime */}
                    <div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: uptimePct >= 99 ? 'var(--color-status-up)' : uptimePct >= 95 ? 'var(--color-status-degraded)' : 'var(--color-status-down)',
                      }}>
                        {uptimePct}%
                      </div>
                      {/* Mini uptime bar */}
                      <div style={{ height: 3, background: 'var(--color-border-main)', borderRadius: 2, marginTop: 4, width: 56, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${uptimePct}%`, background: uptimePct >= 99 ? 'var(--color-status-up)' : uptimePct >= 95 ? 'var(--color-status-degraded)' : 'var(--color-status-down)', borderRadius: 2, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>

                    {/* Latency */}
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: latestMs == null ? 'var(--color-txt-muted)' : latestMs > 2000 ? 'var(--color-status-down)' : latestMs > 1000 ? 'var(--color-status-degraded)' : 'var(--color-txt-primary)',
                    }}>
                      {latestMs != null ? `${latestMs}ms` : '—'}
                    </div>

                    {/* Arrow link */}
                    <Link
                      href={`/monitors/${m.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-txt-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected monitor detail card */}
          {selectedMonitor && (
            <div className="glass-card" style={{ padding: 18, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-brand-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Selected Monitor</span>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-txt-primary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedMonitor.name}
                  </div>
                </div>
                <StatusBadge status={getLastStatus(selectedMonitor)} showPulse />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  {
                    label: 'Response',
                    value: selectedMonitor.checks?.[0]?.responseTimeMs != null ? `${selectedMonitor.checks[0].responseTimeMs}ms` : '—',
                    color: 'var(--color-brand-primary)',
                  },
                  {
                    label: 'SSL',
                    value: selectedMonitor.checks?.[0]?.sslDaysLeft != null ? `${selectedMonitor.checks[0].sslDaysLeft}d` : '—',
                    color: 'var(--color-accent-amber)',
                  },
                  {
                    label: 'Status Code',
                    value: selectedMonitor.checks?.[0]?.statusCode != null ? `${selectedMonitor.checks[0].statusCode}` : '—',
                    color: 'var(--color-txt-primary)',
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--color-bg-card-hover)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--color-border-main)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>

              <Link href={`/monitors/${selectedMonitor.id}`} style={{ textDecoration: 'none', display: 'block', marginTop: 12 }}>
                <button className="btn-glass" style={{ width: '100%', height: 34, fontSize: 11, borderRadius: 8, justifyContent: 'center' }}>
                  View Full Details →
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
    { n: '1', title: 'Add a monitor', desc: 'Paste any URL or connect a GitHub repo. Takes 30 seconds.', cta: true },
    { n: '2', title: 'Set up alerts', desc: 'Add a Discord/Slack webhook or email in Settings → Preferences.' },
    { n: '3', title: 'Go to sleep', desc: 'PulseGuard checks every minute and alerts you when something breaks.' },
  ];
  return (
    <div style={{ border: '1px dashed var(--color-border-hover)', borderRadius: 28, padding: '56px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, background: 'var(--color-bg-card)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-brand-primary)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        Getting started
      </p>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--color-txt-primary)', margin: '0 0 8px', textAlign: 'center' }}>
        {t('dash_empty_title')}
      </h3>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-secondary)', margin: '0 0 40px', maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
        {t('dash_empty_desc')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36, width: '100%', maxWidth: 680 }} className="empty-steps-grid">
        {steps.map((s) => (
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
