'use client';

import { useState } from 'react';
import { api, type CreateMonitorPayload } from '@/lib/api';

interface Props {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddMonitorModal({ token, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateMonitorPayload>({
    name: '',
    url: 'https://',
    expectedStatus: 200,
    intervalMinutes: 5,
    expectedText: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: keyof CreateMonitorPayload, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.expectedText) delete payload.expectedText;
      await api.monitors.create(payload, token);
      onCreated();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6,10,18,0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="fade-up"
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '28px 28px',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
            New Monitor
          </h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 10px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Name">
            <input
              className="input-field"
              placeholder="My API"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </Field>

          <Field label="URL">
            <input
              className="input-field"
              placeholder="https://api.example.com/health"
              value={form.url}
              onChange={(e) => update('url', e.target.value)}
              required
              type="url"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Expected Status">
              <input
                className="input-field"
                type="number"
                min={100}
                max={599}
                value={form.expectedStatus}
                onChange={(e) => update('expectedStatus', parseInt(e.target.value))}
              />
            </Field>
            <Field label="Interval (min)">
              <select
                className="input-field"
                value={form.intervalMinutes}
                onChange={(e) => update('intervalMinutes', parseInt(e.target.value))}
                style={{ cursor: 'pointer' }}
              >
                <option value={1}>1 min</option>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </Field>
          </div>

          <Field label="Expected text (optional)" hint="Check if response body contains this string">
            <input
              className="input-field"
              placeholder="ok"
              value={form.expectedText}
              onChange={(e) => update('expectedText', e.target.value)}
            />
          </Field>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(255,59,107,0.08)', border: '1px solid rgba(255,59,107,0.15)', borderRadius: 6, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
              {loading ? 'Creating…' : 'Create Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>
        {label}
        {hint && <span style={{ marginLeft: 6, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', color: 'var(--subtle)' }}>— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
