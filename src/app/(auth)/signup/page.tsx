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
      <div className="min-h-dvh flex items-center justify-center p-6 relative">
        <div className="noise-overlay" />
        <div className="text-center fade-up max-w-sm relative z-10">
          <div className="w-16 h-16 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(142,254,161,0.4)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 className="font-display font-bold text-2xl mb-3">Check your inbox</h2>
          <p className="text-[var(--text-muted)] text-sm mb-8 leading-relaxed">
            We sent a confirmation link to <strong className="text-white font-medium">{email}</strong>.
          </p>
          <Link href="/login" className="btn-glass inline-flex">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 relative">
      <div className="noise-overlay" />

      <div className="w-full max-w-[380px] fade-up relative z-10">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-purple rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(199,121,208,0.4)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <h1 className="font-display font-bold text-3xl tracking-tight mb-2">Create Account</h1>
          <p className="text-[var(--text-muted)] text-sm">Join Ethereal and monitor your services</p>
        </div>

        <div className="glass-card p-8">
          <div className="flex flex-col gap-3 mb-6">
            <OAuthButton provider="github" label="Sign up with GitHub" loading={oauthLoading === 'github'} onClick={() => handleOAuth('github')} icon={<GithubIcon />} />
            <OAuthButton provider="google" label="Sign up with Google" loading={oauthLoading === 'google'} onClick={() => handleOAuth('google')} icon={<GoogleIcon />} />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[11px] text-[var(--text-muted)] font-mono uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-2">Email</label>
              <input type="email" className="glass-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-2">Password</label>
              <input type="password" className="glass-input" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            {error && <p className="text-xs text-[#FF5A79] bg-[#FF5A79]/10 border border-[#FF5A79]/20 rounded-md p-3">{error}</p>}
            <button type="submit" className="btn-solid-glow w-full justify-center mt-2 h-[42px]" disabled={loading}>
              {loading ? <Spinner /> : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-[var(--text-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--green-start)] no-underline font-medium hover:text-[var(--green-end)] transition-colors">Sign in</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function OAuthButton({ label, loading, onClick, icon }: { provider: string; label: string; loading: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="flex items-center justify-center gap-3 w-full py-2.5 px-4 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-medium transition-all hover:bg-white/10 hover:border-white/20"
    >
      {loading ? <Spinner /> : icon}
      {label}
    </button>
  );
}

function Spinner() {
  return <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--text-main)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />;
}

function GithubIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>;
}

function GoogleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>;
}
