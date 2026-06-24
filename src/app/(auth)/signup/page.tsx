'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (done) {
    return (
      <div className="min-h-dvh grid-bg flex items-center justify-center p-6">
        <div className="text-center fade-up max-w-sm">
          <div style={{ width: 56, height: 56, background: 'rgba(16,216,122,0.12)', border: '1px solid rgba(16,216,122,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>Check your inbox</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
          </p>
          <Link href="/login" className="btn-ghost" style={{ display: 'inline-flex', marginTop: 24 }}>Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid-bg flex items-center justify-center p-6">
      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="w-full max-w-[380px] fade-up">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div style={{ width: 36, height: 36, background: 'var(--cyan)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>PulseGuard</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Create your free account</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <OAuthButton provider="github" label="Sign up with GitHub" loading={oauthLoading === 'github'} onClick={() => handleOAuth('github')} icon={<GithubIcon />} />
            <OAuthButton provider="google" label="Sign up with Google" loading={oauthLoading === 'google'} onClick={() => handleOAuth('google')} icon={<GoogleIcon />} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Email</label>
              <input type="email" className="input-field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Password</label>
              <input type="password" className="input-field" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            {error && <p style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(255,59,107,0.08)', border: '1px solid rgba(255,59,107,0.15)', borderRadius: 6, padding: '8px 12px' }}>{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 2 }}>
              {loading ? <Spinner /> : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function OAuthButton({ label, loading, onClick, icon }: { provider: string; label: string; loading: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
    >
      {loading ? <Spinner /> : icon}
      {label}
    </button>
  );
}

function Spinner() {
  return <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />;
}

function GithubIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>;
}

function GoogleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>;
}
