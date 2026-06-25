'use client';

import { useState, useEffect } from 'react';
import { api, type CreateMonitorPayload } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

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
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const gToken = session?.provider_token;
      if (gToken) {
        setGithubToken(gToken);
        api.github.repos(token, gToken)
          .then(setRepos)
          .catch(e => console.error('Failed to fetch repos', e));
      }
    });
  }, [token]);

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
      const monitor = await api.monitors.create(payload, token);
      
      if (selectedRepo && githubToken) {
        const [owner, repoName] = selectedRepo.full_name.split('/');
        await api.github.connect(monitor.id, owner, repoName, token, githubToken);
      }
      
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
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          background: '#080808',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          padding: 32,
          animation: 'pg-fade-in 0.2s ease-out both',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: '#CAFF00',
            borderRadius: '3px 3px 0 0',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#CAFF00', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              // New
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#F0F0F0', margin: 0, letterSpacing: '-0.02em' }}>
              Add Monitor
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3,
              background: 'transparent',
              color: '#4A4A4A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F0F0F0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#4A4A4A'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="Name">
            <input
              className="input-strict"
              placeholder="My API"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </Field>

          <Field label="URL">
            <input
              className="input-strict"
              placeholder="https://api.example.com/health"
              value={form.url}
              onChange={(e) => update('url', e.target.value)}
              required
              type="url"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Expected Status">
              <input
                className="input-strict"
                type="number"
                min={100}
                max={599}
                value={form.expectedStatus}
                onChange={(e) => update('expectedStatus', parseInt(e.target.value))}
              />
            </Field>
            <Field label="Check Interval">
              <select
                className="input-strict"
                style={{ cursor: 'pointer' }}
                value={form.intervalMinutes}
                onChange={(e) => update('intervalMinutes', parseInt(e.target.value))}
              >
                <option value={1}>Every 1 min</option>
                <option value={5}>Every 5 min</option>
                <option value={10}>Every 10 min</option>
                <option value={15}>Every 15 min</option>
                <option value={30}>Every 30 min</option>
                <option value={60}>Every 60 min</option>
              </select>
            </Field>
          </div>

          <Field label="Expected text" hint="optional — checks if body contains this">
            <input
              className="input-strict"
              placeholder="ok"
              value={form.expectedText}
              onChange={(e) => update('expectedText', e.target.value)}
            />
          </Field>

          {repos.length > 0 && (
            <Field label="DevSecOps AI" hint="1-Click GitHub Integration">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select
                  className="input-strict"
                  style={{ cursor: 'pointer', border: selectedRepo ? '1px solid var(--color-violet-primary)' : undefined }}
                  value={selectedRepo?.full_name || ''}
                  onChange={(e) => {
                    const repo = repos.find(r => r.full_name === e.target.value);
                    setSelectedRepo(repo || null);
                    if (repo && form.name === '') update('name', repo.name);
                  }}
                >
                  <option value="">Do not connect (Monitor Only)</option>
                  {repos.map(r => (
                    <option key={r.id} value={r.full_name}>Protect {r.full_name}</option>
                  ))}
                </select>
                {selectedRepo && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-violet-primary)', background: 'var(--color-violet-primary)10', padding: '8px 12px', borderRadius: 3, border: '1px solid var(--color-violet-primary)30' }}>
                    <span style={{ fontWeight: 'bold' }}>✓ Webhook will be auto-configured.</span> The AI will scan every push for security vulnerabilities.
                  </div>
                )}
              </div>
            </Field>
          )}

          {error && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: '#FF1744',
                background: 'rgba(255,23,68,0.08)',
                border: '1px solid rgba(255,23,68,0.2)',
                borderRadius: 3,
                padding: '10px 14px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-strict-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-strict-primary" style={{ flex: 2 }}>
              {loading ? 'Creating...' : 'Create Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: '#4A4A4A',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
        {hint && (
          <span style={{ marginLeft: 8, fontFamily: 'var(--font-body)', letterSpacing: 0, textTransform: 'none', color: '#2A2A2A' }}>
            — {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
