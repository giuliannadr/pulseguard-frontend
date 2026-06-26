'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { api, githubToken as ghTokenHelper, type Monitor, type Check, type Metrics, type SecurityIncident } from '@/lib/api';
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
    <div style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '10px 14px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#CAFF00', margin: 0 }}>{payload[0]?.value}ms</p>
    </div>
  );
};

// Inline toast notification
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: type === 'success' ? 'rgba(0,230,118,0.1)' : 'rgba(255,23,68,0.1)',
      border: `1px solid ${type === 'success' ? '#00E676' : '#FF1744'}`,
      borderRadius: 4, padding: '12px 20px',
      fontFamily: 'var(--font-mono)', fontSize: 13,
      color: type === 'success' ? '#00E676' : '#FF1744',
      animation: 'pg-fade-in 0.2s ease-out both',
    }}>
      {msg}
    </div>
  );
}

// Inline delete confirmation
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#0F0F0F', border: '1px solid rgba(255,23,68,0.3)', borderRadius: 6, padding: 32, maxWidth: 400, width: '90%' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#F0F0F0', margin: '0 0 12px' }}>Delete monitor?</h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#888', margin: '0 0 24px', lineHeight: 1.6 }}>
          This will permanently delete the monitor and all its checks, metrics, and security incidents. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-strict-secondary" style={{ fontSize: 13 }}>Cancel</button>
          <button onClick={onConfirm} className="btn-strict-danger" style={{ fontSize: 13 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// Edit monitor modal
function EditModal({ monitor, token, onSave, onClose }: {
  monitor: Monitor; token: string;
  onSave: (updated: Monitor) => void; onClose: () => void;
}) {
  const [name, setName] = useState(monitor.name);
  const [url, setUrl] = useState(monitor.url ?? '');
  const [interval, setInterval] = useState(String(monitor.intervalMinutes));
  const [expectedStatus, setExpectedStatus] = useState(String(monitor.expectedStatus));
  const [webhookUrl, setWebhookUrl] = useState(monitor.notificationWebhookUrl ?? '');
  const [email, setEmail] = useState(monitor.notificationEmail ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const updated = await api.monitors.update(monitor.id, {
        name: name.trim(),
        url: url.trim() || undefined,
        intervalMinutes: parseInt(interval),
        expectedStatus: parseInt(expectedStatus),
        notificationWebhookUrl: webhookUrl.trim() || undefined,
        notificationEmail: email.trim() || undefined,
      }, token);
      onSave(updated);
    } catch (e: any) {
      const msg = e.message;
      setErr(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 32, maxWidth: 520, width: '90%' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#F0F0F0', margin: '0 0 24px' }}>Edit Monitor</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Name', value: name, set: setName, placeholder: 'My API', type: 'text' },
            { label: 'URL', value: url, set: setUrl, placeholder: 'https://...', type: 'url' },
            { label: 'Notification Webhook (Discord / Slack)', value: webhookUrl, set: setWebhookUrl, placeholder: 'https://discord.com/api/webhooks/...', type: 'url' },
            { label: 'Notification Email', value: email, set: setEmail, placeholder: 'you@example.com', type: 'email' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.label}</label>
              <input className="input-strict" type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Check Interval (min)</label>
              <input className="input-strict" type="number" min={1} max={60} value={interval} onChange={e => setInterval(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Expected Status</label>
              <input className="input-strict" type="number" min={100} max={599} value={expectedStatus} onChange={e => setExpectedStatus(e.target.value)} />
            </div>
          </div>
          {err && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FF1744', margin: 0 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-strict-secondary" style={{ fontSize: 13 }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-strict-primary" style={{ fontSize: 13 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MonitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [downtime, setDowntime] = useState<import('@/lib/api').DowntimeWindow[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async (tok: string) => {
    try {
      const [mon, chks, mets, incs, dtw] = await Promise.all([
        api.monitors.get(id, tok),
        api.monitors.checks(id, tok, 200),
        api.monitors.metrics(id, tok),
        api.monitors.securityIncidents(id, tok).catch(() => []),
        api.monitors.downtime(id, tok).catch(() => []),
      ]);
      setMonitor(mon);
      setChecks(chks);
      setMetrics(mets);
      setIncidents(incs);
      setDowntime(dtw);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load monitor');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      supabase.auth.getSession().then(({ data: { session } }) => {
        const tok = session?.access_token ?? null;
        setToken(tok);
        if (tok) load(tok);
      });
    });
  }, [load, router, supabase]);

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
    return () => { supabase.removeChannel(chChecks); supabase.removeChannel(chIncidents); };
  }, [token, id, load, supabase]);

  async function handleCheckNow() {
    if (!token) return;
    setChecking(true);
    try { await api.monitors.checkNow(id, token); await load(token); showToast('Check completed'); }
    catch (e: any) { showToast(e.message, 'error'); }
    finally { setChecking(false); }
  }

  async function handleScanRepo() {
    if (!token || !monitor?.githubRepoUrl) return;
    setScanning(true);
    try {
      const gToken = ghTokenHelper.get() ?? '';
      if (!gToken) { showToast('GitHub account not connected. Go to Settings → Integrations.', 'error'); return; }
      await api.monitors.scanRepo(id, token, gToken);
      await load(token);
      showToast('GitHub scan completed successfully');
    } catch (e: any) {
      showToast(e.message || 'Scan failed. Reconnect GitHub in Settings.', 'error');
    } finally {
      setScanning(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    await api.monitors.delete(id, token);
    router.push('/dashboard');
  }

  async function handleToggle() {
    if (!token || !monitor) return;
    try {
      await api.monitors.update(id, { isActive: !monitor.isActive }, token);
      await load(token);
      showToast(monitor.isActive ? 'Monitor paused' : 'Monitor resumed');
    } catch (e: any) { showToast(e.message, 'error'); }
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

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 40px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#FF1744', marginBottom: 16 }}>{error}</p>
        <Link href="/dashboard" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#CAFF00' }}>← Back to dashboard</Link>
      </div>
    );
  }

  if (!monitor) return null;

  const status = (checks[0]?.status ?? 'unknown') as any;
  const chartData = [...checks]
    .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime())
    .slice(-60)
    .map((c) => ({ time: fmtTime(c.checkedAt), ms: c.responseTimeMs ?? 0 }));

  const uptimePct = metrics?.uptime;
  const uptimeColor = uptimePct == null ? '#4A4A4A' : uptimePct >= 99 ? 'var(--color-violet-primary)' : uptimePct >= 95 ? '#FFDF00' : 'var(--color-pink-primary)';

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {showDeleteConfirm && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />}
      {showEdit && token && <EditModal monitor={monitor} token={token} onSave={(m) => { setMonitor(m); setShowEdit(false); showToast('Monitor updated'); }} onClose={() => setShowEdit(false)} />}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>
        <Link href="/dashboard" style={{ color: '#4A4A4A', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#F0F0F0')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4A4A4A')}>
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
          {monitor.url ? (
            <a href={monitor.url} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-violet-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
              {monitor.url}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>Repo-only monitor — no URL configured</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {monitor.githubRepoUrl && (
            <button onClick={handleScanRepo} disabled={scanning} className="btn-strict-secondary" style={{ height: 38, fontSize: 12, border: '1px solid rgba(202,255,0,0.3)', color: '#CAFF00', background: 'rgba(202,255,0,0.03)' }}>
              {scanning ? <Spinner color="#CAFF00" /> : <ShieldIcon />}
              Scan Commits
            </button>
          )}
          {monitor.url && (
            <button onClick={handleCheckNow} disabled={checking} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>
              {checking ? <Spinner color="var(--color-violet-primary)" /> : <RefreshIcon />}
              Check Now
            </button>
          )}
          <button onClick={() => setShowEdit(true)} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>Edit</button>
          <button onClick={handleToggle} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>
            {monitor.isActive ? 'Pause' : 'Resume'}
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-strict-danger">Delete</button>
        </div>
      </div>

      {/* Metrics */}
      {monitor.url && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 24, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
          {[
            { label: 'Uptime', value: uptimePct != null ? `${uptimePct}%` : '—', color: uptimeColor },
            { label: 'Avg Response', value: metrics?.avgResponseMs != null ? `${metrics.avgResponseMs}ms` : '—', color: '#F0F0F0' },
            { label: 'SSL Expires', value: checks[0]?.sslDaysLeft != null ? `${checks[0].sslDaysLeft}d` : '—', color: checks[0]?.sslDaysLeft != null && checks[0].sslDaysLeft < 14 ? '#FF1744' : '#F0F0F0' },
            { label: 'Total Checks', value: metrics?.totalChecks ?? '—', color: '#4A4A4A' },
          ].map((m, i) => (
            <div key={m.label} style={{ padding: '20px 24px', background: '#080808', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: m.color, lineHeight: 1, marginBottom: 6 }}>{m.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Uptime bar */}
      {checks.length > 0 && monitor.url && (
        <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Last {Math.min(checks.length, 90)} checks</span>
            {uptimePct != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: uptimeColor }}>{uptimePct}% uptime</span>}
          </div>
          <UptimeBar checks={checks} segments={90} />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: '20px 24px', marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 20px' }}>Response time (ms)</p>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-violet-primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-violet-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#4A4A4A', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" dy={8} />
                <YAxis tick={{ fontSize: 10, fill: '#4A4A4A', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                <Area type="monotone" dataKey="ms" name="Response" stroke="var(--color-violet-primary)" strokeWidth={1.5} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: 'var(--color-violet-primary)', stroke: '#000', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Security Incidents */}
      {monitor.githubRepoUrl && (
        <div style={{ background: '#080808', border: incidents.length > 0 ? '1px solid var(--color-pink-primary)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: incidents.length > 0 ? 'var(--color-pink-primary)' : '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Security Incidents
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A' }}>
              {incidents.filter(i => !i.resolved).length} Unresolved
            </span>
          </div>
          {incidents.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, margin: '0 0 16px', color: '#888' }}>No security alerts yet.</p>
              <button onClick={handleScanRepo} disabled={scanning} style={{ background: 'rgba(202,255,0,0.03)', border: '1px solid rgba(202,255,0,0.2)', color: '#CAFF00', padding: '8px 20px', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                {scanning ? 'Scanning...' : 'Scan Recent Commits'}
              </button>
            </div>
          ) : (
            incidents.map((inc, i) => (
              <div key={inc.id} style={{ padding: '16px 24px', borderBottom: i < incidents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: inc.resolved ? 0.5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: inc.resolved ? '#888' : 'var(--color-pink-primary)', fontWeight: 'bold' }}>
                    [{inc.severity.toUpperCase()}] {inc.riskType}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>{fmtDate(inc.createdAt)}</span>
                    {!inc.resolved && (
                      <InlineResolve incidentId={inc.id} token={token} onResolved={() => {
                        setIncidents(prev => prev.map(item => item.id === inc.id ? { ...item, resolved: true } : item));
                      }} />
                    )}
                    {inc.resolved && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#00E676' }}>✓ RESOLVED</span>}
                  </div>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: inc.resolved ? '#888' : '#F0F0F0', margin: '0 0 12px', lineHeight: 1.5 }}>{inc.description}</p>
                <div style={{ background: 'rgba(255,20,147,0.05)', padding: 12, borderRadius: 3, border: '1px solid rgba(255,20,147,0.1)', marginBottom: 12 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-pink-primary)', marginBottom: 4, textTransform: 'uppercase' }}>Recommendation</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#D0D0D0' }}>{inc.recommendation}</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#666' }}>Author: {inc.commitAuthor || 'Unknown'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>Commit: {inc.commitHash.substring(0, 7)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Check log */}
      {checks.length > 0 && (
        <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Check Log</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 70px 90px 70px 1fr auto', padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {['Status', 'Code', 'Response', 'SSL', 'Time', 'Error'].map(h => (
              <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#2A2A2A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>
          {checks.slice(0, 25).map((check, i) => (
            <div
              key={check.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 70px 90px 70px 1fr auto',
                alignItems: 'center',
                padding: '11px 24px',
                borderBottom: i < Math.min(checks.length, 25) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: check.status === 'down' ? 'rgba(255,23,68,0.02)' : 'transparent',
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#2A2A2A' }}>{fmtDate(check.checkedAt)}</span>
              <span title={check.errorMessage ?? undefined} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#FF1744', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: check.errorMessage ? 'help' : 'default' }}>
                {check.errorMessage ?? ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Downtime history */}
      {downtime.length > 0 && (
        <div style={{ background: '#080808', border: '1px solid rgba(255,23,68,0.15)', borderRadius: 3, overflow: 'hidden', marginTop: 16 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#FF1744', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Downtime History</span>
          </div>
          {downtime.map((w, i) => {
            const durationSec = Math.round(w.durationMs / 1000);
            const durationStr = durationSec < 60 ? `${durationSec}s` : durationSec < 3600 ? `${Math.round(durationSec / 60)}m` : `${(durationSec / 3600).toFixed(1)}h`;
            return (
              <div key={i} style={{ padding: '14px 24px', borderBottom: i < downtime.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#F0F0F0' }}>{fmtDate(w.start)}</span>
                  {w.end && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A', marginLeft: 8 }}>→ {fmtDate(w.end)}</span>}
                  {!w.end && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#FF1744', marginLeft: 8, letterSpacing: '0.08em' }}>ONGOING</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#FF1744' }}>{durationStr}</span>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes pg-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function InlineResolve({ incidentId, token, onResolved }: { incidentId: string; token: string | null; onResolved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)}
        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#F0F0F0', padding: '4px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
        Resolve
      </button>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#FFB300' }}>Confirm?</span>
      <button
        disabled={loading}
        onClick={async () => {
          if (!token) return;
          setLoading(true);
          try { await api.securityIncidents.resolve(incidentId, token); onResolved(); }
          catch { setConfirming(false); }
          finally { setLoading(false); }
        }}
        style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid #00E676', color: '#00E676', padding: '4px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
        {loading ? '...' : 'Yes'}
      </button>
      <button onClick={() => setConfirming(false)}
        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#888', padding: '4px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
        No
      </button>
    </div>
  );
}

function Spinner({ color }: { color: string }) {
  return <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: color, borderRadius: '50%', animation: 'pg-spin 0.7s linear infinite', display: 'inline-block', marginRight: 6 }} />;
}
function ShieldIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function RefreshIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>;
}
