'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor, type Check, type Metrics, type SecurityIncident } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UptimeBar } from '@/components/ui/UptimeBar';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#0F0F0F',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 3,
        padding: '10px 14px',
      }}
    >
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#CAFF00', margin: 0 }}>
          {p.value}ms
        </p>
      ))}
    </div>
  );
};

export default function MonitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [monitor,  setMonitor]  = useState<Monitor | null>(null);
  const [checks,   setChecks]   = useState<Check[]>([]);
  const [metrics,  setMetrics]  = useState<Metrics | null>(null);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [token,    setToken]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  const load = useCallback(async (tok: string) => {
    const [mon, chks, mets, incs] = await Promise.all([
      api.monitors.get(id, tok),
      api.monitors.checks(id, tok, 200),
      api.monitors.metrics(id, tok),
      api.monitors.securityIncidents(id, tok).catch(() => []), // fallback in case endpoint not ready
    ]);
    setMonitor(mon);
    setChecks(chks);
    setMetrics(mets);
    setIncidents(incs);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? null;
      setToken(tok);
      if (tok) load(tok);
    });
  }, [load]);

  useEffect(() => {
    if (!token) return;
    const chChecks = supabase
      .channel(`checks-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checks', filter: `monitor_id=eq.${id}` }, () => load(token))
      .subscribe();
      
    const chIncidents = supabase
      .channel(`incidents-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_incidents', filter: `monitor_id=eq.${id}` }, () => load(token))
      .subscribe();
      
    return () => { 
      supabase.removeChannel(chChecks); 
      supabase.removeChannel(chIncidents); 
    };
  }, [token, id, load, supabase]);

  async function handleCheckNow() {
    if (!token) return;
    setChecking(true);
    try { await api.monitors.checkNow(id, token); await load(token); }
    finally { setChecking(false); }
  }

  async function handleDelete() {
    if (!token || !confirm('Delete this monitor and all its data?')) return;
    setDeleting(true);
    await api.monitors.delete(id, token);
    router.push('/dashboard');
  }

  async function handleToggle() {
    if (!token || !monitor) return;
    await api.monitors.update(id, { isActive: !monitor.isActive }, token);
    await load(token);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[80, 120, 280].map((h) => (
          <div key={h} style={{ height: h, background: '#080808', borderRadius: 3, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  if (!monitor) return null;

  const status    = (checks[0]?.status ?? 'unknown') as any;
  const chartData = [...checks]
    .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime())
    .slice(-60)
    .map((c) => ({ time: fmtTime(c.checkedAt), ms: c.responseTimeMs ?? 0 }));

  const uptimePct = metrics?.uptime;
  const uptimeColor = uptimePct == null ? '#4A4A4A' : uptimePct >= 99 ? 'var(--color-violet-primary)' : uptimePct >= 95 ? '#FFDF00' : 'var(--color-pink-primary)';

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>
        <Link href="/dashboard" style={{ color: '#4A4A4A', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#F0F0F0')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#4A4A4A')}
        >
          Monitors
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-violet-primary)' }}>{monitor.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: '#F0F0F0', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {monitor.name}
            </h1>
            <StatusBadge status={status} />
            {!monitor.isActive && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, padding: '2px 8px', letterSpacing: '0.1em' }}>
                PAUSED
              </span>
            )}
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-violet-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}
          >
            {monitor.url}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleCheckNow} disabled={checking} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>
            {checking
              ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--color-violet-primary)', borderRadius: '50%', animation: 'pg-spin 0.7s linear infinite', display: 'inline-block' }} />
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            }
            Check Now
          </button>
          <button onClick={handleToggle} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>
            {monitor.isActive ? 'Pause' : 'Resume'}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-strict-danger">
            Delete
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 24, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        {[
          { label: 'Uptime',        value: uptimePct != null ? `${uptimePct}%` : '—',                                      color: uptimeColor },
          { label: 'Avg Response',  value: metrics?.avgResponseMs != null ? `${metrics.avgResponseMs}ms` : '—',             color: '#F0F0F0' },
          { label: 'SSL Expires',   value: checks[0]?.sslDaysLeft != null ? `${checks[0].sslDaysLeft}d` : '—',             color: checks[0]?.sslDaysLeft != null && checks[0].sslDaysLeft < 14 ? '#FF1744' : '#F0F0F0' },
          { label: 'Total Checks',  value: metrics?.totalChecks ?? '—',                                                      color: '#4A4A4A' },
        ].map((m, i) => (
          <div key={m.label} style={{ padding: '20px 24px', background: '#080808', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: m.color, lineHeight: 1, marginBottom: 6 }}>
              {m.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Uptime bar */}
      <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Last {Math.min(checks.length, 90)} checks
          </span>
          {uptimePct != null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: uptimeColor }}>
              {uptimePct}% uptime
            </span>
          )}
        </div>
        <UptimeBar checks={checks} segments={90} />
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: '20px 24px', marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 20px' }}>
            Response time (ms)
          </p>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-violet-primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-violet-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#4A4A4A', fontFamily: 'var(--font-mono)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  dy={8}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#4A4A4A', fontFamily: 'var(--font-mono)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                <Area
                  type="monotone"
                  dataKey="ms"
                  name="Response"
                  stroke="var(--color-violet-primary)"
                  strokeWidth={1.5}
                  fill="url(#grad)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--color-violet-primary)', stroke: '#000', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Security Incidents */}
      {incidents.length > 0 && (
        <div style={{ background: '#080808', border: '1px solid var(--color-pink-primary)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-pink-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 'bold' }}>
              ⚠️ AI Security Incidents Detected
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-pink-primary)' }}>
              {incidents.filter(i => !i.resolved).length} Unresolved
            </span>
          </div>
          {incidents.map((inc, i) => (
            <div key={inc.id} style={{ padding: '16px 24px', borderBottom: i < incidents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: inc.resolved ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: inc.resolved ? '#888' : 'var(--color-pink-primary)', fontWeight: 'bold' }}>
                  [{inc.severity.toUpperCase()}] {inc.riskType}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>
                    {fmtDate(inc.createdAt)}
                  </span>
                  {!inc.resolved && (
                    <button 
                      onClick={async () => {
                        if (!token) return;
                        setIncidents(prev => prev.map(item => item.id === inc.id ? { ...item, resolved: true } : item));
                        try {
                          await api.securityIncidents.resolve(inc.id, token);
                        } catch (e) {
                          console.error(e);
                          if (token) load(token); // revert
                        }
                      }}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#F0F0F0', padding: '4px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                    >
                      Resolve
                    </button>
                  )}
                  {inc.resolved && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#00E676' }}>✓ RESOLVED</span>
                  )}
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: inc.resolved ? '#888' : '#F0F0F0', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                {inc.description}
              </p>
              <div style={{ background: 'rgba(255,20,147,0.05)', padding: 12, borderRadius: 3, border: '1px solid rgba(255,20,147,0.1)', marginBottom: 12 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-pink-primary)', marginBottom: 4, textTransform: 'uppercase' }}>
                  Recommendation
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#D0D0D0' }}>
                  {inc.recommendation}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8A2BE2' }}>
                  👤 Responsible: {inc.commitAuthor || 'Unknown'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>
                  Commit: {inc.commitHash.substring(0, 7)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Check log */}
      <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Check Log
          </span>
        </div>
        {/* Table head */}
        <div style={{ display: 'grid', gridTemplateColumns: '100px 70px 90px 80px 1fr', padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {['Status', 'Code', 'Response', 'SSL', 'Time'].map((h) => (
            <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#2A2A2A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {h}
            </span>
          ))}
        </div>
        {checks.slice(0, 25).map((check, i) => (
          <div
            key={check.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 70px 90px 80px 1fr',
              alignItems: 'center',
              padding: '11px 24px',
              borderBottom: i < Math.min(checks.length, 25) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <div><StatusBadge status={check.status as any} showPulse={false} /></div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#4A4A4A' }}>{check.statusCode ?? '—'}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: check.responseTimeMs && check.responseTimeMs > 2000 ? '#FFDF00' : '#F0F0F0' }}>
              {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#4A4A4A' }}>
              {check.sslDaysLeft != null ? `${check.sslDaysLeft}d` : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#2A2A2A', textAlign: 'right' }}>
              {fmtDate(check.checkedAt)}
            </span>
          </div>
        ))}
      </div>

      <style>{`@keyframes pg-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
