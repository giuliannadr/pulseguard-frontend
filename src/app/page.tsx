'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden bg-[#000000] text-white font-body">
      {/* Background orbs */}
      <div className="bg-orb-violet top-[-10%] left-[-10%]" />
      <div className="bg-orb-pink top-[30%] right-[-10%]" />

      {/* Strict Nav */}
      <nav className="container-strict h-20 flex items-center justify-between relative z-10 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-violet-primary)] to-[var(--color-pink-primary)] rounded flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">Ethereal</span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="/status" className="text-sm font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">
            System Status
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="btn-strict-secondary h-10 px-4">
              Sign In
            </Link>
            <Link href="/signup" className="btn-strict-primary h-10 px-4">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 py-32 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] mb-8">
          <span className="w-2 h-2 rounded-full bg-[var(--color-pink-primary)] animate-pulse" />
          <span className="text-xs font-mono tracking-widest uppercase text-[var(--color-text-muted)]">Absolute Precision</span>
        </div>

        <h1 className="font-display text-6xl md:text-8xl font-extrabold tracking-tighter text-white mb-8 max-w-4xl leading-tight">
          Monitoring, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-violet-primary)] to-[var(--color-pink-primary)]">Redefined.</span>
        </h1>

        <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mb-12 leading-relaxed">
          Experience the ultimate infrastructure monitoring platform. Built with strict design principles, real-time alerts, and unparalleled elegance.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/signup" className="btn-strict-primary h-14 px-8 text-base">
            Start Monitoring Free
          </Link>
          <Link href="/status" className="btn-strict-secondary h-14 px-8 text-base">
            View Live Status
          </Link>
        </div>
      </main>
    </div>
  );
}
