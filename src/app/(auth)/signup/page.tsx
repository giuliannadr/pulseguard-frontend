'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [done,         setDone]         = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else setDone(true);
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

  if (done) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)', padding: 32 }}>
        <div style={{ textAlign: 'center', background: 'rgba(8, 12, 36, 0.65)', border: '1px solid rgba(0, 240, 255, 0.15)', borderRadius: 24, padding: '52px 48px', maxWidth: 400, width: '100%', animation: 'pg-fade-in 0.35s ease-out both', backdropFilter: 'blur(12px)' }}>
          <div style={{ width: 48, height: 48, background: 'var(--color-acid)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <polyline points="20 6 9 17 4 12" stroke="var(--color-bg-base)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--color-txt-primary)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Check your inbox
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-2)', margin: '0 0 28px', lineHeight: 1.6 }}>
            Confirmation link sent to{' '}
            <span style={{ color: 'var(--color-acid)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{email}</span>
          </p>
          <Link href="/login" className="btn-glass" style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', borderRadius: 999 }}>
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: 'var(--color-bg-base)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      
      {/* Left brand panel */}
      <div
        className="auth-left-panel"
        style={{
          display: 'none',
          flex: 1,
          background: 'linear-gradient(160deg,#0F0A1E 0%,#1A0F42 50%,#1e3a8a 100%)',
          padding: '52px 56px',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Blobs */}
        {[
          { left: '-15%', top: '-20%', w: '60%', h: '60%', c: '#7C3AED' },
          { left: '50%',  top: '40%',  w: '55%', h: '55%', c: '#2563EB' },
          { left: '10%',  top: '55%',  w: '45%', h: '45%', c: '#0891B2' },
        ].map((b, i) => (
          <div key={i} style={{ position: 'absolute', left: b.left, top: b.top, width: b.w, height: b.h, background: b.c, opacity: 0.28, borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
        ))}

        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 10 }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>PulseGuard</span>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: 42, fontWeight: 900, color: 'white', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Monitor smarter.<br />
            <span style={{ background: 'linear-gradient(135deg,#C4B5FD,#93C5FD,#67E8F9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Sleep better.
            </span>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: '0 0 36px', maxWidth: 360 }}>
            Get instant alerts when your APIs go down, SSL certs expire, or response times spike.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '⟳', label: 'Every-minute uptime checks' },
              { icon: '🔒', label: 'SSL expiry monitoring' },
              { icon: '⚡', label: 'Instant email alerts' },
              { icon: '🌐', label: 'Public status page' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{f.label}</span>
                <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: 20 }}>
          {[['Free', 'to start'], ['60s', 'intervals'], ['SSL', 'tracking']].map(([v, l]) => (
            <div key={v}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'white' }}>{v}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', maxWidth: 480, margin: '0 auto', width: '100%', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48, alignSelf: 'flex-start' }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#1F2937' }}>PulseGuard</span>
        </div>

        <div style={{ width: '100%' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7C3AED', margin: '0 0 8px' }}>New account</p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1F2937', margin: '0 0 32px', letterSpacing: '-0.02em' }}>
            Get started free
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            <OAuthBtn provider="github" label="Sign up with GitHub" loading={oauthLoading === 'github'} onClick={() => handleOAuth('github')} />
            <OAuthBtn provider="google" label="Sign up with Google" loading={oauthLoading === 'google'} onClick={() => handleOAuth('google')} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ fontSize: 11, color: '#9CA3AF', letterSpacing: '0.08em', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</label>
              <input className="input-strict" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ borderRadius: 12 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
              <input className="input-strict" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={{ borderRadius: 12 }} />
            </div>
            {error && (
              <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              marginTop: 4, width: '100%', padding: '14px', borderRadius: 14,
              background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: 'white',
              fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(124,58,237,0.3)', transition: 'opacity 0.2s',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 24 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 700 }}>Sign in</Link>
          </p>
        </div>
      </div>

      <style>{`@media (min-width: 900px) { .auth-left-panel { display: flex !important; } }`}</style>
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
    <button type="button" onClick={onClick} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px', borderRadius: 12, background: 'white', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {icon}
      {label}
    </button>
  );
}
