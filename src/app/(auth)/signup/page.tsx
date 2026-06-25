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
      <div className="min-h-dvh flex items-center justify-center p-6 relative bg-[#000000] font-body">
        <div className="bg-orb-violet top-[-10%] left-[-10%]" />
        
        <div className="text-center animate-fade-in max-w-sm relative z-10 panel-base p-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-violet-primary)] to-[var(--color-pink-primary)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,20,147,0.4)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 className="font-display font-bold text-2xl text-white mb-3">Check your inbox</h2>
          <p className="text-[var(--color-text-muted)] text-[15px] mb-8 leading-relaxed">
            We sent a confirmation link to <strong className="text-white font-medium">{email}</strong>.
          </p>
          <Link href="/login" className="btn-strict-secondary w-full">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 relative bg-[#000000] font-body">
      <div className="bg-orb-violet top-[-10%] left-[-10%]" />
      <div className="bg-orb-pink bottom-[-10%] right-[-10%]" />

      <div className="w-full max-w-[400px] relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-gradient-to-br from-[var(--color-violet-primary)] to-[var(--color-pink-primary)] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,20,147,0.3)] mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-white mb-2">Create Account</h1>
          <p className="text-[var(--color-text-muted)] text-sm">Join Ethereal and monitor your services</p>
        </div>

        <div className="panel-base p-8">
          <div className="flex flex-col gap-4 mb-8">
            <button type="button" onClick={() => handleOAuth('github')} disabled={oauthLoading === 'github'} className="btn-strict-secondary w-full">
              Sign up with GitHub
            </button>
            <button type="button" onClick={() => handleOAuth('google')} disabled={oauthLoading === 'google'} className="btn-strict-secondary w-full">
              Sign up with Google
            </button>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono tracking-widest uppercase text-[var(--color-text-muted)]">Email address</label>
              <input type="email" className="input-strict" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono tracking-widest uppercase text-[var(--color-text-muted)]">Password</label>
              <input type="password" className="input-strict" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>

            {error && (
              <p className="text-sm text-[#ff4444] bg-[rgba(255,0,0,0.1)] border border-[rgba(255,0,0,0.2)] rounded-lg p-3">
                {error}
              </p>
            )}

            <button type="submit" className="btn-strict-primary w-full mt-2" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-[var(--color-text-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="text-white font-medium hover:text-[var(--color-pink-primary)] transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
