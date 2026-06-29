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
import { useTranslation } from '@/lib/i18n';

function getGradeColor(grade: string) {
  if (!grade) return 'var(--color-txt-muted)';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return '#16A34A';
  if (g.startsWith('B')) return 'var(--color-acid)';
  if (g.startsWith('C')) return '#FFB300';
  if (g.startsWith('D')) return '#FF9100';
  if (g.startsWith('F')) return '#DC2626';
  return 'var(--color-txt-muted)';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 3, padding: '10px 14px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)', marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--color-acid)', margin: 0 }}>{payload[0]?.value}ms</p>
    </div>
  );
};

// Inline toast notification
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: type === 'success' ? 'rgba(0,230,118,0.1)' : 'rgba(255,23,68,0.1)',
      border: `1px solid ${type === 'success' ? '#16A34A' : '#DC2626'}`,
      borderRadius: 4, padding: '12px 20px',
      fontFamily: 'var(--font-mono)', fontSize: 13,
      color: type === 'success' ? '#16A34A' : '#DC2626',
      animation: 'pg-fade-in 0.2s ease-out both',
    }}>
      {msg}
    </div>
  );
}

// Inline delete confirmation
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: 6, padding: 32, maxWidth: 400, width: '90%' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-txt-primary)', margin: '0 0 12px' }}>{t('mon_delete_title')}</h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-txt-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
          {t('mon_delete_desc')}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-strict-secondary" style={{ fontSize: 13 }}>{t('btn_cancel')}</button>
          <button onClick={onConfirm} className="btn-strict-danger" style={{ fontSize: 13 }}>{t('btn_delete')}</button>
        </div>
      </div>
    </div>
  );
}

// Edit monitor modal
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number) { return String(n).padStart(2, '0'); }

function fmtWindow(w: any) {
  if (!w || !Array.isArray(w.days)) return 'Invalid window';
  const days = w.days.map((d: number) => DAYS[d] ?? '').filter(Boolean).join(', ');
  const sh = w.startHour ?? 0;
  const sm = w.startMin ?? 0;
  const eh = w.endHour ?? 0;
  const em = w.endMin ?? 0;
  return `${days} · ${pad(sh)}:${pad(sm)} – ${pad(eh)}:${pad(em)}`;
}

function EditModal({ monitor, token, onSave, onClose }: {
  monitor: Monitor; token: string;
  onSave: (updated: Monitor) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(monitor.name);
  const [url, setUrl] = useState(monitor.url ?? '');
  const [interval, setInterval] = useState(String(monitor.intervalMinutes));
  const [expectedStatus, setExpectedStatus] = useState(String(monitor.expectedStatus));
  const [webhookUrl, setWebhookUrl] = useState(monitor.notificationWebhookUrl ?? '');
  const [email, setEmail] = useState(monitor.notificationEmail ?? '');
  const [windows, setWindows] = useState<import('@/lib/api').MaintenanceWindow[]>(
    Array.isArray(monitor.maintenanceWindows) ? monitor.maintenanceWindows : []
  );
  const [addingWindow, setAddingWindow] = useState(false);
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [newStart, setNewStart] = useState('02:00');
  const [newEnd, setNewEnd] = useState('04:00');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function addWindow() {
    const [sh, sm] = newStart.split(':').map(Number);
    const [eh, em] = newEnd.split(':').map(Number);
    if (newDays.length === 0) return;
    setWindows(prev => [...prev, { days: newDays, startHour: sh, startMin: sm, endHour: eh, endMin: em }]);
    setAddingWindow(false);
    setNewDays([1, 2, 3, 4, 5]);
    setNewStart('02:00');
    setNewEnd('04:00');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');

    const intervalVal = parseInt(interval);
    const statusVal = parseInt(expectedStatus);

    if (isNaN(intervalVal) || intervalVal < 1) {
      setErr('Interval must be a valid number (at least 1 minute)');
      setSaving(false);
      return;
    }

    if (isNaN(statusVal) || statusVal < 100 || statusVal > 599) {
      setErr('Expected Status must be a valid HTTP status code (100-599)');
      setSaving(false);
      return;
    }

    try {
      const updated = await api.monitors.update(monitor.id, {
        name: name.trim(),
        url: url.trim() || undefined,
        intervalMinutes: intervalVal,
        expectedStatus: statusVal,
        notificationWebhookUrl: webhookUrl.trim() || undefined,
        notificationEmail: email.trim() || undefined,
        maintenanceWindows: windows,
      }, token);
      onSave(updated);
    } catch (e: any) {
      const msg = e.message;
      setErr(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Unknown error'));
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflowY: 'auto', padding: '24px 0',
    }}>
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: 32, maxWidth: 540, width: '90%', margin: 'auto' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-txt-primary)', margin: '0 0 24px' }}>{t('mon_edit_title')}</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Name', value: name, set: setName, placeholder: 'My API', type: 'text' },
            { label: 'URL', value: url, set: setUrl, placeholder: 'https://...', type: 'url' },
            { label: 'Notification Webhook (Discord / Slack)', value: webhookUrl, set: setWebhookUrl, placeholder: 'https://discord.com/api/webhooks/...', type: 'url' },
            { label: 'Notification Email', value: email, set: setEmail, placeholder: 'you@example.com', type: 'email' },
          ].map(f => (
            <div key={f.label}>
              <label style={labelStyle}>{f.label}</label>
              <input className="input-strict" type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} />
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Check Interval (min)</label>
              <input className="input-strict" type="number" min={1} max={60} value={interval} onChange={e => setInterval(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Expected Status</label>
              <input className="input-strict" type="number" min={100} max={599} value={expectedStatus} onChange={e => setExpectedStatus(e.target.value)} />
            </div>
          </div>

          {/* Maintenance Windows */}
          <div style={{ borderTop: '1px solid var(--color-border-main)', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Maintenance Windows</label>
              {!addingWindow && (
                <button type="button" onClick={() => setAddingWindow(true)}
                  style={{ background: 'transparent', border: '1px solid rgba(0,240,255,0.3)', color: 'var(--color-acid)', padding: '3px 10px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                  + Add
                </button>
              )}
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#555', margin: '0 0 10px' }}>
              Checks are skipped during these windows — no false alerts at maintenance time.
            </p>

            {windows.length === 0 && !addingWindow && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#3A3A3A', margin: 0 }}>No windows configured.</p>
            )}

            {windows.map((w, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 3, marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-secondary)' }}>{fmtWindow(w)}</span>
                <button type="button" onClick={() => setWindows(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ background: 'transparent', border: 'none', color: '#DC2626', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            ))}

            {addingWindow && (
              <div style={{ background: 'var(--color-bg-card)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: 4, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Days</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DAYS.map((d, i) => {
                      const active = newDays.includes(i);
                      return (
                        <button key={d} type="button"
                          onClick={() => setNewDays(prev => active ? prev.filter(x => x !== i) : [...prev, i].sort())}
                          style={{ padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', border: active ? '1px solid var(--color-acid)' : '1px solid var(--color-border-main)', background: active ? 'rgba(0,240,255,0.08)' : 'transparent', color: active ? 'var(--color-acid)' : 'var(--color-txt-muted)' }}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Start</label>
                    <input className="input-strict" type="time" value={newStart} onChange={e => setNewStart(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>End</label>
                    <input className="input-strict" type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={addWindow} className="btn-strict-primary" style={{ fontSize: 12, height: 32 }}>Add Window</button>
                  <button type="button" onClick={() => setAddingWindow(false)} className="btn-strict-secondary" style={{ fontSize: 12, height: 32 }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {err && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#DC2626', margin: 0 }}>{err}</p>}
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
  const { t, language } = useTranslation();
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

  // Network and Patch States
  const [diagnosingNet, setDiagnosingNet] = useState(false);
  const [netDiagnosticData, setNetDiagnosticData] = useState<any | null>(null);
  const [generatingPatchId, setGeneratingPatchId] = useState<string | null>(null);
  const [patchData, setPatchData] = useState<Record<string, { patch: string; explanation: string }>>({});
  const [patchError, setPatchError] = useState<string | null>(null);

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

  async function handleRunNetworkDiagnostic() {
    if (!token || !monitor?.url) return;
    setDiagnosingNet(true);
    try {
      const res = await api.playground.networkDiagnostics({ url: monitor.url }, token);
      setNetDiagnosticData(res);
    } catch (e: any) {
      showToast(e.message || 'Failed to run diagnostics', 'error');
    } finally {
      setDiagnosingNet(false);
    }
  }

  async function handleGeneratePatch(incId: string, commitHash: string, description: string) {
    if (!token || !monitor?.githubRepoUrl) return;
    setGeneratingPatchId(incId);
    setPatchError(null);
    try {
      const gToken = ghTokenHelper.get();
      if (!gToken) throw new Error('Connect GitHub account to fetch commit diffs.');
      const cleanUrl = monitor.githubRepoUrl.replace('.git', '');
      const parts = cleanUrl.split('/');
      const repo = parts.pop();
      const owner = parts.pop();
      if (!owner || !repo) throw new Error('Invalid repository.');
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${commitHash}`, {
        headers: { Authorization: `Bearer ${gToken}`, Accept: 'application/vnd.github.v3.diff' }
      });
      if (!res.ok) throw new Error(`Failed to fetch diff: HTTP ${res.status}`);
      const diffText = await res.text();
      const patchResult = await api.playground.generatePatch({ code: diffText, findings: description, language: 'diff' }, token);
      setPatchData(prev => ({ ...prev, [incId]: { patch: patchResult.patch, explanation: patchResult.explanation } }));
    } catch (e: any) {
      setPatchError(e.message);
      showToast(e.message, 'error');
    } finally {
      setGeneratingPatchId(null);
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
          <div key={h} style={{ height: h, background: 'var(--color-bg-card)', borderRadius: 3, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 40px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>{error}</p>
        <Link href="/dashboard" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-acid)' }}>← Back to dashboard</Link>
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
  const uptimeColor = uptimePct == null ? 'var(--color-txt-muted)' : uptimePct >= 99 ? 'var(--color-violet-primary)' : uptimePct >= 95 ? '#FFDF00' : 'var(--color-pink-primary)';

  return (
    <>
      {showDeleteConfirm && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />}
      {showEdit && token && <EditModal monitor={monitor} token={token} onSave={(m) => { setMonitor(m); setShowEdit(false); showToast('Monitor updated'); }} onClose={() => setShowEdit(false)} />}
      <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>
        {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>
        <Link href="/dashboard" style={{ color: 'var(--color-txt-muted)', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-txt-primary)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-txt-muted)')}>
          {t('mon_breadcrumb')}
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-violet-primary)' }}>{monitor.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'var(--color-txt-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {monitor.name}
            </h1>
            <StatusBadge status={status} />
            {!monitor.isActive && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)', border: '1px solid var(--color-border-main)', borderRadius: 2, padding: '2px 8px', letterSpacing: '0.1em' }}>
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>{t('mon_repo_only')}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {monitor.githubRepoUrl && (
            <button onClick={handleScanRepo} disabled={scanning} className="btn-strict-secondary" style={{ height: 38, fontSize: 12, border: '1px solid rgba(0,240,255,0.3)', color: 'var(--color-acid)', background: 'rgba(0,240,255,0.03)' }}>
              {scanning ? <Spinner color="var(--color-acid)" /> : <ShieldIcon />}
              {t('btn_scan')}
            </button>
          )}
          {monitor.url && (
            <button onClick={handleCheckNow} disabled={checking} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>
              {checking ? <Spinner color="var(--color-violet-primary)" /> : <RefreshIcon />}
              {t('btn_check')}
            </button>
          )}
          <button onClick={() => setShowEdit(true)} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>{t('btn_edit')}</button>
          <button onClick={handleToggle} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>
            {monitor.isActive ? t('btn_pause') : t('btn_resume')}
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-strict-danger">{t('btn_delete')}</button>
        </div>
      </div>

      {/* Metrics */}
      {monitor.url && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }} className="metrics-deck">
          {[
            { label: t('mon_metric_uptime'), value: uptimePct != null ? `${uptimePct}%` : '—', color: uptimeColor },
            { label: t('mon_metric_response'), value: metrics?.avgResponseMs != null ? `${metrics.avgResponseMs}ms` : '—', color: 'var(--color-txt-primary)' },
            { label: t('mon_metric_ssl'), value: checks[0]?.sslDaysLeft != null ? `${checks[0].sslDaysLeft}d` : '—', color: checks[0]?.sslDaysLeft != null && checks[0].sslDaysLeft < 14 ? 'var(--color-pink-primary)' : 'var(--color-txt-primary)' },
            { label: t('mon_metric_total'), value: metrics?.totalChecks ?? '—', color: 'var(--color-text-2)' },
          ].map((m, i) => (
            <div key={m.label} className="glass-card" style={{ padding: '20px 24px', borderRadius: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: m.color, lineHeight: 1, marginBottom: 6 }}>{m.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Uptime bar */}
      {checks.length > 0 && monitor.url && (
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16, borderRadius: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('mon_last_checks')} {Math.min(checks.length, 90)} {t('mon_checks_unit')}</span>
            {uptimePct != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: uptimeColor }}>{uptimePct}% {t('mon_uptime_label')}</span>}
          </div>
          <UptimeBar checks={checks} segments={90} />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16, borderRadius: 24 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 20px' }}>{t('mon_chart_response')}</p>
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
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-txt-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" dy={8} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-txt-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border-main)' }} />
                <Area type="monotone" dataKey="ms" name="Response" stroke="var(--color-violet-primary)" strokeWidth={1.5} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: 'var(--color-violet-primary)', stroke: '#000', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Security Headers & Latency diagnostics panels */}
      {monitor.url && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
          {/* Security Headers Panel */}
          <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', borderRadius: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('mon_sec_headers')}</span>
              {(monitor.securityGrade || checks[0]?.securityGrade) && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: getGradeColor(monitor.securityGrade || checks[0]?.securityGrade || ''),
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${getGradeColor(monitor.securityGrade || checks[0]?.securityGrade || '')}`,
                  padding: '2px 8px',
                  borderRadius: 2
                }}>
                  {t('mon_sec_grade')} {monitor.securityGrade || checks[0]?.securityGrade}
                </span>
              )}
            </div>

            {(monitor.securityHeaders || checks[0]?.securityHeaders) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'csp', name: 'Content-Security-Policy', value: (monitor.securityHeaders || checks[0]?.securityHeaders)?.headers?.csp },
                  { key: 'hsts', name: 'Strict-Transport-Security', value: (monitor.securityHeaders || checks[0]?.securityHeaders)?.headers?.hsts },
                  { key: 'xFrame', name: 'X-Frame-Options', value: (monitor.securityHeaders || checks[0]?.securityHeaders)?.headers?.xFrame },
                  { key: 'xContentType', name: 'X-Content-Type-Options', value: (monitor.securityHeaders || checks[0]?.securityHeaders)?.headers?.xContentType },
                  { key: 'referrer', name: 'Referrer-Policy', value: (monitor.securityHeaders || checks[0]?.securityHeaders)?.headers?.referrer },
                  { key: 'permissions', name: 'Permissions-Policy', value: (monitor.securityHeaders || checks[0]?.securityHeaders)?.headers?.permissions },
                ].map((hdr) => {
                  const present = !!hdr.value;
                  return (
                    <div key={hdr.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-btn-primary)' }}>{hdr.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={hdr.value || undefined}>
                          {hdr.value || t('mon_sec_not_configured')}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        fontWeight: 'bold',
                        color: present ? '#16A34A' : '#DC2626',
                        letterSpacing: '0.05em'
                      }}>
                        {present ? t('mon_sec_secure') : t('mon_sec_missing')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-muted)', textAlign: 'center', margin: 0 }}>
                  {t('mon_sec_no_scan')}
                </p>
              </div>
            )}
          </div>

          {/* Network Latency Breakdown Card */}
          <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', borderRadius: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('mon_net_title')}</span>
              <button
                onClick={handleRunNetworkDiagnostic}
                disabled={diagnosingNet}
                className="btn-strict-secondary"
                style={{ height: 26, fontSize: 10, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {diagnosingNet ? <Spinner color="var(--color-violet-primary)" /> : null}
                {t('mon_net_run')}
              </button>
            </div>

            {netDiagnosticData ? (
              netDiagnosticData.success && netDiagnosticData.timings ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                  {/* Segmented Phase Bar */}
                  <div>
                    <div style={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', background: '#222', marginBottom: 12 }}>
                      {[
                        { name: 'DNS', val: netDiagnosticData.timings.dnsLookupMs, color: '#16A34A' },
                        { name: 'TCP', val: netDiagnosticData.timings.tcpConnectMs, color: 'var(--color-acid)' },
                        { name: 'TLS', val: netDiagnosticData.timings.tlsHandshakeMs, color: '#00B0FF' },
                        { name: 'TTFB', val: Math.max(0, netDiagnosticData.timings.ttfbMs - (netDiagnosticData.timings.dnsLookupMs + netDiagnosticData.timings.tcpConnectMs + netDiagnosticData.timings.tlsHandshakeMs)), color: '#FF007F' }
                      ].map((seg, idx) => {
                        const pct = netDiagnosticData.timings.totalMs > 0 ? (seg.val / netDiagnosticData.timings.totalMs) * 100 : 0;
                        if (pct <= 0) return null;
                        return (
                          <div
                            key={idx}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: seg.color,
                              height: '100%'
                            }}
                            title={`${seg.name}: ${seg.val}ms (${pct.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>

                    {/* Timeline legend */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[
                        { label: 'DNS Lookup', val: netDiagnosticData.timings.dnsLookupMs, color: '#16A34A' },
                        { label: 'TCP Conn', val: netDiagnosticData.timings.tcpConnectMs, color: 'var(--color-acid)' },
                        { label: 'TLS Handshake', val: netDiagnosticData.timings.tlsHandshakeMs, color: '#00B0FF' },
                        { label: 'TTFB', val: netDiagnosticData.timings.ttfbMs, color: '#FF007F' }
                      ].map((leg) => (
                        <div key={leg.label}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: leg.color }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)' }}>{leg.label}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-txt-btn-primary)', fontWeight: 'bold' }}>{leg.val}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-main)', paddingTop: 10 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)' }}>{t('mon_net_total')}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 'bold', color: 'var(--color-acid)' }}>{netDiagnosticData.timings.totalMs}ms</span>
                  </div>

                  {/* AI Advice */}
                  {netDiagnosticData.advice && (
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: 3, padding: 10 }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-acid)', marginBottom: 4, letterSpacing: '0.1em' }}>AI SRE PERFORMANCE ADVICE</span>
                      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-txt-secondary)', lineHeight: 1.4 }}>{netDiagnosticData.advice}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#DC2626', textAlign: 'center', margin: 0 }}>
                    {t('mon_net_failed')}<br />{netDiagnosticData.error || 'Unknown network error'}
                  </p>
                </div>
              )
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, border: '1px dashed rgba(255,255,255,0.03)', borderRadius: 3 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-muted)', textAlign: 'center', margin: 0 }}>
                  {t('mon_net_no_diag')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Incidents */}
      {monitor.githubRepoUrl && (
        <div className="glass-card" style={{ padding: 24, border: incidents.length > 0 ? '1px solid var(--color-pink-primary)' : '1px solid var(--color-border-main)', borderRadius: 24, marginBottom: 16 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: incidents.length > 0 ? 'var(--color-pink-primary)' : 'var(--color-txt-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 'bold' }}>
              {t('mon_incidents_title')}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)' }}>
              {incidents.filter(i => !i.resolved).length} {t('mon_incidents_unresolved')}
            </span>
          </div>
          {incidents.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, margin: '0 0 16px', color: 'var(--color-txt-muted)' }}>{t('mon_incidents_none')}</p>
              <button onClick={handleScanRepo} disabled={scanning} style={{ background: 'rgba(0,240,255,0.03)', border: '1px solid rgba(0,240,255,0.2)', color: 'var(--color-acid)', padding: '8px 20px', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                {scanning ? t('mon_incidents_scanning') : t('btn_scan_now')}
              </button>
            </div>
          ) : (
            incidents.map((inc, i) => (
              <div key={inc.id} style={{ padding: '16px 24px', borderBottom: i < incidents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: inc.resolved ? 0.5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: inc.resolved ? 'var(--color-txt-muted)' : 'var(--color-pink-primary)', fontWeight: 'bold' }}>
                    [{inc.severity.toUpperCase()}] {inc.riskType}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>{fmtDate(inc.createdAt)}</span>
                    {monitor.githubRepoUrl && !inc.resolved && (
                      <button
                        onClick={() => handleGeneratePatch(inc.id, inc.commitHash, inc.description)}
                        disabled={generatingPatchId === inc.id}
                        style={{
                          background: 'rgba(0,240,255,0.05)',
                          border: '1px solid rgba(0,240,255,0.3)',
                          color: 'var(--color-acid)',
                          padding: '4px 8px',
                          borderRadius: 3,
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {generatingPatchId === inc.id ? <Spinner color="var(--color-acid)" /> : null}
                        {t('mon_incidents_patch')}
                      </button>
                    )}
                    {!inc.resolved && (
                      <InlineResolve incidentId={inc.id} token={token} onResolved={() => {
                        setIncidents(prev => prev.map(item => item.id === inc.id ? { ...item, resolved: true } : item));
                      }} />
                    )}
                    {inc.resolved && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#16A34A' }}>{t('mon_incidents_resolved')}</span>}
                  </div>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: inc.resolved ? 'var(--color-txt-muted)' : 'var(--color-txt-primary)', margin: '0 0 12px', lineHeight: 1.5 }}>{inc.description}</p>
                <div style={{ background: 'rgba(255,20,147,0.05)', padding: 12, borderRadius: 3, border: '1px solid rgba(255,20,147,0.1)', marginBottom: 12 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-pink-primary)', marginBottom: 4, textTransform: 'uppercase' }}>{t('mon_incidents_recommendation')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#D0D0D0' }}>{inc.recommendation}</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>{t('mon_incidents_author')} {inc.commitAuthor || 'Unknown'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>{t('mon_incidents_commit')} {inc.commitHash?.substring(0, 7) ?? '—'}</span>
                </div>

                {patchData[inc.id] && (
                  <div style={{ marginTop: 14, border: '1px solid rgba(0,240,255,0.3)', borderRadius: 3, background: 'var(--color-bg-sidebar)', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: 'rgba(0,240,255,0.05)', borderBottom: '1px solid rgba(0,240,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-acid)', fontWeight: 'bold' }}>AI SUGGESTED SECURITY PATCH (GIT DIFF)</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(patchData[inc.id].patch);
                          showToast('Patch copied to clipboard');
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-acid)', fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                      >
                        {t('mon_incidents_copy')}
                      </button>
                    </div>
                    <div style={{ padding: 12 }}>
                      <pre style={{ margin: 0, overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#00FF00', lineHeight: 1.5, background: '#020202', padding: 8, borderRadius: 2 }}>
                        <code>{patchData[inc.id].patch}</code>
                      </pre>
                      {patchData[inc.id].explanation && (
                        <div style={{ marginTop: 10, borderTop: '1px dashed var(--color-border-main)', paddingTop: 10 }}>
                          <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t('mon_incidents_explanation')}</span>
                          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-txt-secondary)', lineHeight: 1.4 }}>{patchData[inc.id].explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Check log */}
      {checks.length > 0 && (
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border-main)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('mon_check_log')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 70px 90px 70px 1fr auto', padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {[t('mon_col_status'), t('mon_col_code'), t('mon_col_response'), 'SSL', t('mon_col_time'), t('mon_col_error')].map(h => (
              <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-txt-muted)' }}>{check.statusCode ?? '—'}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: check.responseTimeMs && check.responseTimeMs > 2000 ? '#FFDF00' : 'var(--color-txt-primary)' }}>
                {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : '—'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-txt-muted)' }}>
                {check.sslDaysLeft != null ? `${check.sslDaysLeft}d` : '—'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>{fmtDate(check.checkedAt)}</span>
              <span title={check.errorMessage ?? undefined} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#DC2626', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: check.errorMessage ? 'help' : 'default' }}>
                {check.errorMessage ?? ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Downtime history */}
      {downtime.length > 0 && (
        <div className="glass-card" style={{ padding: 24, border: '1px solid rgba(255,23,68,0.25)', borderRadius: 24, marginTop: 16 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border-main)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#DC2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Downtime History</span>
          </div>
          {downtime.map((w, i) => {
            const durationSec = Math.round(w.durationMs / 1000);
            const durationStr = durationSec < 60 ? `${durationSec}s` : durationSec < 3600 ? `${Math.round(durationSec / 60)}m` : `${(durationSec / 3600).toFixed(1)}h`;
            return (
              <div key={i} style={{ padding: '14px 24px', borderBottom: i < downtime.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-txt-primary)' }}>{fmtDate(w.start)}</span>
                  {w.end && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)', marginLeft: 8 }}>→ {fmtDate(w.end)}</span>}
                  {!w.end && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#DC2626', marginLeft: 8, letterSpacing: '0.08em' }}>ONGOING</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#DC2626' }}>{durationStr}</span>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes pg-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
    </>
  );
}

function InlineResolve({ incidentId, token, onResolved }: { incidentId: string; token: string | null; onResolved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)}
        style={{ background: 'transparent', border: '1px solid var(--color-border-hover)', color: 'var(--color-txt-primary)', padding: '4px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
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
        style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid #16A34A', color: '#16A34A', padding: '4px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
        {loading ? '...' : 'Yes'}
      </button>
      <button onClick={() => setConfirming(false)}
        style={{ background: 'transparent', border: '1px solid var(--color-border-main)', color: 'var(--color-txt-muted)', padding: '4px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
        No
      </button>
    </div>
  );
}

function Spinner({ color }: { color: string }) {
  return <span style={{ width: 12, height: 12, border: '2px solid var(--color-border-main)', borderTopColor: color, borderRadius: '50%', animation: 'pg-spin 0.7s linear infinite', display: 'inline-block', marginRight: 6 }} />;
}
function ShieldIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function RefreshIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>;
}
