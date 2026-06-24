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
  ReferenceLine,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor, type Check, type Metrics } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UptimeBar } from '@/components/ui/UptimeBar';

function fmt(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 14px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
      <p style={{ color: 'var(--muted)', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}{p.name === 'Response (ms)' ? 'ms' : ''}</strong>
        </p>
      ))}
    </div>
  );
};

export default function MonitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  const load = useCallback(async (tok: string) => {
    const [mon, chks, mets] = await Promise.all([
      api.monitors.get(id, tok),
      api.monitors.checks(id, tok, 200),
      api.monitors.metrics(id, tok),
    ]);
    setMonitor(mon);
    setChecks(chks);
    setMetrics(mets);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? null;
      setToken(tok);
      if (tok) load(tok);
    });
  }, []);

  // Realtime
  useEffect(() => {
    if (!token) return;
    const channel = supabase
      .channel(`checks-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checks', filter: `monitor_id=eq.${id}` }, () => {
        load(token);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, id, load]);

  async function handleCheckNow() {
    if (!token) return;
    setChecking(true);
    try {
      await api.monitors.checkNow(id, token);
      await load(token);
    } finally {
      setChecking(false);
    }
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
      <div style={{ padding: '36px 40px' }}>
        <div style={{ height: 32, width: 300, background: 'var(--surface)', borderRadius: 6, marginBottom: 12 }} />
        <div style={{ height: 20, width: 200, background: 'var(--surface)', borderRadius: 6 }} />
      </div>
    );
  }

  if (!monitor) return null;

  const status = (checks[0]?.status ?? 'unknown') as any;
  const chartData = [...checks]
    .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime())
    .slice(-60)
    .map((c) => ({
      time: fmt(c.checkedAt),
      'Response (ms)': c.responseTimeMs ?? 0,
      status: c.status,
    }));

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1000 }}>
      {/* Breadcrumb */}
      <div className="fade-up" style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          href="/dashboard"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}
        >
          Monitors
        </Link>
        <span style={{ color: 'var(--subtle)' }}>/</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)' }}>{monitor.name}</span>
      </div>

      {/* Header */}
      <div className="fade-up fade-up-1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {monitor.name}
            </h1>
            <StatusBadge status={status} />
            {!monitor.isActive && <span className="badge badge-unknown">Paused</span>}
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cyan)', textDecoration: 'none' }}
          >
            {monitor.url} ↗
          </a>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={handleCheckNow} disabled={checking} className="btn-ghost">
            {checking ? (
              <span style={{ width: 12, height: 12, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
              </svg>
            )}
            Check now
          </button>
          <button onClick={handleToggle} className="btn-ghost">
            {monitor.isActive ? 'Pause' : 'Resume'}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: metrics?.uptime && metrics.uptime >= 99 ? 'var(--green)' : metrics?.uptime && metrics.uptime >= 95 ? 'var(--amber)' : 'var(--red)' }}>
            {metrics?.uptime != null ? `${metrics.uptime}%` : '—'}
          </div>
          <div className="stat-label">Uptime</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text)' }}>
            {metrics?.avgResponseMs != null ? `${metrics.avgResponseMs}ms` : '—'}
          </div>
          <div className="stat-label">Avg Response</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: checks[0]?.sslDaysLeft != null && checks[0].sslDaysLeft < 14 ? 'var(--red)' : 'var(--text)' }}>
            {checks[0]?.sslDaysLeft != null ? `${checks[0].sslDaysLeft}d` : '—'}
          </div>
          <div className="stat-label">SSL Expires</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--muted)' }}>
            {metrics?.totalChecks ?? 0}
          </div>
          <div className="stat-label">Total Checks</div>
        </div>
      </div>

      {/* Uptime bar */}
      <div
        className="fade-up fade-up-3"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '20px 22px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Last 90 checks
          </span>
          {metrics?.uptime != null && (
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
              {metrics.uptime}% uptime
            </span>
          )}
        </div>
        <UptimeBar checks={checks} segments={90} />
      </div>

      {/* Response time chart */}
      {chartData.length > 1 && (
        <div
          className="fade-up fade-up-4"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '20px 22px',
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 20 }}>
            Response time (ms)
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00e5ff" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#4a5a72', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#4a5a72', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} />
              <ReferenceLine y={3000} stroke="rgba(245,158,11,0.3)" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <Area
                type="monotone"
                dataKey="Response (ms)"
                stroke="#00e5ff"
                strokeWidth={1.5}
                fill="url(#respGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#00e5ff', stroke: 'none' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent checks */}
      <div
        className="fade-up fade-up-5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Recent checks
          </span>
        </div>
        <div>
          {checks.slice(0, 20).map((check) => (
            <div
              key={check.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 90px 90px 90px 1fr',
                gap: 12,
                alignItems: 'center',
                padding: '10px 22px',
                borderBottom: '1px solid var(--border)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <StatusBadge status={check.status as any} showPulse={false} />
              <span style={{ color: 'var(--muted)' }}>{check.statusCode ?? '—'}</span>
              <span style={{ color: check.responseTimeMs && check.responseTimeMs > 2000 ? 'var(--amber)' : 'var(--text)' }}>
                {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : '—'}
              </span>
              <span style={{ color: 'var(--muted)' }}>
                {check.sslDaysLeft != null ? `SSL ${check.sslDaysLeft}d` : '—'}
              </span>
              <span style={{ color: 'var(--muted)', textAlign: 'right', fontSize: 11 }}>
                {fmtDate(check.checkedAt)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
