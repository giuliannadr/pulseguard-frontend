'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

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
    <div className="min-h-dvh flex items-center justify-center p-6 relative overflow-hidden bg-[#05070A]">
      <div className="noise-overlay" />
      
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--green-start)]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--purple-start)]/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        className="w-full max-w-[420px] relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-14 h-14 bg-gradient-purple rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(199,121,208,0.5)] mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-white mb-2">Welcome Back</h1>
          <p className="text-[var(--text-muted)] text-[15px]">Sign in to your Ethereal dashboard</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 sm:p-10 relative">
          {/* Subtle inner top highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* OAuth buttons */}
          <div className="flex flex-col gap-3.5 mb-8">
            <OAuthButton
              provider="github"
              label="Continue with GitHub"
              loading={oauthLoading === 'github'}
              onClick={() => handleOAuth('github')}
              icon={<GithubIcon />}
            />
            <OAuthButton
              provider="google"
              label="Continue with Google"
              loading={oauthLoading === 'google'}
              onClick={() => handleOAuth('google')}
              icon={<GoogleIcon />}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em]">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-[var(--text-muted)] ml-1">Email address</label>
              <input 
                type="email" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-black/60 transition-all" 
                placeholder="you@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                autoComplete="email" 
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-[var(--text-muted)] ml-1">Password</label>
              <input 
                type="password" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-black/60 transition-all" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                autoComplete="current-password" 
              />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                <p className="text-[13px] text-[#FF5A79] bg-[#FF5A79]/10 border border-[#FF5A79]/20 rounded-lg p-3 mt-1">
                  {error}
                </p>
              </motion.div>
            )}

            <button type="submit" className="mt-4 w-full bg-gradient-green text-black font-bold text-[15px] py-3.5 rounded-xl shadow-[0_0_30px_rgba(64,201,255,0.3)] hover:shadow-[0_0_40px_rgba(64,201,255,0.5)] hover:-translate-y-0.5 transition-all flex justify-center items-center h-[52px]" disabled={loading}>
              {loading ? <Spinner /> : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-[15px] text-[var(--text-muted)]">
          Don't have an account?{' '}
          <Link href="/signup" className="text-white font-semibold hover:text-[var(--green-start)] transition-colors">Create one now</Link>
        </p>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function OAuthButton({ label, loading, onClick, icon }: { provider: string; label: string; loading: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center justify-center gap-3 w-full py-3.5 px-4 bg-white/[0.03] border border-white/10 rounded-xl text-white text-[15px] font-medium transition-all hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5"
    >
      {loading ? <Spinner /> : icon}
      {label}
    </button>
  );
}

function Spinner() {
  return <span style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block', flexShrink: 0 }} />;
}

function GithubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
