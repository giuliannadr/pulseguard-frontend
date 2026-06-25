'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor, type MonitorStatus } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UptimeBar } from '@/components/ui/UptimeBar';
import { AddMonitorModal } from '@/components/AddMonitorModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowingButton } from '@/components/ui/GlowingButton';
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
            stroke="var(--green-start)" 
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
  }, []);

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
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-10 fade-up">
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-[var(--green-start)] mb-2">
            // Monitors
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Infrastructure Overview
          </h1>
        </div>
        <GlowingButton onClick={() => setShowAdd(true)} variant="primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Monitor
        </GlowingButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8 fade-up delay-100">
        <StatCard label="Total" value={monitors.length} color="var(--text-main)" />
        <StatCard label="Operational" value={upCount} color="var(--green-start)" />
        <StatCard label="Down" value={downCount} color="#FF5A79" />
        <StatCard label="Degraded" value={degradedCount} color="#FFDF00" />
      </div>

      {/* Monitors grid */}
      {loading ? (
        <div className="flex flex-col gap-3 fade-up delay-200">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 glass-card animate-pulse" />
          ))}
        </div>
      ) : monitors.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="flex flex-col gap-4 fade-up delay-200">
          {monitors.map((monitor, i) => {
            const status = getLastStatus(monitor);
            const lastCheck = monitor.checks?.[0];
            return (
              <Link key={monitor.id} href={`/monitors/${monitor.id}`} className="block">
                <GlassCard hoverEffect className={`p-6 ${status === 'down' ? 'border-[#FF5A79]/30 bg-[#FF5A79]/5' : ''}`}>
                  <div className="flex items-center gap-6">
                    {/* Status dot */}
                    <div className="shrink-0">
                      <span className={`status-indicator ${status}`} />
                    </div>

                    {/* Name + URL */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-display font-bold text-[16px] text-white">
                          {monitor.name}
                        </span>
                        <StatusBadge status={status} showPulse={false} />
                        {!monitor.isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[var(--text-muted)] text-[10px] font-mono tracking-wider uppercase border border-white/10">Paused</span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-[var(--text-muted)] block truncate">
                        {monitor.url}
                      </span>
                    </div>

                    {/* Chart */}
                    <div className="shrink-0 hidden md:block opacity-70">
                       <Sparkline checks={monitor.checks || []} />
                    </div>

                    {/* Response time */}
                    <div className="text-right shrink-0 min-w-[80px]">
                      <div className={`font-mono text-2xl font-bold leading-none ${lastCheck?.responseTimeMs && lastCheck.responseTimeMs > 2000 ? 'text-[#FFDF00]' : 'text-white'}`}>
                        {formatResponseTime(lastCheck?.responseTimeMs)}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-1.5 font-mono tracking-widest uppercase">
                        Response
                      </div>
                    </div>

                    {/* SSL */}
                    {lastCheck?.sslDaysLeft !== null && lastCheck?.sslDaysLeft !== undefined && (
                      <div className="text-right shrink-0 min-w-[60px]">
                        <div className={`font-mono text-2xl font-bold leading-none ${lastCheck.sslDaysLeft < 14 ? 'text-[#FF5A79]' : lastCheck.sslDaysLeft < 30 ? 'text-[#FFDF00]' : 'text-white'}`}>
                          {lastCheck.sslDaysLeft}d
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-1.5 font-mono tracking-widest uppercase">
                          SSL
                        </div>
                      </div>
                    )}

                    {/* Arrow */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>

                  {/* Uptime bar */}
                  {monitor.checks && monitor.checks.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-[var(--border)]">
                      <UptimeBar checks={monitor.checks} segments={60} />
                    </div>
                  )}
                </GlassCard>
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
    <GlassCard className="p-6">
      <div className="font-mono text-4xl font-bold mb-2" style={{ color }}>
        {value}
      </div>
      <div className="font-display text-xs tracking-widest uppercase text-[var(--text-muted)]">
        {label}
      </div>
    </GlassCard>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <GlassCard className="p-16 text-center border-dashed border-2 border-white/10">
      <div className="w-16 h-16 bg-gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(199,121,208,0.4)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <h3 className="font-display text-xl font-bold mb-2 text-white">
        No monitors yet
      </h3>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Add your first URL to start tracking uptime and response times.
      </p>
      <GlowingButton onClick={onAdd} variant="primary">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add your first monitor
      </GlowingButton>
    </GlassCard>
  );
}
