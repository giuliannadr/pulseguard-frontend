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

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel-base p-4 shadow-xl">
      <p className="text-[var(--color-text-muted)] text-xs font-mono mb-3">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-bold flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: {p.value}{p.name === 'Response (ms)' ? 'ms' : ''}
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
  }, [load]);

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
      <div className="w-full flex flex-col gap-6 animate-fade-in">
        <div className="h-24 panel-base animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-32 panel-base animate-pulse" />
          <div className="h-32 panel-base animate-pulse" />
          <div className="h-32 panel-base animate-pulse" />
          <div className="h-32 panel-base animate-pulse" />
        </div>
      </div>
    );
  }

  if (!monitor) return null;

  const status = (checks[0]?.status ?? 'unknown') as any;
  const chartData = [...checks]
    .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime())
    .slice(-60)
    .map((c) => ({
      time: fmtTime(c.checkedAt),
      'Response (ms)': c.responseTimeMs ?? 0,
    }));

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 font-mono text-xs uppercase tracking-widest animate-fade-in">
        <Link href="/dashboard" className="text-[var(--color-text-muted)] hover:text-white transition-colors">
          Monitors
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-[var(--color-violet-primary)]">{monitor.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 animate-fade-in">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="font-display text-4xl font-bold tracking-tight text-white">
              {monitor.name}
            </h1>
            <StatusBadge status={status} />
            {!monitor.isActive && (
              <span className="px-2 py-0.5 rounded border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] text-[10px] font-mono tracking-widest uppercase">Paused</span>
            )}
          </div>
          <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-[var(--color-pink-primary)] hover:underline flex items-center gap-2">
            {monitor.url} 
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
        <div className="flex gap-4">
          <button onClick={handleCheckNow} disabled={checking} className="btn-strict-secondary">
            {checking ? (
              <span style={{ width: 14, height: 14, border: '2px solid var(--color-border-subtle)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            )}
            Check now
          </button>
          <button onClick={handleToggle} className="btn-strict-secondary">
            {monitor.isActive ? 'Pause' : 'Resume'}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-strict-danger">
            Delete
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <StatCard label="Uptime" value={metrics?.uptime != null ? `${metrics.uptime}%` : '—'} color={metrics?.uptime && metrics.uptime >= 99 ? 'var(--color-violet-primary)' : metrics?.uptime && metrics.uptime >= 95 ? '#FFDF00' : 'var(--color-pink-primary)'} />
        <StatCard label="Avg Response" value={metrics?.avgResponseMs != null ? `${metrics.avgResponseMs}ms` : '—'} color="white" />
        <StatCard label="SSL Expires" value={checks[0]?.sslDaysLeft != null ? `${checks[0].sslDaysLeft}d` : '—'} color={checks[0]?.sslDaysLeft != null && checks[0].sslDaysLeft < 14 ? 'var(--color-pink-primary)' : 'white'} />
        <StatCard label="Total Checks" value={metrics?.totalChecks ?? 0} color="var(--color-text-muted)" />
      </div>

      {/* Uptime bar */}
      <div className="panel-base p-6 md:p-8 mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex justify-between items-center mb-6">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
            Last 90 checks
          </span>
          {metrics?.uptime != null && (
            <span className="font-mono text-sm text-[var(--color-violet-primary)] font-bold">
              {metrics.uptime}% uptime
            </span>
          )}
        </div>
        <UptimeBar checks={checks} segments={90} />
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="panel-base p-6 md:p-8 mb-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-6">
            Response time (ms)
          </p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-pink-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-pink-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" dy={10} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} dx={-10} />
                <ReferenceLine y={2000} stroke="rgba(255,223,0,0.3)" strokeDasharray="4 4" />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Area
                  type="monotone"
                  dataKey="Response (ms)"
                  stroke="var(--color-pink-primary)"
                  strokeWidth={2}
                  fill="url(#respGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: 'var(--color-pink-primary)', stroke: '#000', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="panel-base overflow-hidden animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <div className="p-6 border-b border-[var(--color-border-subtle)]">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
            Recent checks
          </span>
        </div>
        <div className="flex flex-col">
          {checks.slice(0, 20).map((check) => (
            <div
              key={check.id}
              className="grid grid-cols-2 sm:grid-cols-5 gap-6 items-center p-4 sm:px-6 border-b border-[var(--color-border-subtle)] last:border-0 text-sm font-mono hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center">
                <StatusBadge status={check.status as any} showPulse={false} />
              </div>
              <span className="text-[var(--color-text-muted)]">{check.statusCode ?? '—'}</span>
              <span className={check.responseTimeMs && check.responseTimeMs > 2000 ? 'text-[#FFDF00]' : 'text-white'}>
                {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : '—'}
              </span>
              <span className="text-[var(--color-text-muted)] hidden sm:block">
                {check.sslDaysLeft != null ? `SSL ${check.sslDaysLeft}d` : '—'}
              </span>
              <span className="text-[var(--color-text-muted)] text-right text-xs">
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

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="panel-base p-6 flex flex-col justify-center">
      <div className="font-mono text-3xl font-bold mb-2" style={{ color }}>
        {value}
      </div>
      <div className="font-display text-[10px] tracking-widest uppercase text-[var(--color-text-muted)]">
        {label}
      </div>
    </div>
  );
}
