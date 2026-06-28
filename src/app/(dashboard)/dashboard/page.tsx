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
        background: 'rgba(11, 19, 58, 0.96)',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '12px',
        padding: '10px 14px',
        color: 'var(--color-txt-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ fontWeight: 'bold', color: '#8F9BB3', marginBottom: 4 }}>Check Time: {payload[0].payload.name}</div>
        <div style={{ color: 'var(--color-acid)', fontWeight: 600 }}>Latency: {payload[0].value}ms</div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(11, 19, 58, 0.96)',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '12px',
        padding: '10px 14px',
        color: 'var(--color-txt-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ fontWeight: 'bold', color: payload[0].payload.color || 'var(--color-acid)', marginBottom: 2 }}>{payload[0].name}</div>
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
    background: 'rgba(11, 19, 58, 0.95)',
    border: '1px solid rgba(0, 240, 255, 0.25)',
    borderRadius: '16px',
    padding: '12px 16px',
    color: 'var(--color-txt-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(12px)'
  };

  // Determine actual stacked cards structure
  const cardCount = Math.min(3, monitors.length);

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
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#FF007F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%', paddingLeft: 8 }}>
                      {inc.errorMessage || 'Status Check Failed'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'rgba(0, 240, 255, 0.01)', borderRadius: 16, border: '1px dashed rgba(0, 240, 255, 0.15)', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-acid)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          
          {/* Stacked cards header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--color-txt-primary)', margin: 0 }}>
              My Services
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-acid)' }}>
              {monitors.length} Active
            </span>
          </div>

          {/* Conditional Stacked credit cards visualization */}
          <div style={{ position: 'relative', height: cardCount === 1 ? 180 : cardCount === 2 ? 195 : 210, marginBottom: 12 }}>
            
            {/* Back Card 3 (Renders only if at least 3 monitors exist) */}
            {cardCount >= 3 && (
              <div style={{
                position: 'absolute', top: 0, left: 16, right: 16, height: 180,
                background: 'linear-gradient(135deg, #FF007F 0%, #7000FF 100%)',
                borderRadius: 24, opacity: 0.25, transform: 'scale(0.9)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }} />
            )}
            
            {/* Middle Card 2 (Renders only if at least 2 monitors exist) */}
            {cardCount >= 2 && (
              <div style={{
                position: 'absolute', 
                top: cardCount === 2 ? 0 : 10, 
                left: cardCount === 2 ? 12 : 8, 
                right: cardCount === 2 ? 12 : 8, 
                height: 180,
                background: 'linear-gradient(135deg, #00F0FF 0%, #0072FF 100%)',
                borderRadius: 24, 
                opacity: cardCount === 2 ? 0.35 : 0.4, 
                transform: cardCount === 2 ? 'scale(0.93)' : 'scale(0.95)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }} />
            )}
            
            {/* Front Card 1 (Frosted Glass Card - Renders always) */}
            <div className="glass-card" style={{
              position: 'absolute', 
              top: cardCount === 1 ? 0 : cardCount === 2 ? 15 : 20, 
              left: 0, 
              right: 0, 
              height: 180,
              borderRadius: 24, padding: 24,
              background: 'rgba(255, 255, 255, 0.04)',
              backdropFilter: 'blur(30px) saturate(180%)',
              border: '1px solid var(--color-border-main)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 var(--color-border-hover)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              transition: 'all 0.3s ease'
            }}>
              {/* Logo & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 18, height: 18, background: 'var(--color-acid)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="var(--color-bg-base)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', letterSpacing: '0.05em' }}>PULSE CARD</span>
                </div>
                <div style={{ padding: '2px 8px', borderRadius: 999, background: selectedMonitor && getLastStatus(selectedMonitor) === 'up' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 0, 127, 0.1)', border: selectedMonitor && getLastStatus(selectedMonitor) === 'up' ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255, 0, 127, 0.3)' }}>
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: selectedMonitor && getLastStatus(selectedMonitor) === 'up' ? '#00F0FF' : '#FF007F', fontWeight: 'bold' }}>
                    ● {selectedMonitor ? getLastStatus(selectedMonitor).toUpperCase() : 'EMPTY'}
                  </span>
                </div>
              </div>

              {/* Service Details */}
              <div style={{ minWidth: 0 }}>
                <h4 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--color-txt-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedMonitor ? selectedMonitor.name : 'No services configured'}
                </h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedMonitor?.url ? selectedMonitor.url.replace('https://', '').replace('http://', '') : 'No URL'}
                </div>
              </div>

              {/* Card footer details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ display: 'block', fontSize: 8, color: 'var(--color-txt-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Response Time</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#00F0FF' }}>
                    {selectedMonitor ? ms(selectedMonitor.checks?.[0]?.responseTimeMs) : '—'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: 8, color: 'var(--color-txt-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>SSL Certificate</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#FF007F' }}>
                    {selectedMonitor?.checks?.[0]?.sslDaysLeft != null ? `${selectedMonitor.checks[0].sslDaysLeft}d` : '—'}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Ethereal styled Services List */}
          {monitors.length > 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: 4 }}>
                Recent Activities
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {monitors.map((m, index) => {
                  const active = index === selectedIndex;
                  const status = getLastStatus(m);
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedIndex(index)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 16,
                        background: active ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                        border: active ? '1px solid var(--color-border-main)' : '1px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        minWidth: 0
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: status === 'up' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 0, 127, 0.08)', border: status === 'up' ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid rgba(255, 0, 127, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'up' ? '#00F0FF' : '#FF007F' }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--color-txt-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.url ? m.url.replace('https://', '') : 'GitHub Commits'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 'bold', color: active ? 'var(--color-acid)' : 'var(--color-txt-primary)' }}>
                          {ms(m.checks?.[0]?.responseTimeMs)}
                        </span>
                        <Link href={`/monitors/${m.id}`} style={{ display: 'flex', alignItems: 'center' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-txt-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: active ? 1 : 0.4 }}>
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 20, background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--color-border-main)', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Quick Action
              </span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-txt-secondary)', margin: 0, lineHeight: 1.5 }}>
                Track more endpoints or web repositories to get a unified overview of all your microservices.
              </p>
              <Link href="/import" style={{ textDecoration: 'none', width: '100%' }}>
                <button className="btn-glass" style={{ width: '100%', height: 36, fontSize: 11, borderRadius: 999 }}>
                  + Add Another Service
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
    <div style={{ border: '1px dashed rgba(0, 240, 255, 0.2)', borderRadius: 28, padding: '56px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, background: 'rgba(8, 12, 36, 0.4)', backdropFilter: 'blur(12px)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-acid)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        // Getting started
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
            <div style={{ width: 28, height: 28, background: s.n === '1' ? 'var(--color-acid)' : 'var(--color-border-main)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: s.n === '1' ? 'var(--color-bg-base)' : 'var(--color-txt-secondary)' }}>{s.n}</span>
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
