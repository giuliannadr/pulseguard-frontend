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
  
  // Interactive selected monitor card index
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

  // Selected monitor for the credit card mock deck
  const selectedMonitor = monitors[selectedIndex] || monitors[0] || null;

  // Prepare data for the Bar Chart (latency flow)
  const barChartData = monitors.map(m => {
    const lastCheck = m.checks?.[0];
    return {
      name: m.name.substring(0, 10),
      ms: lastCheck?.responseTimeMs ?? 0
    };
  }).filter(d => d.ms > 0);

  // Prepare data for the Pie Chart (status distribution)
  const pieChartData = [
    { name: 'Operational', value: upCount, color: '#00F0FF' },
    { name: 'Down', value: downCount, color: '#FF007F' },
    { name: 'Degraded', value: degradedCount, color: '#FFB300' }
  ].filter(d => d.value > 0);

  // Default placeholder if empty
  if (pieChartData.length === 0 && !loading) {
    pieChartData.push({ name: 'No monitors', value: 1, color: 'rgba(255,255,255,0.05)' });
  }

  // General Uptime & Latency calculations
  const avgLatency = barChartData.length > 0
    ? Math.round(barChartData.reduce((acc, curr) => acc + curr.ms, 0) / barChartData.length)
    : 0;

  const uptimeRatio = monitors.length > 0
    ? Math.round((upCount / monitors.length) * 100)
    : 100;

  const customTooltipStyle = {
    background: 'rgba(11, 19, 58, 0.9)',
    border: '1px solid rgba(0, 240, 255, 0.25)',
    borderRadius: '16px',
    padding: '12px 16px',
    color: '#F0F0F0',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(12px)'
  };

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>

      {/* ── Top Header (Ethereal styled) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: '#F0F0F0', margin: 0, letterSpacing: '-0.02em' }}>
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
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(0, 240, 255, 0.4)', background: 'linear-gradient(135deg, #00F0FF 0%, #FF007F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 'bold', color: '#030514', boxShadow: '0 0 10px rgba(0,240,255,0.2)' }}>
            PG
          </div>
        </div>
      </div>

      {/* ── Main Dashboard Split Grid (Ethereal 2-Column structure) ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ height: 180, background: 'rgba(255,255,255,0.02)', borderRadius: 24, opacity: 0.5 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ height: 220, background: 'rgba(255,255,255,0.02)', borderRadius: 24, opacity: 0.5 }} />
            <div style={{ height: 220, background: 'rgba(255,255,255,0.02)', borderRadius: 24, opacity: 0.5 }} />
          </div>
        </div>
      ) : monitors.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="dashboard-layout-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: 32 }}>
          
          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            
            {/* Header statistics block (Total balance equivalent) */}
            <div className="dashboard-top-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
              
              {/* Main Uptime Hero Card */}
              <div className="glass-card" style={{
                borderRadius: 28,
                padding: 28,
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(112, 0, 255, 0.12) 50%, rgba(255, 0, 127, 0.12) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 180,
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
              }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-acid)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Operational Health</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 800, color: '#F0F0F0', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>{uptimeRatio}%</h3>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#00F0FF', background: 'rgba(0, 240, 255, 0.1)', padding: '3px 10px', borderRadius: 999 }}>+0.02% vs last week</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <Link href="/import" style={{ textDecoration: 'none' }}>
                    <button className="btn-solid-glow" style={{ height: 36, fontSize: 11, padding: '0 20px', borderRadius: 999 }}>
                      Add Monitor
                    </button>
                  </Link>
                  <Link href="/playground" style={{ textDecoration: 'none' }}>
                    <button className="btn-glass" style={{ height: 36, fontSize: 11, padding: '0 20px', borderRadius: 999 }}>
                      Security Console
                    </button>
                  </Link>
                </div>
              </div>

              {/* Smaller details cards stacked */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Active Checks */}
                <div className="glass-card" style={{ flex: 1, padding: '18px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B', textTransform: 'uppercase' }}>Active Monitors</span>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#00F0FF', marginTop: 6 }}>{monitors.length} Services</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B' }}>All systems checked</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#00F0FF', background: 'rgba(0, 240, 255, 0.08)', padding: '2px 6px', borderRadius: 4 }}>+12%</span>
                  </div>
                </div>

                {/* Avg Latency */}
                <div className="glass-card" style={{ flex: 1, padding: '18px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B', textTransform: 'uppercase' }}>System Latency</span>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#FF007F', marginTop: 6 }}>{avgLatency} ms</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B' }}>Checks latency average</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#FF007F', background: 'rgba(255, 0, 127, 0.08)', padding: '2px 6px', borderRadius: 4 }}>STABLE</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
              
              {/* Latency Bar Chart */}
              <div className="glass-card" style={{ padding: 24, background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#F0F0F0', margin: 0 }}>Latency Flow</h3>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B', textTransform: 'uppercase' }}>Monthly</span>
                </div>
                <div style={{ height: 160, width: '100%' }}>
                  {barChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6D7B9B', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: '#6D7B9B', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={customTooltipStyle} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} />
                        <Bar dataKey="ms" fill="var(--color-acid)" radius={[6, 6, 0, 0]}>
                          {barChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.ms > 1000 ? '#FFB300' : 'var(--color-acid)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6D7B9B', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      No metrics.
                    </div>
                  )}
                </div>
              </div>

              {/* Status Split Doughnut */}
              <div className="glass-card" style={{ padding: 24, background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#F0F0F0', margin: '0 0 10px', alignSelf: 'flex-start' }}>Status Split</h3>
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
                      <RechartsTooltip contentStyle={customTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#F0F0F0', lineHeight: 1 }}>{monitors.length}</span>
                    <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#6D7B9B', textTransform: 'uppercase', marginTop: 2 }}>Services</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                  {pieChartData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Performance timeline deck */}
            <div className="glass-card" style={{ padding: 24, background: 'rgba(255, 255, 255, 0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6D7B9B', textTransform: 'uppercase' }}>Recent Incidents Log</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B' }}>System logs active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {monitors.slice(0, 3).map((m, i) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <StatusBadge status={getLastStatus(m)} showPulse={false} />
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#F0F0F0' }}>{m.name}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6D7B9B' }}>{m.url ? m.url.replace('https://', '') : 'GitHub scan'}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (Ethereal credit card deck simulation) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            
            {/* Stacked cards header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: '#F0F0F0', margin: 0 }}>
                My Services
              </h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-acid)' }}>
                {monitors.length} Active
              </span>
            </div>

            {/* Stacked credit cards visualization */}
            <div style={{ position: 'relative', height: 210, marginBottom: 12 }}>
              {/* Back Card 3 */}
              <div style={{
                position: 'absolute', top: 0, left: 16, right: 16, height: 180,
                background: 'linear-gradient(135deg, #FF007F 0%, #7000FF 100%)',
                borderRadius: 24, opacity: 0.25, transform: 'scale(0.9)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }} />
              {/* Middle Card 2 */}
              <div style={{
                position: 'absolute', top: 10, left: 8, right: 8, height: 180,
                background: 'linear-gradient(135deg, #00F0FF 0%, #0072FF 100%)',
                borderRadius: 24, opacity: 0.4, transform: 'scale(0.95)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }} />
              {/* Front Card 1 (Frosted Glass Card) */}
              <div className="glass-card" style={{
                position: 'absolute', top: 20, left: 0, right: 0, height: 180,
                borderRadius: 24, padding: 24,
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(30px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}>
                {/* Logo & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 18, height: 18, background: 'var(--color-acid)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#030514" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                <div>
                  <h4 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: '#F0F0F0', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedMonitor ? selectedMonitor.name : 'No services configured'}
                  </h4>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6D7B9B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedMonitor?.url ? selectedMonitor.url.replace('https://', '').replace('http://', '') : 'No URL'}
                  </div>
                </div>

                {/* Card footer details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 8, color: '#6D7B9B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Response Time</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#00F0FF' }}>
                      {selectedMonitor ? ms(selectedMonitor.checks?.[0]?.responseTimeMs) : '—'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: 8, color: '#6D7B9B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>SSL Certificate</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#FF007F' }}>
                      {selectedMonitor?.checks?.[0]?.sslDaysLeft != null ? `${selectedMonitor.checks[0].sslDaysLeft}d` : '—'}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Ethereal styled Services List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6D7B9B', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: 4 }}>
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
                        border: active ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: status === 'up' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 0, 127, 0.08)', border: status === 'up' ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid rgba(255, 0, 127, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'up' ? '#00F0FF' : '#FF007F' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#F0F0F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6D7B9B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.url ? m.url.replace('https://', '') : 'GitHub Commits'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 'bold', color: active ? 'var(--color-acid)' : '#F0F0F0' }}>
                          {ms(m.checks?.[0]?.responseTimeMs)}
                        </span>
                        <Link href={`/monitors/${m.id}`} style={{ display: 'flex', alignItems: 'center' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6D7B9B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: active ? 1 : 0.4 }}>
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Styled Responsive Queries */}
      <style>{`
        @media (max-width: 990px) {
          .dashboard-layout-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
        @media (max-width: 600px) {
          .dashboard-top-row {
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
    <div style={{ border: '1px dashed rgba(0, 240, 255, 0.2)', borderRadius: 28, padding: '56px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, background: 'rgba(8, 12, 36, 0.4)', backdropFilter: 'blur(12px)' }}>
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
          <div key={s.n} className="glass-card" style={{ borderRadius: 24, padding: '20px' }}>
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
