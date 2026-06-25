'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor, type MonitorStatus } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UptimeBar } from '@/components/ui/UptimeBar';
import { AddMonitorModal } from '@/components/AddMonitorModal';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

function getLastStatus(monitor: Monitor): MonitorStatus {
  const last = monitor.checks?.[0];
  return (last?.status as MonitorStatus) ?? 'unknown';
}

function formatResponseTime(ms: number | null | undefined) {
  if (!ms) return '—';
  return `${ms}ms`;
}

function Sparkline({ checks }: { checks: any[] }) {
  if (!checks || checks.length === 0) return null;
  const data = [...checks].reverse().map((c) => ({
    time: c.createdAt,
    ms: c.responseTimeMs || 0
  }));

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['auto', 'auto']} hide />
          <Line 
            type="monotone" 
            dataKey="ms" 
            stroke="var(--color-pink-primary)" 
            strokeWidth={2} 
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? null;
      setToken(tok);
      if (tok) loadMonitors(tok);
      else setLoading(false);
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

  const upCount = monitors.filter((m) => getLastStatus(m) === 'up').length;
  const downCount = monitors.filter((m) => getLastStatus(m) === 'down').length;
  const degradedCount = monitors.filter((m) => getLastStatus(m) === 'degraded').length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 animate-fade-in">
        <div>
          <p className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-pink-primary)] mb-2">
            // Monitors
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            Infrastructure Overview
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-strict-primary h-10 px-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Monitor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8 animate-fade-in">
        <StatCard label="Total" value={monitors.length} color="var(--color-text-main)" />
        <StatCard label="Operational" value={upCount} color="var(--color-violet-primary)" />
        <StatCard label="Down" value={downCount} color="var(--color-pink-primary)" />
        <StatCard label="Degraded" value={degradedCount} color="#FFDF00" />
      </div>

      {/* Monitors grid */}
      {loading ? (
        <div className="flex flex-col gap-4 animate-fade-in">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 panel-base animate-pulse" />
          ))}
        </div>
      ) : monitors.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          {monitors.map((monitor) => {
            const status = getLastStatus(monitor);
            const lastCheck = monitor.checks?.[0];
            return (
              <Link key={monitor.id} href={`/monitors/${monitor.id}`} className="block">
                <div className={`panel-base panel-hover p-6 ${status === 'down' ? 'border-[var(--color-pink-primary)]/40 bg-[var(--color-pink-primary)]/5' : ''}`}>
                  <div className="flex items-center gap-6">
                    {/* Name + URL (Fixed width 250px) */}
                    <div className="w-[250px] shrink-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-display font-bold text-base text-white truncate max-w-[150px]">
                          {monitor.name}
                        </span>
                        <StatusBadge status={status} showPulse={false} />
                      </div>
                      <span className="font-mono text-[11px] text-[var(--color-text-muted)] block truncate">
                        {monitor.url}
                      </span>
                    </div>

                    {/* Chart (Flexible) */}
                    <div className="flex-1 hidden lg:flex items-center justify-center opacity-70">
                       <Sparkline checks={monitor.checks || []} />
                    </div>

                    {/* Strict Grid for Metrics */}
                    <div className="flex items-center gap-10 shrink-0">
                      {/* Response time */}
                      <div className="text-right w-20">
                        <div className={`font-mono text-xl font-bold leading-none ${lastCheck?.responseTimeMs && lastCheck.responseTimeMs > 2000 ? 'text-[#FFDF00]' : 'text-white'}`}>
                          {formatResponseTime(lastCheck?.responseTimeMs)}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] mt-1.5 font-mono tracking-widest uppercase">
                          Response
                        </div>
                      </div>

                      {/* SSL */}
                      <div className="text-right w-16">
                        <div className={`font-mono text-xl font-bold leading-none ${(lastCheck?.sslDaysLeft ?? 999) < 14 ? 'text-[var(--color-pink-primary)]' : 'text-white'}`}>
                          {lastCheck?.sslDaysLeft != null ? `${lastCheck.sslDaysLeft}d` : '—'}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] mt-1.5 font-mono tracking-widest uppercase">
                          SSL
                        </div>
                      </div>
                      
                      {/* Interval */}
                      <div className="text-right w-16">
                        <div className="font-mono text-xl font-bold leading-none text-white">
                          {monitor.intervalMinutes}m
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] mt-1.5 font-mono tracking-widest uppercase">
                          Interval
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-4">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>

                  {/* Uptime bar */}
                  {monitor.checks && monitor.checks.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-[var(--color-border-subtle)]">
                      <UptimeBar checks={monitor.checks} segments={60} />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showAdd && token && (
        <AddMonitorModal
          token={token}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            if (token) loadMonitors(token);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="panel-base p-16 text-center border-dashed flex flex-col items-center">
      <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-violet-primary)] to-[var(--color-pink-primary)] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,20,147,0.3)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <h3 className="font-display text-xl font-bold mb-2 text-white">
        No monitors yet
      </h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-8 max-w-sm">
        Add your first URL to start tracking uptime and response times.
      </p>
      <button onClick={onAdd} className="btn-strict-primary h-12 px-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Create Monitor
      </button>
    </div>
  );
}
