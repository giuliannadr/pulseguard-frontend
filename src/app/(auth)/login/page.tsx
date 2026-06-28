'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'auth_failed') setError('Authentication failed. Please try again.');
    if (err === 'missing_code') setError('Invalid login link. Please try again.');
  }, [searchParams]);

  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push(redirectTo); router.refresh(); }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider);
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    callbackUrl.searchParams.set('redirectTo', redirectTo);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: provider === 'github' ? 'repo write:repo_hook read:user' : undefined,
      },
    });
  }

  return (
    <div style={{ width: '100%' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7C3AED', margin: '0 0 8px' }}>
        Welcome back
      </p>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1F2937', margin: '0 0 32px', letterSpacing: '-0.02em' }}>
        Sign in to PulseGuard
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <OAuthBtn provider="github" label="Continue with GitHub" loading={oauthLoading === 'github'} onClick={() => handleOAuth('github')} />
        <OAuthBtn provider="google" label="Continue with Google" loading={oauthLoading === 'google'} onClick={() => handleOAuth('google')} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
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
          <input className="input-strict" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ borderRadius: 12 }} />
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
          boxShadow: '0 4px 16px rgba(124,58,237,0.3)', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
        }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 24 }}>
        No account?{' '}
        <Link href="/signup" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 700 }}>Create one free</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: 'white', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

      {/* Left panel */}
      <div className="auth-left-panel" style={{
        display: 'none', flex: 1,
        background: 'linear-gradient(160deg,#0F0A1E 0%,#1A0F42 50%,#1e3a8a 100%)',
        padding: '52px 56px', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Blobs */}
        {[
          { left: '-15%', top: '-20%', w: '60%', h: '60%', c: '#7C3AED' },
          { left: '50%',  top: '40%',  w: '55%', h: '55%', c: '#2563EB' },
          { left: '10%',  top: '55%',  w: '45%', h: '45%', c: '#0891B2' },
        ].map((b, i) => (
          <div key={i} style={{ position: 'absolute', left: b.left, top: b.top, width: b.w, height: b.h, background: b.c, opacity: 0.28, borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 10 }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>PulseGuard</span>
        </div>

        {/* Dashboard mockup card */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: 'white', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
            Know before<br />
            <span style={{ background: 'linear-gradient(135deg,#C4B5FD,#93C5FD,#67E8F9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              your users do.
            </span>
          </h2>

          {/* Mini stats card */}
          <div style={{ borderRadius: 20, padding: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>GLOBAL UPTIME</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.12)', padding: '2px 10px', borderRadius: 6 }}>All systems go</span>
            </div>
            <p style={{ margin: 0, fontSize: 44, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.02em' }}>99.98%</p>
            <div style={{ display: 'flex', gap: 3, height: 8, marginTop: 14 }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} style={{ flex: 1, background: i === 18 ? '#EF4444' : '#C4B5FD', opacity: i === 18 ? 1 : 0.5, borderRadius: 2 }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Avg Latency', val: '34ms', color: '#C4B5FD' },
              { label: 'Monitors',   val: '12',   color: '#67E8F9' },
            ].map(s => (
              <div key={s.label} style={{ borderRadius: 14, padding: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</p>
                <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 900, color: s.color }}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
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

        <Suspense fallback={<div style={{ fontSize: 12, color: '#9CA3AF' }}>Loading...</div>}>
          <LoginForm />
        </Suspense>
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
    <button type="button" onClick={onClick} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px', borderRadius: 12, background: 'white', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.15s' }}>
      {icon}
      {label}
    </button>
  );
}
