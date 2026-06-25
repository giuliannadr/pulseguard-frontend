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
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowingButton } from '@/components/ui/GlowingButton';
import { motion } from 'framer-motion';

function fmt(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#05070A]/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl">
      <p className="text-[var(--text-muted)] text-xs font-mono mb-3">{label}</p>
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
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 fade-up">
        <div className="h-24 glass-card animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-32 glass-card animate-pulse" />
          <div className="h-32 glass-card animate-pulse" />
          <div className="h-32 glass-card animate-pulse" />
          <div className="h-32 glass-card animate-pulse" />
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
      time: fmt(c.checkedAt),
      'Response (ms)': c.responseTimeMs ?? 0,
      status: c.status,
    }));

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 mb-8 font-mono text-xs uppercase tracking-widest">
        <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-white transition-colors">
          Monitors
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-[var(--green-start)]">{monitor.name}</span>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="font-display text-4xl font-bold tracking-tight text-white">
              {monitor.name}
            </h1>
            <StatusBadge status={status} />
            {!monitor.isActive && (
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[var(--text-muted)] text-[10px] font-mono tracking-wider uppercase border border-white/10">Paused</span>
            )}
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[13px] text-[var(--text-muted)] hover:text-white transition-colors flex items-center gap-2"
          >
            {monitor.url} 
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
        <div className="flex gap-3">
          <button onClick={handleCheckNow} disabled={checking} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors">
            {checking ? (
              <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            )}
            Check now
          </button>
          <button onClick={handleToggle} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors">
            {monitor.isActive ? 'Pause' : 'Resume'}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5A79]/10 border border-[#FF5A79]/20 text-[#FF5A79] text-sm font-medium hover:bg-[#FF5A79]/20 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Delete
          </button>
        </div>
      </motion.div>

      {/* Metrics */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Uptime" value={metrics?.uptime != null ? `${metrics.uptime}%` : '—'} color={metrics?.uptime && metrics.uptime >= 99 ? 'var(--green-start)' : metrics?.uptime && metrics.uptime >= 95 ? '#FFDF00' : '#FF5A79'} />
        <StatCard label="Avg Response" value={metrics?.avgResponseMs != null ? `${metrics.avgResponseMs}ms` : '—'} color="white" />
        <StatCard label="SSL Expires" value={checks[0]?.sslDaysLeft != null ? `${checks[0].sslDaysLeft}d` : '—'} color={checks[0]?.sslDaysLeft != null && checks[0].sslDaysLeft < 14 ? '#FF5A79' : 'white'} />
        <StatCard label="Total Checks" value={metrics?.totalChecks ?? 0} color="var(--text-muted)" />
      </motion.div>

      {/* Uptime bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
        <GlassCard className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Last 90 checks
            </span>
            {metrics?.uptime != null && (
              <span className="font-mono text-sm text-[var(--green-start)] font-bold">
                {metrics.uptime}% uptime
              </span>
            )}
          </div>
          <UptimeBar checks={checks} segments={90} />
        </GlassCard>
      </motion.div>

      {/* Response time chart */}
      {chartData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
          <GlassCard className="p-6 md:p-8">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)] mb-6">
              Response time (ms)
            </p>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--green-start)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--green-start)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} dx={-10} />
                  <ReferenceLine y={2000} stroke="rgba(255,223,0,0.3)" strokeDasharray="4 4" />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Area
                    type="monotone"
                    dataKey="Response (ms)"
                    stroke="var(--green-start)"
                    strokeWidth={2}
                    fill="url(#respGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--green-start)', stroke: '#000', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Recent checks */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <GlassCard className="overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Recent checks
            </span>
          </div>
          <div className="flex flex-col">
            {checks.slice(0, 20).map((check, i) => (
              <div
                key={check.id}
                className="grid grid-cols-2 sm:grid-cols-5 gap-4 items-center p-4 sm:px-6 border-b border-white/5 text-sm font-mono hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center">
                  <StatusBadge status={check.status as any} showPulse={false} />
                </div>
                <span className="text-[var(--text-muted)]">{check.statusCode ?? '—'}</span>
                <span className={check.responseTimeMs && check.responseTimeMs > 2000 ? 'text-[#FFDF00]' : 'text-white'}>
                  {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : '—'}
                </span>
                <span className="text-[var(--text-muted)] hidden sm:block">
                  {check.sslDaysLeft != null ? `SSL ${check.sslDaysLeft}d` : '—'}
                </span>
                <span className="text-[var(--text-muted)] text-right text-[11px]">
                  {fmtDate(check.checkedAt)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <GlassCard className="p-6">
      <div className="font-mono text-3xl font-bold mb-2" style={{ color }}>
        {value}
      </div>
      <div className="font-display text-[11px] tracking-widest uppercase text-[var(--text-muted)]">
        {label}
      </div>
    </GlassCard>
  );
}
