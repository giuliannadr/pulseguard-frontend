'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor, type MonitorStatus } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UptimeBar } from '@/components/ui/UptimeBar';
import { AddMonitorModal } from '@/components/AddMonitorModal';

function getLastStatus(monitor: Monitor): MonitorStatus {
  const last = monitor.checks?.[0];
  return (last?.status as MonitorStatus) ?? 'unknown';
}

function formatResponseTime(ms: number | null | undefined) {
  if (!ms) return '—';
  return `${ms}ms`;
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

  // Supabase Realtime — listen to new checks
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
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>
      {/* Header */}
      <div
        className="fade-up"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 36,
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--cyan)',
              marginBottom: 6,
            }}
          >
            // Monitors
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            Infrastructure Overview
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Monitor
        </button>
      </div>

      {/* Stats */}
      <div
        className="fade-up fade-up-1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 32,
        }}
      >
        <StatCard label="Total" value={monitors.length} color="var(--text)" />
        <StatCard label="Operational" value={upCount} color="var(--green)" />
        <StatCard label="Down" value={downCount} color="var(--red)" />
        <StatCard label="Degraded" value={degradedCount} color="var(--amber)" />
      </div>

      {/* Monitors grid */}
      {loading ? (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 110,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                animation: 'pulse-dot 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : monitors.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {monitors.map((monitor, i) => {
            const status = getLastStatus(monitor);
            const lastCheck = monitor.checks?.[0];
            return (
              <Link
                key={monitor.id}
                href={`/monitors/${monitor.id}`}
                className={`monitor-card fade-up fade-up-${Math.min(i + 2, 6)} ${status === 'down' ? 'card-down' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Status dot */}
                  <div
                    className={`pulse-indicator ${status === 'up' ? 'pulse-up' : status === 'down' ? 'pulse-down' : status === 'degraded' ? 'pulse-deg' : ''}`}
                    style={{ flexShrink: 0 }}
                  >
                    <span className="dot" />
                  </div>

                  {/* Name + URL */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: 15,
                        }}
                      >
                        {monitor.name}
                      </span>
                      <StatusBadge status={status} showPulse={false} />
                      {!monitor.isActive && (
                        <span className="badge badge-unknown">Paused</span>
                      )}
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {monitor.url}
                    </span>
                  </div>

                  {/* Response time */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 20,
                        fontWeight: 600,
                        color: lastCheck?.responseTimeMs && lastCheck.responseTimeMs > 2000
                          ? 'var(--amber)'
                          : 'var(--text)',
                        lineHeight: 1,
                      }}
                    >
                      {formatResponseTime(lastCheck?.responseTimeMs)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                      RESPONSE
                    </div>
                  </div>

                  {/* SSL */}
                  {lastCheck?.sslDaysLeft !== null && lastCheck?.sslDaysLeft !== undefined && (
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 20,
                          fontWeight: 600,
                          color: lastCheck.sslDaysLeft < 14 ? 'var(--red)' : lastCheck.sslDaysLeft < 30 ? 'var(--amber)' : 'var(--text)',
                          lineHeight: 1,
                        }}
                      >
                        {lastCheck.sslDaysLeft}d
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                        SSL
                      </div>
                    </div>
                  )}

                  {/* Interval */}
                  <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 60 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, lineHeight: 1, color: 'var(--muted)' }}>
                      {monitor.intervalMinutes}m
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                      INTERVAL
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>

                {/* Uptime bar */}
                {monitor.checks && monitor.checks.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <UptimeBar checks={monitor.checks} segments={60} />
                  </div>
                )}
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="fade-up"
      style={{
        textAlign: 'center',
        padding: '80px 40px',
        border: '1px dashed rgba(255,255,255,0.08)',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          background: 'rgba(0,229,255,0.08)',
          border: '1px solid rgba(0,229,255,0.12)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>
        No monitors yet
      </h3>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        Add your first URL to start tracking uptime and response times.
      </p>
      <button onClick={onAdd} className="btn-primary">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add your first monitor
      </button>
    </div>
  );
}
