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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="min-h-dvh grid-bg flex items-center justify-center p-6">
        <div className="text-center fade-up max-w-sm">
          <div
            style={{
              width: 56,
              height: 56,
              background: 'rgba(16,216,122,0.12)',
              border: '1px solid rgba(16,216,122,0.25)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <polyline points="20 6 9 17 4 12" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>
            Check your inbox
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
            Click it to activate your account.
          </p>
          <Link
            href="/login"
            className="btn-ghost"
            style={{ display: 'inline-flex', marginTop: 24 }}
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid-bg flex items-center justify-center p-6">
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
              }}
            >
              PulseGuard
            </span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Create your free account
          </p>
        </div>

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
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <p style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(255,59,107,0.08)', border: '1px solid rgba(255,59,107,0.15)', borderRadius: 6, padding: '8px 12px' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
