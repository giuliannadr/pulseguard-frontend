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
import { notify } from '@/lib/toast';

function getGradeColor(grade: string) {
  if (!grade) return 'var(--color-txt-muted)';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return '#16A34A';
  if (g.startsWith('B')) return '#C4B5FD';
  if (g.startsWith('C')) return '#F59E0B';
  if (g.startsWith('D')) return '#F97316';
  if (g.startsWith('F')) return '#DC2626';
  return 'var(--color-txt-muted)';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── CSV Export ────────────────────────────────────────────
function exportChecksCSV(checks: Check[], monitorName: string) {
  const rows = [
    ['Date', 'Status', 'Response (ms)', 'Status Code', 'SSL Days Left', 'Error'],
    ...checks.map(c => [
      new Date(c.checkedAt).toISOString(),
      c.status,
      c.responseTimeMs ?? '',
      c.statusCode ?? '',
      c.sslDaysLeft ?? '',
      c.errorMessage ?? '',
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${monitorName.replace(/[^a-z0-9]/gi, '_')}_checks.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Uptime Badge ──────────────────────────────────────────
function generateUptimeBadge(uptimePct: number | null, monitorName: string): string {
  const pct = uptimePct ?? 0;
  const color = pct >= 99 ? '22c55e' : pct >= 95 ? 'f59e0b' : 'ef4444';
  const label = encodeURIComponent(monitorName.slice(0, 20));
  return `https://img.shields.io/badge/${label}-${pct}%25_uptime-${color}?style=flat-square`;
}

// ── Check Heatmap ─────────────────────────────────────────
function CheckHeatmap({ checks }: { checks: Check[] }) {
  // Build a map of date → status (worst status of the day wins)
  const dayMap = new Map<string, 'up' | 'down' | 'degraded' | 'unknown'>();
  const statusPriority = { down: 3, degraded: 2, unknown: 1, up: 0 };
  for (const c of checks) {
    const day = c.checkedAt.slice(0, 10);
    const existing = dayMap.get(day);
    if (!existing || (statusPriority[c.status] ?? 0) > (statusPriority[existing] ?? 0)) {
      dayMap.set(day, c.status);
    }
  }
  // Last 84 days (12 weeks)
  const days: { date: string; status: string }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, status: dayMap.get(key) ?? 'none' });
  }
  const getColor = (s: string) => {
    if (s === 'up') return 'var(--color-status-up)';
    if (s === 'down') return 'var(--color-status-down)';
    if (s === 'degraded') return 'var(--color-status-degraded)';
    return 'var(--color-border-main)';
  };
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {week.map((d, di) => (
            <div
              key={di}
              title={`${d.date}: ${d.status}`}
              style={{
                width: 10, height: 10, borderRadius: 2,
                background: getColor(d.status),
                opacity: d.status === 'none' ? 0.25 : 1,
                cursor: 'default',
                transition: 'opacity 0.15s',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
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

function AlertsPanel({ monitor, token, onUpdate }: { monitor: Monitor; token: string; onUpdate: (m: Monitor) => void }) {
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [emailVal, setEmailVal] = useState(monitor.notificationEmail ?? '');
  const [webhookVal, setWebhookVal] = useState(monitor.notificationWebhookUrl ?? '');
  const [saving, setSaving] = useState<'email' | 'webhook' | null>(null);
  const [testState, setTestState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [testMsg, setTestMsg] = useState('');

  async function saveField(field: 'email' | 'webhook') {
    setSaving(field);
    try {
      const payload = field === 'email'
        ? { notificationEmail: emailVal.trim() || undefined }
        : { notificationWebhookUrl: webhookVal.trim() || undefined };
      const updated = await api.monitors.update(monitor.id, payload, token);
      onUpdate(updated);
      if (field === 'email') setEditingEmail(false);
      else setEditingWebhook(false);
      notify.success(field === 'email' ? 'Email de notificación guardado' : 'Webhook guardado');
    } catch (e: any) {
      notify.error('Error al guardar', e?.message);
    }
    setSaving(null);
  }

  async function handleTest() {
    if (!monitor.notificationEmail && !emailVal.trim()) return;
    const emailToTest = monitor.notificationEmail || emailVal.trim();
    setTestState('sending');
    try {
      const result = await sendTestEmailViaWeb3Forms(emailToTest, monitor.name);
      setTestMsg(result.message);
      setTestState(result.ok ? 'ok' : 'err');
      if (result.ok) notify.success('Email de prueba enviado', result.message);
      else notify.error('Error al enviar email', result.message);
    } catch (e: any) {
      setTestMsg(e.message ?? 'Error');
      setTestState('err');
      notify.error('Error al enviar email', e.message);
    }
    setTimeout(() => { setTestState('idle'); setTestMsg(''); }, 5000);
  }

  const hasEmail = !!(monitor.notificationEmail);
  const hasWebhook = !!(monitor.notificationWebhookUrl);
  const noneConfigured = !hasEmail && !hasWebhook;

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 20px',
    borderBottom: '1px solid var(--color-border-main)',
  };
  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontFamily: 'var(--font-mono)',
    padding: '3px 10px', borderRadius: 20,
    color: active ? '#16A34A' : '#9CA3AF',
    background: active ? 'rgba(22,163,74,0.1)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? '#16A34A40' : 'rgba(255,255,255,0.08)'}`,
  });

  return (
    <div className="glass-card" style={{ borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={noneConfigured ? '#9CA3AF' : '#16A34A'} strokeWidth="2" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-txt-muted)' }}>
            Alertas
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={chipStyle(hasEmail)}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasEmail ? '#16A34A' : '#9CA3AF' }} />
            Email {hasEmail ? 'activo' : 'inactivo'}
          </span>
          <span style={chipStyle(hasWebhook)}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasWebhook ? '#16A34A' : '#9CA3AF' }} />
            Webhook {hasWebhook ? 'activo' : 'inactivo'}
          </span>
        </div>
      </div>

      {/* Warning si no hay nada configurado */}
      {noneConfigured && (
        <div style={{ padding: '10px 20px', background: 'rgba(217,119,6,0.06)', borderBottom: '1px solid var(--color-border-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#D97706' }}>
            Sin alertas configuradas — no te enterarás si este monitor cae
          </span>
        </div>
      )}

      {/* Email row */}
      <div style={rowStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-txt-muted)" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        <div style={{ flex: 1 }}>
          {editingEmail ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-strict"
                type="email"
                value={emailVal}
                onChange={e => setEmailVal(e.target.value)}
                placeholder="vos@ejemplo.com"
                autoFocus
                style={{ flex: 1, height: 32, fontSize: 12 }}
              />
              <button onClick={() => saveField('email')} disabled={saving === 'email'}
                style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.3)', color: 'var(--color-acid)', padding: '0 12px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                {saving === 'email' ? '...' : 'Guardar'}
              </button>
              <button onClick={() => { setEditingEmail(false); setEmailVal(monitor.notificationEmail ?? ''); }}
                style={{ background: 'transparent', border: '1px solid var(--color-border-main)', color: 'var(--color-txt-muted)', padding: '0 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: hasEmail ? 'var(--color-txt-primary)' : 'var(--color-txt-muted)' }}>
                {hasEmail ? monitor.notificationEmail : 'Sin email configurado'}
              </span>
              <button onClick={() => setEditingEmail(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-acid)', fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer', padding: 0 }}>
                {hasEmail ? 'Cambiar' : '+ Agregar'}
              </button>
            </div>
          )}
        </div>
        {hasEmail && !editingEmail && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button onClick={handleTest} disabled={testState === 'sending'}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border-main)', color: testState === 'ok' ? '#16A34A' : testState === 'err' ? '#DC2626' : 'var(--color-txt-muted)', padding: '4px 12px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all 0.2s' }}>
              {testState === 'sending' ? '...' : testState === 'ok' ? '✓ Enviado' : testState === 'err' ? '✗ Error' : 'Probar'}
            </button>
            {testMsg && <span style={{ fontSize: 9, color: testState === 'ok' ? '#16A34A' : '#DC2626', fontFamily: 'var(--font-mono)', maxWidth: 180, textAlign: 'right' }}>{testMsg}</span>}
          </div>
        )}
      </div>

      {/* Webhook row */}
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-txt-muted)" strokeWidth="1.5" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <div style={{ flex: 1 }}>
          {editingWebhook ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-strict"
                type="url"
                value={webhookVal}
                onChange={e => setWebhookVal(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                autoFocus
                style={{ flex: 1, height: 32, fontSize: 12 }}
              />
              <button onClick={() => saveField('webhook')} disabled={saving === 'webhook'}
                style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.3)', color: 'var(--color-acid)', padding: '0 12px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                {saving === 'webhook' ? '...' : 'Guardar'}
              </button>
              <button onClick={() => { setEditingWebhook(false); setWebhookVal(monitor.notificationWebhookUrl ?? ''); }}
                style={{ background: 'transparent', border: '1px solid var(--color-border-main)', color: 'var(--color-txt-muted)', padding: '0 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: hasWebhook ? 'var(--color-txt-primary)' : 'var(--color-txt-muted)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {hasWebhook ? monitor.notificationWebhookUrl : 'Sin webhook configurado'}
              </span>
              <button onClick={() => setEditingWebhook(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-acid)', fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                {hasWebhook ? 'Cambiar' : '+ Agregar'}
              </button>
            </div>
          )}
        </div>
        {hasWebhook && !editingWebhook && (
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#9CA3AF' }}>
            {monitor.notificationWebhookUrl?.includes('discord') ? 'Discord' : monitor.notificationWebhookUrl?.includes('slack') ? 'Slack' : 'Webhook'}
          </span>
        )}
      </div>
    </div>
  );
}

// Web3Forms access key — free tier, up to 250 emails/month
const WEB3FORMS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? ''; 

async function sendTestEmailViaWeb3Forms(toEmail: string, monitorName: string): Promise<{ ok: boolean; message: string }> {
  if (!toEmail.trim()) return { ok: false, message: 'Ingresá un email primero' };
  if (!WEB3FORMS_KEY) return { ok: false, message: 'Web3Forms key not configured (NEXT_PUBLIC_WEB3FORMS_KEY)' };
  
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      to: toEmail,
      subject: `🔔 PulseGuard — Test Alert for "${monitorName}"`,
      message: `Este es un email de prueba enviado desde PulseGuard.\n\nMonitor: ${monitorName}\nFecha: ${new Date().toLocaleString()}\n\nSi recibís este email, las notificaciones están configuradas correctamente.`,
      from_name: 'PulseGuard Alerts',
      botcheck: '',
    }),
  });
  const data = await res.json();
  if (data.success) return { ok: true, message: 'Email enviado! Revisá tu bandeja.' };
  return { ok: false, message: data.message ?? 'Error al enviar' };
}

function TestEmailButton({ monitorId, email, token, monitorName = '' }: { monitorId: string; email: string; token: string; monitorName?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const displayName = monitorName || `Monitor ${monitorId.slice(0, 8)}`;

  async function handleTest() {
    if (!email.trim()) { setMsg('Ingresá un email primero'); setState('err'); setTimeout(() => setState('idle'), 3000); return; }
    setState('sending');
    try {
      const result = await sendTestEmailViaWeb3Forms(email, displayName);
      setMsg(result.message);
      setState(result.ok ? 'ok' : 'err');
    } catch (e: any) {
      setMsg(e.message ?? 'Error de red');
      setState('err');
    }
    setTimeout(() => setState('idle'), 4000);
  }

  const bg = state === 'ok' ? 'rgba(22,163,74,0.12)' : state === 'err' ? 'rgba(220,38,38,0.12)' : 'var(--color-bg-card-hover)';
  const border = state === 'ok' ? '1px solid #16A34A' : state === 'err' ? '1px solid #DC2626' : '1px solid var(--color-border-main)';
  const color = state === 'ok' ? '#16A34A' : state === 'err' ? '#DC2626' : 'var(--color-brand-primary)';
  const label = state === 'sending' ? '...' : state === 'ok' ? '✓ Enviado' : state === 'err' ? '✗ Error' : 'Probar';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
      <button type="button" onClick={handleTest} disabled={state === 'sending'}
        style={{ background: bg, border, color, padding: '0 14px', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', whiteSpace: 'nowrap', height: 38, transition: 'all 0.2s' }}>
        {label}
      </button>
      {msg && <span style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', maxWidth: 140, textAlign: 'right', lineHeight: 1.3 }}>{msg}</span>}
    </div>
  );
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
          ].map(f => (
            <div key={f.label}>
              <label style={labelStyle}>{f.label}</label>
              <input className="input-strict" type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>Email de notificación</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input-strict" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vos@ejemplo.com" style={{ flex: 1 }} />
              <TestEmailButton monitorId={monitor.id} email={email} token={token} monitorName={monitor.name} />
            </div>
          </div>

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

  // Network and Patch States
  const [diagnosingNet, setDiagnosingNet] = useState(false);
  const [netDiagnosticData, setNetDiagnosticData] = useState<any | null>(null);
  const [generatingPatchId, setGeneratingPatchId] = useState<string | null>(null);
  const [patchData, setPatchData] = useState<Record<string, { patch: string; explanation: string }>>({});
  const [patchError, setPatchError] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (type === 'success') notify.success(msg);
    else notify.error(msg);
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
      await api.monitors.scanRepo(id, token, gToken, true);
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
      const patchResult = await api.playground.generatePatch({ code: diffText, findings: description, language: 'diff' }, token) as { patch: string; explanation: string };
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
    try {
      await api.monitors.delete(id, token);
      router.push('/dashboard');
    } catch (e: any) {
      notify.error('Error al eliminar monitor', e?.message);
    }
  }

  async function handleToggle() {
    if (!token || !monitor) return;
    try {
      await api.monitors.update(id, { isActive: !monitor.isActive }, token);
      await load(token);
      showToast(monitor.isActive ? 'Monitor paused' : 'Monitor resumed');
    } catch (e: any) { showToast(e.message, 'error'); }
  }

  async function handleClone() {
    if (!token || !monitor) return;
    try {
      const cloned = await api.monitors.create({
        name: `${monitor.name} (copy)`,
        url: monitor.url ?? undefined,
        expectedStatus: monitor.expectedStatus,
        intervalMinutes: monitor.intervalMinutes,
        notificationWebhookUrl: monitor.notificationWebhookUrl ?? undefined,
        notificationEmail: monitor.notificationEmail ?? undefined,
      }, token);
      showToast(`Cloned as "${cloned.name}" ✓`);
      setTimeout(() => router.push(`/monitors/${cloned.id}`), 1200);
    } catch (e: any) { showToast(e.message || 'Clone failed', 'error'); }
  }


  if (loading) {
    const Bone = ({ w = '100%', h = 14, r = 4 }: { w?: string | number; h?: number; r?: number }) => (
      <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: 'linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bone w={220} h={28} r={6} />
            <Bone w={160} h={13} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Bone w={80} h={34} r={4} />
            <Bone w={80} h={34} r={4} />
          </div>
        </div>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Bone w="50%" h={11} />
              <Bone w="70%" h={24} r={6} />
            </div>
          ))}
        </div>
        {/* Chart */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: '24px 20px' }}>
          <div style={{ marginBottom: 20 }}><Bone w={140} h={14} /></div>
          <Bone w="100%" h={160} r={6} />
        </div>
        {/* Incidents */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: '20px' }}>
          <Bone w={160} h={14} r={4} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--color-border-main)' }}>
                <Bone w={10} h={10} r={5} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Bone w="60%" h={12} />
                  <Bone w="30%" h={9} />
                </div>
                <Bone w={60} h={22} r={11} />
              </div>
            ))}
          </div>
        </div>
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
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>
        <Link href="/dashboard" style={{ color: 'var(--color-txt-muted)', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-txt-primary)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-txt-muted)')}>
          {t('mon_breadcrumb')}
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-brand-primary)' }}>{monitor.name}</span>
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
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
              {monitor.url}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>{t('mon_repo_only')}</span>
          )}
          {/* Maintenance window active badge */}
          {Array.isArray(monitor.maintenanceWindows) && monitor.maintenanceWindows.length > 0 && (() => {
            const now = new Date();
            const day = now.getDay(); const h = now.getHours(); const m = now.getMinutes();
            const inMaint = monitor.maintenanceWindows.some(w =>
              Array.isArray(w.days) && w.days.includes(day) &&
              (h * 60 + m) >= (w.startHour * 60 + w.startMin) &&
              (h * 60 + m) < (w.endHour * 60 + w.endMin)
            );
            return inMaint ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '3px 10px', letterSpacing: '0.08em', marginTop: 4, display: 'inline-block' }}>
                🔧 IN MAINTENANCE
              </span>
            ) : null;
          })()}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {monitor.githubRepoUrl && (
            <button onClick={handleScanRepo} disabled={scanning} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>
              {scanning ? <Spinner color="var(--color-brand-primary)" /> : <ShieldIcon />}
              {t('btn_scan')}
            </button>
          )}
          {monitor.url && (
            <button onClick={handleCheckNow} disabled={checking} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>
              {checking ? <Spinner color="var(--color-brand-primary)" /> : <RefreshIcon />}
              {t('btn_check')}
            </button>
          )}
          <button onClick={() => exportChecksCSV(checks, monitor.name)} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }} title="Download checks as CSV">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            CSV
          </button>
          <button onClick={handleClone} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }} title="Clone this monitor">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Clone
          </button>
          <button onClick={() => setShowEdit(true)} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>{t('btn_edit')}</button>
          <button onClick={handleToggle} className="btn-strict-secondary" style={{ height: 38, fontSize: 12 }}>
            {monitor.isActive ? t('btn_pause') : t('btn_resume')}
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-strict-danger">{t('btn_delete')}</button>
        </div>
      </div>

      {/* Alerts / Notifications */}
      {token && <AlertsPanel monitor={monitor} token={token} onUpdate={setMonitor} />}

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

      {/* Heatmap — 84-day check history */}
      {checks.length > 0 && monitor.url && (
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>12-Week Check History</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)' }}>
              {[['up','Operational'],['degraded','Degraded'],['down','Down']].map(([s, l]) => (
                <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s === 'up' ? 'var(--color-status-up)' : s === 'degraded' ? 'var(--color-status-degraded)' : 'var(--color-status-down)' }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          <CheckHeatmap checks={checks} />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>{t('mon_chart_response')}</p>
            {/* Uptime badge generator */}
            <BadgeGenerator uptimePct={metrics?.uptime ?? null} monitorName={monitor.name} />
          </div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-brand-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border-main)" vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-txt-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" dy={8} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-txt-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border-main)' }} />
                <Area type="monotone" dataKey="ms" name="Response" stroke="var(--color-brand-primary)" strokeWidth={1.5} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: 'var(--color-brand-primary)', strokeWidth: 2 }} />
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
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-primary)' }}>{hdr.name}</div>
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

// ── Badge Generator ──────────────────────────────────────
function BadgeGenerator({ uptimePct, monitorName }: { uptimePct: number | null; monitorName: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const badgeUrl = generateUptimeBadge(uptimePct, monitorName);
  const markdown = `![${monitorName} uptime](${badgeUrl})`;

  function copy() {
    navigator.clipboard.writeText(markdown).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'var(--color-bg-card-hover)', border: '1px solid var(--color-border-main)', color: 'var(--color-txt-muted)', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Badge
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 32, zIndex: 50, background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 10, padding: 16, width: 320, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Uptime Badge</p>
          <img src={badgeUrl} alt="uptime badge" style={{ marginBottom: 10, height: 20 }} />
          <div style={{ background: 'var(--color-bg-card-hover)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-secondary)', wordBreak: 'break-all', marginBottom: 10 }}>
            {markdown}
          </div>
          <button onClick={copy} style={{ background: copied ? 'rgba(22,163,74,0.1)' : 'var(--color-brand-light)', border: `1px solid ${copied ? '#16A34A' : 'var(--color-brand-mid)'}`, color: copied ? '#16A34A' : 'var(--color-brand-primary)', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', width: '100%' }}>
            {copied ? '✓ Copied!' : 'Copy Markdown'}
          </button>
        </div>
      )}
    </div>
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
