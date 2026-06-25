'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
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
          <h1 className="font-display font-bold text-3xl tracking-tight text-white mb-2">Welcome Back</h1>
          <p className="text-[var(--color-text-muted)] text-sm">Sign in to your Ethereal dashboard</p>
        </div>

        <div className="panel-base p-8">
          <div className="flex flex-col gap-4 mb-8">
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={oauthLoading === 'github'}
              className="btn-strict-secondary w-full"
            >
              Continue with GitHub
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={oauthLoading === 'google'}
              className="btn-strict-secondary w-full"
            >
              Continue with Google
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
              <input 
                type="email" 
                className="input-strict" 
                placeholder="you@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono tracking-widest uppercase text-[var(--color-text-muted)]">Password</label>
              <input 
                type="password" 
                className="input-strict" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            {error && (
              <p className="text-sm text-[#ff4444] bg-[rgba(255,0,0,0.1)] border border-[rgba(255,0,0,0.2)] rounded-lg p-3">
                {error}
              </p>
            )}

            <button type="submit" className="btn-strict-primary w-full mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-[var(--color-text-muted)]">
          Don't have an account?{' '}
          <Link href="/signup" className="text-white font-medium hover:text-[var(--color-pink-primary)] transition-colors">Create one</Link>
        </p>
      </div>
    </div>
  );
}
