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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="min-h-dvh grid-bg flex items-center justify-center p-6">
      {/* Ambient glow */}
      <div
        style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="w-full max-w-[380px] fade-up">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div
              style={{
                width: 36,
                height: 36,
                background: 'var(--cyan)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
              }}
            >
              PulseGuard
            </span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Sign in to your monitoring dashboard
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '32px 28px',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 8,
                }}
              >
                Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 8,
                }}
              >
                Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--red)',
                  background: 'rgba(255,59,107,0.08)',
                  border: '1px solid rgba(255,59,107,0.15)',
                  borderRadius: 6,
                  padding: '8px 12px',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(0,0,0,0.3)',
                      borderTopColor: '#000',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          No account yet?{' '}
          <Link
            href="/signup"
            style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 500 }}
          >
            Create one
          </Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
