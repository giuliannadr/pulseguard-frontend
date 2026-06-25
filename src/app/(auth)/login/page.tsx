'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push('/dashboard'); router.refresh(); }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { 
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === 'github' ? 'repo write:repo_hook read:user' : undefined
      },
    });
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        background: '#000',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Left panel — brand */}
      <div
        style={{
          display: 'none',
          flex: 1,
          background: '#080808',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '60px 64px',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        className="auth-left-panel"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: '#CAFF00', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#F0F0F0' }}>Ethereal</span>
        </div>

        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#CAFF00', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
            // Precision monitoring
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, color: '#F0F0F0', lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0 }}>
            Know when<br />things break<br />before users do.
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 40 }}>
          {[['99.9%', 'avg uptime tracked'], ['<50ms', 'check latency'], ['24/7', 'monitoring']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: '#CAFF00', marginBottom: 4 }}>{v}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', letterSpacing: '0.08em' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
          maxWidth: 480,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Logo (mobile / small) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48, alignSelf: 'flex-start' }}>
          <div style={{ width: 28, height: 28, background: '#CAFF00', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#F0F0F0' }}>Ethereal</span>
        </div>

        <div style={{ width: '100%' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#CAFF00', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            // Auth
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: '#F0F0F0', margin: '0 0 32px', letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>

          {/* OAuth */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            <OAuthBtn provider="github" label="Continue with GitHub" loading={oauthLoading === 'github'} onClick={() => handleOAuth('github')} />
            <OAuthBtn provider="google" label="Continue with Google" loading={oauthLoading === 'google'} onClick={() => handleOAuth('google')} />
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#2A2A2A', letterSpacing: '0.1em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Email
              </label>
              <input
                className="input-strict"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Password
              </label>
              <input
                className="input-strict"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FF1744', background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.2)', borderRadius: 3, padding: '10px 14px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-strict-primary"
              style={{ marginTop: 4, width: '100%' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#4A4A4A', textAlign: 'center', marginTop: 28 }}>
            No account?{' '}
            <Link href="/signup" style={{ color: '#CAFF00', textDecoration: 'none', fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .auth-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function OAuthBtn({ provider, label, loading, onClick }: { provider: string; label: string; loading: boolean; onClick: () => void }) {
  const icon = provider === 'github' ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="btn-strict-secondary"
      style={{ width: '100%', justifyContent: 'center', gap: 10 }}
    >
      {icon}
      {label}
    </button>
  );
}
