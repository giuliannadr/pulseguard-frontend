'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// ── Reveal hook ───────────────────────────────────────────────────────────────
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('pg-visible'); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ── Dashboard Mockup ──────────────────────────────────────────────────────────
function DashboardMockup() {
  const monitors = [
    { name: 'api.stripe.com',    status: 'up',   ms: 42,  pct: 99.9 },
    { name: 'api.github.com',    status: 'up',   ms: 88,  pct: 99.7 },
    { name: 'payments.corp.io',  status: 'down', ms: null, pct: 97.2 },
    { name: 'api.openai.com',    status: 'up',   ms: 124, pct: 99.5 },
    { name: 'cdn.assets.dev',    status: 'up',   ms: 19,  pct: 100  },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 680, margin: '0 auto' }}>

      {/* Floating badge — alert */}
      <div style={{
        position: 'absolute', left: -40, top: 60, zIndex: 20,
        background: 'white', borderRadius: 16, padding: '12px 16px',
        boxShadow: '0 20px 60px rgba(45,27,105,0.2), 0 4px 16px rgba(0,0,0,0.08)',
        border: '1px solid rgba(241,245,249,1)',
        display: 'flex', alignItems: 'center', gap: 10,
        animation: 'pg-float 4s ease-in-out infinite',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#1F2937' }}>Downtime detected</p>
          <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>payments.corp.io · just now</p>
        </div>
      </div>

      {/* Floating badge — uptime */}
      <div style={{
        position: 'absolute', right: -40, bottom: 80, zIndex: 20,
        background: 'white', borderRadius: 16, padding: '12px 16px',
        boxShadow: '0 20px 60px rgba(45,27,105,0.2), 0 4px 16px rgba(0,0,0,0.08)',
        border: '1px solid rgba(241,245,249,1)',
        display: 'flex', alignItems: 'center', gap: 10,
        animation: 'pg-float-delayed 5s ease-in-out 1.5s infinite',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#1F2937' }}>99.9% uptime</p>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#10B981', marginTop: 2 }}>All systems operational</p>
        </div>
      </div>

      {/* Floating badge — SSL */}
      <div style={{
        position: 'absolute', right: -20, top: 30, zIndex: 20,
        background: 'white', borderRadius: 12, padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(45,27,105,0.15)',
        border: '1px solid rgba(241,245,249,1)',
        animation: 'pg-float 4s ease-in-out 2s infinite',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#374151' }}>SSL valid · 84 days</p>
        </div>
      </div>

      {/* Browser chrome */}
      <div style={{
        borderRadius: 20, overflow: 'hidden',
        border: '1px solid rgba(226,232,240,0.8)',
        background: 'white',
        boxShadow: '0 40px 100px rgba(45,27,105,0.2), 0 8px 32px rgba(0,0,0,0.08)',
      }}>
        {/* Title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          background: 'rgba(248,250,252,0.9)', borderBottom: '1px solid rgba(226,232,240,0.6)',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#FF5F57','#FFBD2E','#28C840'].map((c, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ flex: 1, margin: '0 12px' }}>
            <div style={{
              height: 22, background: 'white', borderRadius: 6, border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6, maxWidth: 300, margin: '0 auto',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>app.pulseguard.io/dashboard</span>
            </div>
          </div>
        </div>

        {/* App layout */}
        <div style={{ display: 'flex', height: 380 }}>
          {/* Sidebar */}
          <div style={{ width: 180, borderRight: '1px solid #F1F5F9', padding: '16px 12px', display: 'flex', flexDirection: 'column', background: 'white' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', marginBottom: 20 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#1F2937' }}>PulseGuard</span>
            </div>

            {[
              { label: 'Dashboard', active: true },
              { label: 'Monitors', active: false },
              { label: 'Incidents', active: false },
              { label: 'Settings', active: false },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                background: item.active ? '#EEE9FF' : 'transparent',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.active ? '#7C3AED' : '#D1D5DB', flexShrink: 0 }} />
                <div style={{ height: 8, borderRadius: 4, flex: 1, background: item.active ? '#2D1B69' : '#E5E7EB', maxWidth: item.active ? 60 : 48 }} />
              </div>
            ))}

            <div style={{ marginTop: 'auto', padding: '8px 10px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#EEE9FF' }} />
              <div>
                <div style={{ height: 6, width: 48, borderRadius: 3, background: '#CBD5E1', marginBottom: 4 }} />
                <div style={{ height: 6, width: 32, borderRadius: 3, background: '#E2E8F0' }} />
              </div>
            </div>
          </div>

          {/* Main */}
          <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { val: '5', label: 'Monitors',  color: '#7C3AED', bg: '#EEE9FF', border: '#DDD6FE' },
                { val: '99.7%', label: 'Avg Uptime', color: '#059669', bg: '#ECFDF5', border: '#D1FAE5' },
                { val: '1', label: 'Incidents', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
              ].map(s => (
                <div key={s.label} style={{ borderRadius: 10, padding: '10px 10px', border: `1px solid ${s.border}`, background: s.bg }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 600, color: '#9CA3AF' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Monitor list */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ height: 8, width: 60, borderRadius: 4, background: '#1F2937' }} />
                <div style={{ height: 8, width: 40, borderRadius: 4, background: '#E2E8F0' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {monitors.map(m => (
                  <div key={m.name} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderRadius: 8, border: '1px solid #F1F5F9', background: 'white',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: m.status === 'up' ? '#10B981' : '#EF4444',
                      boxShadow: m.status === 'up' ? '0 0 6px rgba(16,185,129,0.5)' : '0 0 6px rgba(239,68,68,0.5)',
                    }} />
                    <span style={{ fontSize: 10, color: '#374151', flex: 1, fontFamily: 'monospace' }}>{m.name}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* Mini uptime bars */}
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} style={{
                          width: 3, height: 14, borderRadius: 1,
                          background: (m.status === 'down' && i === 19) ? '#EF4444' : '#10B981',
                          opacity: (m.status === 'down' && i === 19) ? 1 : 0.4 + (i / 20) * 0.6,
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: m.ms ? '#6B7280' : '#EF4444', fontFamily: 'monospace' }}>
                      {m.ms ? `${m.ms}ms` : 'DOWN'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Response time chart placeholder */}
            <div style={{ borderRadius: 10, border: '1px solid #F1F5F9', padding: '10px', background: 'white' }}>
              <div style={{ height: 6, width: 80, borderRadius: 3, background: '#1F2937', marginBottom: 8 }} />
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 48 }}>
                {[0.4,0.6,0.3,0.7,0.5,0.8,0.4,0.6,0.9,0.5,0.7,0.4,0.6,0.8,0.5,0.7,0.3,0.6,0.8,0.5,0.7,0.9,0.6,0.4,0.7,0.5,0.8,0.6].map((h, i) => (
                  <div key={i} style={{
                    flex: 1, borderRadius: 2,
                    background: `linear-gradient(180deg, #7C3AED, #2563EB)`,
                    opacity: 0.3 + h * 0.7,
                    height: `${h * 100}%`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Features data ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '⟳', title: 'Every 60 seconds',    desc: 'Checks run every minute. Catch downtime before your users notice.' },
  { icon: '🔒', title: 'SSL Monitoring',      desc: 'Track certificate expiry and get alerted days before they lapse.' },
  { icon: '📊', title: 'Response History',    desc: 'Full charts for every endpoint. Spot patterns, prevent incidents.' },
  { icon: '⚡', title: 'Instant Alerts',      desc: 'Email notifications the moment something goes wrong. No delays.' },
  { icon: '🌐', title: 'Public Status Page',  desc: 'Share a live status page with your users. Zero setup.' },
  { icon: '🔑', title: 'Security Incidents',  desc: 'Detect suspicious logins and unauthorized access in real time.' },
];

const STEPS = [
  { n: '01', title: 'Add your first monitor', desc: 'Enter a URL. Choose a name and check interval. Done in 30 seconds.' },
  { n: '02', title: 'We watch 24/7',          desc: 'PulseGuard pings your endpoint every minute from the cloud.' },
  { n: '03', title: 'Get instant alerts',     desc: 'Downtime? SSL expiry? You get an email before your users notice.' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const r1 = useReveal<HTMLElement>();
  const r2 = useReveal<HTMLElement>();
  const r3 = useReveal<HTMLElement>();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{ minHeight: '100dvh', overflowX: 'hidden', background: 'white', color: '#1F2937', fontFamily: 'Inter, system-ui, sans-serif' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        @keyframes pg-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pg-float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pg-blob {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(20px,-15px) scale(1.05); }
          66% { transform: translate(-15px,10px) scale(0.97); }
        }
        @keyframes pg-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pg-scale {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .pg-reveal {
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .pg-visible { opacity: 1; transform: translateY(0); }
        .pg-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 14px; font-weight: 700; font-size: 14px;
          background: linear-gradient(135deg,#7C3AED,#2563EB); color: white;
          text-decoration: none; transition: all 0.2s; box-shadow: 0 8px 24px rgba(124,58,237,0.3);
          border: none; cursor: pointer;
        }
        .pg-btn-primary:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(124,58,237,0.4); }
        .pg-btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 14px; font-weight: 700; font-size: 14px;
          background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85);
          border: 1px solid rgba(255,255,255,0.2); text-decoration: none; transition: all 0.2s;
        }
        .pg-btn-ghost:hover { background: rgba(255,255,255,0.15); }
        .pg-feature-card:hover { border-color: #DDD6FE !important; box-shadow: 0 12px 40px rgba(124,58,237,0.08) !important; transform: translateY(-4px); }
        @media (max-width: 900px) {
          .pg-hero-grid { grid-template-columns: 1fr !important; }
          .pg-mockup-wrap { display: none !important; }
          .pg-features-grid { grid-template-columns: 1fr 1fr !important; }
          .pg-steps-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .pg-features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', transition: 'all 0.3s',
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.06)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span style={{ fontWeight: 900, fontSize: 15, color: scrolled ? '#1F2937' : 'white', letterSpacing: '-0.01em' }}>PulseGuard</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/login" style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: scrolled ? '#6B7280' : 'rgba(255,255,255,0.75)', textDecoration: 'none', transition: 'color 0.2s' }}>
            Sign in
          </Link>
          <Link href="/signup" style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'white', color: '#7C3AED', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ── HERO — dark gradient ─────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100dvh', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg,#0F0A1E 0%,#1A0F42 45%,#1e3a8a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Blobs */}
        {[
          { left: '-10%', top: '-20%', w: '55%', h: '65%', c: '#7C3AED', delay: '0s' },
          { left: '58%',  top: '-15%', w: '50%', h: '55%', c: '#2563EB', delay: '3s' },
          { left: '20%',  top: '55%',  w: '55%', h: '55%', c: '#0891B2', delay: '6s' },
        ].map((b, i) => (
          <div key={i} style={{
            position: 'absolute', left: b.left, top: b.top, width: b.w, height: b.h,
            background: b.c, opacity: 0.3, borderRadius: '50%', filter: 'blur(90px)',
            animation: `pg-blob ${12 + i * 4}s ease-in-out ${b.delay} infinite`, pointerEvents: 'none',
          }} />
        ))}

        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1120, margin: '0 auto', padding: '120px 40px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

          {/* Pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
            borderRadius: 100, border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.08)', marginBottom: 28,
            animation: 'pg-fade-up 0.6s ease-out both',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A5F3FC', letterSpacing: '0.06em' }}>Real-time uptime monitoring</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(44px,6vw,80px)', fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.03em', color: '#F8F8FF', margin: '0 0 20px',
            animation: 'pg-fade-up 0.6s 0.1s ease-out both',
          }}>
            Know before<br />
            <span style={{ background: 'linear-gradient(135deg,#C4B5FD 0%,#93C5FD 50%,#67E8F9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              your users do.
            </span>
          </h1>

          <p style={{
            fontSize: 17, lineHeight: 1.65, color: 'rgba(255,255,255,0.55)',
            maxWidth: 520, margin: '0 0 36px',
            animation: 'pg-fade-up 0.6s 0.2s ease-out both',
          }}>
            PulseGuard watches your APIs and websites 24/7. Get instant alerts on downtime,
            degraded performance, and expiring SSL certificates.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 56, animation: 'pg-fade-up 0.6s 0.3s ease-out both' }}>
            <Link href="/signup" className="pg-btn-primary">
              Start monitoring free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <Link href="/status" className="pg-btn-ghost">View live status</Link>
          </div>

          {/* Trust strip */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center', marginBottom: 64, animation: 'pg-fade-up 0.6s 0.4s ease-out both' }}>
            {[
              { icon: '✓', label: 'Free to start' },
              { icon: '✓', label: 'No credit card' },
              { icon: '✓', label: '60s check interval' },
              { icon: '✓', label: 'SSL monitoring' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                <span style={{ color: '#34D399', fontWeight: 700 }}>{icon}</span>
                <span style={{ fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Mockup */}
          <div style={{ width: '100%', animation: 'pg-scale 0.7s 0.4s ease-out both' }}>
            <DashboardMockup />
          </div>
        </div>

        {/* Bottom fade to white */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, transparent, white)', pointerEvents: 'none' }} />
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 40px', background: 'white', position: 'relative', overflow: 'hidden' }}>
        {/* Blobs */}
        <div style={{ position: 'absolute', left: '-5%', top: 0, width: '35%', height: '100%', background: '#DDD6FE', opacity: 0.25, borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '-5%', top: '20%', width: '30%', height: '70%', background: '#BAE6FD', opacity: 0.25, borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div ref={r1 as React.RefObject<HTMLDivElement>} className="pg-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 12 }}>How it works</p>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#1F2937', margin: 0, letterSpacing: '-0.02em' }}>Up and running in 3 steps</h2>
          </div>

          <div className="pg-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ padding: '32px', borderRadius: 24, background: 'white', border: '1px solid #F1F5F9', transition: 'all 0.3s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(124,58,237,0.1)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#DDD6FE'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = '#F1F5F9'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 18, fontWeight: 900, color: 'white' }}>
                  {s.n}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1F2937', margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 40px', background: '#FAFBFF', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-5%', top: '-10%', width: '40%', height: '60%', background: '#EEE9FF', opacity: 0.5, borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '-5%', bottom: '10%', width: '35%', height: '55%', background: '#E0F2FE', opacity: 0.5, borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div ref={r2 as React.RefObject<HTMLDivElement>} className="pg-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 12 }}>Features</p>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#1F2937', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Everything you need to stay ahead
            </h2>
            <p style={{ fontSize: 16, color: '#6B7280', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              From uptime checks to SSL tracking, PulseGuard has you covered.
            </p>
          </div>

          <div className="pg-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {FEATURES.map(({ icon, title, desc }, i) => {
              const colors = ['#7C3AED','#0284C7','#059669','#D97706','#DB2777','#6B7280'];
              const bgs    = ['#EEE9FF','#E0F2FE','#ECFDF5','#FEF3C7','#FCE7F3','#F3F4F6'];
              return (
                <div key={title} className="pg-feature-card" style={{
                  padding: '28px', borderRadius: 20, background: 'white',
                  border: '1px solid #F1F5F9', transition: 'all 0.3s', position: 'relative', overflow: 'hidden',
                }}>
                  <span style={{ position: 'absolute', top: 12, right: 16, fontSize: 64, fontWeight: 900, color: bgs[i % 6], lineHeight: 1, userSelect: 'none' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: bgs[i % 6], display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 20, position: 'relative' }}>
                    {icon}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1F2937', margin: '0 0 6px' }}>{title}</h3>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>{desc}</p>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: colors[i % 6], opacity: 0, transition: 'opacity 0.2s', borderRadius: '0 0 20px 20px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA — dark ──────────────────────────────────────────────────── */}
      <section style={{
        padding: '100px 40px', position: 'relative', overflow: 'hidden', textAlign: 'center',
        background: 'linear-gradient(160deg,#0F0A1E 0%,#1A0F42 50%,#1e3a8a 100%)',
      }}>
        {[
          { left: '-8%', top: '-20%', w: '55%', h: '80%', c: '#7C3AED' },
          { left: '55%', top: '20%',  w: '50%', h: '70%', c: '#2563EB' },
        ].map((b, i) => (
          <div key={i} style={{ position: 'absolute', left: b.left, top: b.top, width: b.w, height: b.h, background: b.c, opacity: 0.25, borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none', animation: `pg-blob ${14 + i * 4}s ease-in-out infinite` }} />
        ))}

        <div ref={r3 as React.RefObject<HTMLDivElement>} className="pg-reveal" style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 24px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 'clamp(32px,4vw,56px)', fontWeight: 900, color: 'white', margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Your infrastructure,<br />
            <span style={{ background: 'linear-gradient(135deg,#C4B5FD,#93C5FD,#67E8F9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              always visible.
            </span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: '0 0 36px', lineHeight: 1.65 }}>
            Add monitors in 30 seconds. No credit card required.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
            <Link href="/signup" className="pg-btn-primary">
              Start monitoring free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <Link href="/login" className="pg-btn-ghost">Sign in</Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
            {['Free to start', 'No credit card', 'Cancel anytime'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                <span style={{ color: '#34D399', fontWeight: 700 }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #F1F5F9', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#374151' }}>PulseGuard</span>
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Built for AranguriApps Challenge · 2026</span>
      </footer>
    </div>
  );
}
