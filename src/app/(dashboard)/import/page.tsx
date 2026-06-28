'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { api, githubToken as ghTokenHelper } from '@/lib/api';
import Link from 'next/link';

type MonitorMode = 'full' | 'url-only' | 'repo-only';

const MODES: { id: MonitorMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'full',
    label: 'Full Project',
    description: 'URL uptime monitoring + GitHub security scanning. For any deployed project you own.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    id: 'url-only',
    label: 'URL Monitor',
    description: 'Uptime, SSL & response time only. No repo needed. Works for any website.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    id: 'repo-only',
    label: 'Repo Scanner',
    description: 'Security scanning only, no URL required. For backends, libraries, or services not yet deployed.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
];

export default function ImportPage() {
  const router = useRouter();
  const [mode, setMode] = useState<MonitorMode>('full');
  const [token, setToken] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposLoaded, setReposLoaded] = useState(false);

  // Form state
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const needsRepo = mode === 'full' || mode === 'repo-only';
  const needsUrl = mode === 'full' || mode === 'url-only';

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        const tok = session?.access_token ?? null;
        const freshGToken = session?.provider_token ?? null;
        if (freshGToken) ghTokenHelper.set(freshGToken);
        const gToken = freshGToken ?? ghTokenHelper.get();
        setToken(tok);
        setGithubToken(gToken);
      });
    });
  }, []);

  function loadRepos() {
    if (!token || !githubToken || reposLoaded) return;
    setLoadingRepos(true);
    api.github.repos(token, githubToken)
      .then(data => { setRepos(data); setReposLoaded(true); setLoadingRepos(false); })
      .catch(e => {
        if (e.message?.includes('401') || e.message?.includes('403')) {
          ghTokenHelper.clear();
          setGithubToken(null);
        }
        setError(e.message || 'Failed to load repositories');
        setLoadingRepos(false);
      });
  }

  // Load repos when switching to a mode that needs them
  useEffect(() => {
    if (needsRepo && token && githubToken && !reposLoaded) loadRepos();
  }, [needsRepo, token, githubToken]);

  // Reset repo selection when mode changes
  useEffect(() => {
    setSelectedRepo(null);
    setError('');
  }, [mode]);

  async function handleConnectGithub() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=/import`,
        scopes: 'repo write:repo_hook read:user',
      },
    });
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setError('Session expired. Please refresh the page.'); return; }
    if (needsRepo && !selectedRepo) return;
    if (needsUrl && !url) return;

    setError('');
    setImporting(true);

    try {
      const monitorName = name.trim() || selectedRepo?.name || new URL(url).hostname;

      // Create monitor (url is optional for repo-only mode)
      const savedWebhook = typeof window !== 'undefined' ? localStorage.getItem('pg_webhook_url') ?? undefined : undefined;
      const monitor = await api.monitors.create({
        name: monitorName,
        url: needsUrl ? url : undefined,
        expectedStatus: 200,
        intervalMinutes: 5,
        notificationWebhookUrl: savedWebhook || undefined,
        notificationEmail: notificationEmail.trim() || undefined,
      }, token);

      // Connect GitHub repo if needed
      if (needsRepo && selectedRepo && githubToken) {
        const [owner, repoName] = selectedRepo.full_name.split('/');
        await api.github.connect(monitor.id, owner, repoName, token, githubToken);
      }

      router.push(`/monitors/${monitor.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create monitor');
      setImporting(false);
    }
  }

  const canSubmit = !importing &&
    (!needsUrl || url.length > 0) &&
    (!needsRepo || selectedRepo !== null);

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>
        <Link href="/dashboard" style={{ color: 'var(--color-txt-muted)', textDecoration: 'none' }}>Dashboard</Link>
        <span>/</span>
        <span style={{ color: 'var(--color-acid)' }}>Add Monitor</span>
      </div>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--color-txt-primary)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        Add a new monitor
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-txt-muted)', margin: '0 0 32px' }}>
        Choose what you want to track — uptime, security, or both.
      </p>

      {/* Mode selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            style={{
              background: mode === m.id ? 'rgba(0,240,255,0.06)' : 'var(--color-bg-card)',
              border: `1px solid ${mode === m.id ? 'var(--color-acid)' : 'var(--color-border-main)'}`,
              borderRadius: 6,
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ color: mode === m.id ? 'var(--color-acid)' : 'var(--color-txt-muted)', marginBottom: 10 }}>{m.icon}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: mode === m.id ? 'var(--color-txt-primary)' : 'var(--color-txt-muted)', marginBottom: 6 }}>
              {m.label}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#555', lineHeight: 1.5 }}>
              {m.description}
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Name — always shown */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: 24 }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Monitor Name
          </label>
          <input
            className="input-strict"
            placeholder={selectedRepo?.name ?? (url ? new URL(url.startsWith('http') ? url : 'https://' + url).hostname : 'My API')}
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#555', margin: '8px 0 0' }}>
            Leave blank to auto-fill from repo name or URL.
          </p>
        </div>

        {/* Notification email */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: 24 }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Alert Email <span style={{ color: 'var(--color-txt-muted)', textTransform: 'none', fontSize: 10 }}>(optional)</span>
          </label>
          <input
            className="input-strict"
            type="email"
            placeholder="you@example.com"
            value={notificationEmail}
            onChange={e => setNotificationEmail(e.target.value)}
          />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#555', margin: '8px 0 0' }}>
            Get emailed when this monitor goes down. Requires RESEND_API_KEY on the server.
          </p>
        </div>

        {/* URL field */}
        {needsUrl && (
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: 24 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              URL to monitor <span style={{ color: 'var(--color-acid)' }}>*</span>
            </label>
            <input
              className="input-strict"
              type="url"
              placeholder="https://my-api.railway.app"
              required={needsUrl}
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
            {mode === 'url-only' && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#555', margin: '8px 0 0' }}>
                Any public URL — you don't need to own the site.
              </p>
            )}
          </div>
        )}

        {/* Repo picker */}
        {needsRepo && (
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-txt-muted)">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-txt-primary)', fontWeight: 600 }}>
                  GitHub Repository {selectedRepo && <span style={{ color: 'var(--color-acid)' }}>— {selectedRepo.full_name}</span>}
                </span>
              </div>
              {!githubToken && (
                <button type="button" onClick={handleConnectGithub} className="btn-strict-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>
                  Connect GitHub
                </button>
              )}
            </div>

            {!githubToken ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: '#555', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                Connect your GitHub account to browse repositories.
              </div>
            ) : loadingRepos ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: '#555', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                Loading repositories...
              </div>
            ) : repos.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ color: '#555', fontFamily: 'var(--font-body)', fontSize: 14, margin: '0 0 16px' }}>No repositories found.</p>
                <button type="button" onClick={handleConnectGithub} className="btn-strict-secondary" style={{ fontSize: 12 }}>
                  Reconnect GitHub
                </button>
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {repos.map((repo, idx) => {
                  const isSelected = selectedRepo?.id === repo.id;
                  return (
                    <div
                      key={repo.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 24px',
                        borderBottom: idx < repos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        background: isSelected ? 'rgba(0,240,255,0.03)' : 'transparent',
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-txt-primary)', fontWeight: 600 }}>
                          {repo.name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555', marginTop: 3 }}>
                          {repo.private ? 'Private' : 'Public'} · {new Date(repo.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRepo(isSelected ? null : repo)}
                        style={{
                          background: isSelected ? 'transparent' : 'var(--color-txt-btn-primary)',
                          color: isSelected ? 'var(--color-txt-muted)' : '#000',
                          border: isSelected ? '1px solid #333' : 'none',
                          borderRadius: 4,
                          padding: '5px 14px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {isSelected ? 'Deselect' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Split-project tip */}
        {mode === 'full' && (
          <div style={{ display: 'flex', gap: 12, background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.12)', borderRadius: 6, padding: '14px 16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-acid)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-muted)', margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--color-acid)' }}>Split project (front + back)?</strong> Create one monitor for your frontend and a second one for your backend. Each gets its own URL check and repo scanner.
            </p>
          </div>
        )}

        {error && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FF1744', background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.2)', borderRadius: 4, padding: '10px 14px' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-strict-primary"
          style={{ height: 48, fontSize: 15, opacity: canSubmit ? 1 : 0.4 }}
        >
          {importing ? 'Creating...' : mode === 'url-only' ? 'Add URL Monitor' : mode === 'repo-only' ? 'Add Repo Scanner' : 'Create Full Monitor'}
        </button>
      </form>
    </div>
  );
}
