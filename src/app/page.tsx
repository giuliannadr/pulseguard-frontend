'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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

function DashboardMockup() {
  const monitors = [
    { name: 'api.stripe.com',   status: 'up',   ms: 42  },
    { name: 'api.github.com',   status: 'up',   ms: 88  },
    { name: 'payments.corp.io', status: 'down', ms: null },
    { name: 'api.openai.com',   status: 'up',   ms: 124 },
    { name: 'cdn.assets.dev',   status: 'up',   ms: 19  },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 720, margin: '0 auto' }}>

      {/* Floating badge */}
      <div className="pg-floating-badge-left" style={{
        position: 'absolute', left: -20, top: 48, zIndex: 20,
        background: 'white', borderRadius: 16, padding: '10px 14px',
        boxShadow: '0 12px 40px rgba(124,58,237,0.15), 0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid rgba(226,232,240,1)',
        display: 'flex', alignItems: 'center', gap: 10,
        animation: 'pg-float 4s ease-in-out infinite',
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#1F2937' }}>Downtime detected</p>
          <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>payments.corp.io · just now</p>
        </div>
      </div>

      <div className="pg-floating-badge-right" style={{
        position: 'absolute', right: -16, bottom: 72, zIndex: 20,
        background: 'white', borderRadius: 14, padding: '10px 14px',
        boxShadow: '0 12px 40px rgba(124,58,237,0.15), 0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid rgba(226,232,240,1)',
        display: 'flex', alignItems: 'center', gap: 8,
        animation: 'pg-float-delayed 5s ease-in-out 1.5s infinite',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.6)', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#1F2937' }}>99.9% uptime · all systems go</p>
      </div>

      {/* Browser chrome */}
      <div style={{
        borderRadius: 20, overflow: 'hidden',
        border: '1px solid rgba(226,232,240,0.9)',
        background: 'white',
        boxShadow: '0 32px 80px rgba(124,58,237,0.12), 0 8px 24px rgba(0,0,0,0.06)',
      }}>
        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#FF5F57','#FFBD2E','#28C840'].map((c,i)=>(
              <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ flex: 1, margin: '0 12px' }}>
            <div style={{ height: 22, background: 'white', borderRadius: 6, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6, maxWidth: 280, margin: '0 auto' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>app.pulseguard.io/dashboard</span>
            </div>
          </div>
        </div>

        {/* App layout */}
        <div style={{ display: 'flex', height: 360 }}>
          {/* Sidebar */}
          <div className="pg-mockup-sidebar" style={{ width: 172, borderRight: '1px solid #F1F5F9', padding: '16px 10px', display: 'flex', flexDirection: 'column', background: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 8px', marginBottom: 18 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#1F2937' }}>PulseGuard</span>
            </div>
            {['Dashboard','Monitors','Incidents','Settings'].map((item, i) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 2, background: i === 0 ? '#EEE9FF' : 'transparent' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#7C3AED' : '#D1D5DB', flexShrink: 0 }} />
                <div style={{ height: 7, borderRadius: 4, flex: 1, background: i === 0 ? '#2D1B69' : '#E5E7EB', maxWidth: i === 0 ? 60 : 48 }} />
              </div>
            ))}
          </div>

          {/* Main content */}
          <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { val: '5',     label: 'Monitors',   color: '#7C3AED', bg: '#EEE9FF', border: '#DDD6FE' },
                { val: '99.7%', label: 'Avg Uptime', color: '#059669', bg: '#ECFDF5', border: '#D1FAE5' },
                { val: '1',     label: 'Incidents',  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
              ].map(s => (
                <div key={s.label} style={{ borderRadius: 10, padding: '10px', border: `1px solid ${s.border}`, background: s.bg }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 600, color: '#9CA3AF' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Monitor list */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ height: 7, width: 56, borderRadius: 4, background: '#1F2937', marginBottom: 8 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {monitors.map(m => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: '1px solid #F1F5F9', background: 'white' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.status === 'up' ? '#10B981' : '#EF4444', boxShadow: m.status === 'up' ? '0 0 5px rgba(16,185,129,0.5)' : '0 0 5px rgba(239,68,68,0.5)', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#374151', flex: 1, fontFamily: 'monospace' }}>{m.name}</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} style={{ width: 3, height: 12, borderRadius: 1, background: (m.status === 'down' && i === 17) ? '#EF4444' : '#7C3AED', opacity: (m.status === 'down' && i === 17) ? 1 : 0.2 + (i/18)*0.5 }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: m.ms ? '#6B7280' : '#EF4444', fontFamily: 'monospace' }}>{m.ms ? `${m.ms}ms` : 'DOWN'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div style={{ borderRadius: 10, border: '1px solid #F1F5F9', padding: '10px', background: 'white' }}>
              <div style={{ height: 6, width: 72, borderRadius: 3, background: '#1F2937', marginBottom: 8 }} />
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
                {[0.4,0.6,0.3,0.7,0.5,0.8,0.4,0.6,0.9,0.5,0.7,0.4,0.6,0.8,0.5,0.7,0.3,0.6,0.8,0.5,0.7,0.9,0.6,0.4,0.7,0.5,0.8,0.6].map((h,i)=>(
                  <div key={i} style={{ flex: 1, borderRadius: 2, background: 'linear-gradient(180deg,#7C3AED,#2563EB)', opacity: 0.2 + h*0.6, height: `${h*100}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: '⟳', title: 'Every 60 seconds',   desc: 'Checks run every minute. Catch downtime before your users notice.' },
  { icon: '🔒', title: 'SSL Monitoring',     desc: 'Track certificate expiry and get alerted days before they lapse.' },
  { icon: '📊', title: 'Response History',   desc: 'Full charts for every endpoint. Spot patterns, prevent incidents.' },
  { icon: '⚡', title: 'Instant Alerts',     desc: 'Email notifications the moment something goes wrong.' },
  { icon: '🌐', title: 'Public Status Page', desc: 'Share a live status page with your users. Zero setup.' },
  { icon: '🔑', title: 'Security Incidents', desc: 'Detect suspicious logins and unauthorized access in real time.' },
];

const STEPS = [
  { n: '01', title: 'Add your first monitor', desc: 'Enter a URL. Choose a name and check interval. Done in 30 seconds.' },
  { n: '02', title: 'We watch 24/7',           desc: 'PulseGuard pings your endpoint every minute from the cloud.' },
  { n: '03', title: 'Get instant alerts',      desc: 'Downtime? SSL expiry? You get an email before your users notice.' },
];

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
        @keyframes pg-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pg-float-delayed { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pg-blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-15px) scale(1.05)} 66%{transform:translate(-15px,10px) scale(0.97)} }
        @keyframes pg-fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pg-scale { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .pg-reveal { opacity:0; transform:translateY(20px); transition:opacity 0.6s ease-out,transform 0.6s ease-out; }
        .pg-visible { opacity:1; transform:translateY(0); }
        .pg-feature-card:hover { border-color:#DDD6FE !important; box-shadow:0 12px 40px rgba(124,58,237,0.08) !important; transform:translateY(-4px); }
        @media(max-width:900px){.pg-steps-grid{grid-template-columns:1fr !important}.pg-features-grid{grid-template-columns:1fr 1fr !important}}
        @media(max-width:600px){.pg-features-grid{grid-template-columns:1fr !important}}
        
        /* Responsive Overrides */
        @media (max-width: 768px) {
          .pg-navbar {
            padding: 0 16px !important;
          }
          .pg-hero-container {
            padding: 40px 16px 32px !important;
          }
          .pg-section {
            padding: 48px 16px !important;
          }
          .pg-floating-badge-left, .pg-floating-badge-right {
            display: none !important;
          }
          .pg-mockup-sidebar {
            display: none !important;
          }
          .pg-footer {
            padding: 24px 16px !important;
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
        }
        @media (max-width: 480px) {
          .pg-nav-login {
            display: none !important;
          }
        }

      `}</style>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="pg-navbar" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', transition: 'all 0.3s',
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.06)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span style={{ fontWeight: 900, fontSize: 15, color: '#1F2937', letterSpacing: '-0.01em' }}>PulseGuard</span>
        </div>

        <div style={{ display: 'none', alignItems: 'center', gap: 32 }} className="pg-nav-links">
          {[['Características','#features'],['Cómo funciona','#how'],['Alertas','#alerts']].map(([l,h])=>(
            <a key={l} href={h} style={{ fontSize: 14, fontWeight: 500, color: '#6B7280', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e=>(e.currentTarget.style.color='#1F2937')}
              onMouseLeave={e=>(e.currentTarget.style.color='#6B7280')}>{l}</a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/login" className="pg-nav-login" style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#6B7280', textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
          <Link href="/signup" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: 'white', textDecoration: 'none', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="pg-hero-section" style={{ position: 'relative', overflow: 'hidden', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 64 }}>

        {/* Light pastel blobs — igual que Atout */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* Top-left lavender */}
          <div style={{ position: 'absolute', left: '-12%', top: '-15%', width: '55%', height: '65%', background: 'radial-gradient(ellipse,#C4B5FD 0%,transparent 70%)', opacity: 0.55, animation: 'pg-blob 14s ease-in-out infinite' }} />
          {/* Top-right cyan */}
          <div style={{ position: 'absolute', right: '-10%', top: '-10%', width: '50%', height: '55%', background: 'radial-gradient(ellipse,#BAE6FD 0%,transparent 70%)', opacity: 0.5, animation: 'pg-blob 18s ease-in-out 3s infinite' }} />
          {/* Bottom-center peach */}
          <div style={{ position: 'absolute', left: '20%', bottom: '-10%', width: '55%', height: '50%', background: 'radial-gradient(ellipse,#FED7AA 0%,transparent 70%)', opacity: 0.4, animation: 'pg-blob 16s ease-in-out 6s infinite' }} />
          {/* Bottom-right rose */}
          <div style={{ position: 'absolute', right: '-5%', bottom: '5%', width: '40%', height: '45%', background: 'radial-gradient(ellipse,#FBCFE8 0%,transparent 70%)', opacity: 0.35, animation: 'pg-blob 20s ease-in-out 9s infinite' }} />
        </div>

        <div className="pg-hero-container" style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 900, margin: '0 auto', padding: '80px 40px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

          {/* Pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px 6px 10px',
            borderRadius: 100, border: '1px solid rgba(124,58,237,0.15)',
            background: 'white', marginBottom: 32, boxShadow: '0 2px 8px rgba(124,58,237,0.08)',
            animation: 'pg-fade-up 0.6s ease-out both',
          }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Monitoreo de uptime en tiempo real</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(44px,7vw,88px)', fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.035em', color: '#111827', margin: '0 0 20px',
            animation: 'pg-fade-up 0.6s 0.1s ease-out both',
          }}>
            Sabé antes que<br />
            <span style={{ background: 'linear-gradient(135deg,#7C3AED 0%,#2563EB 60%,#0891B2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              tus usuarios.
            </span>
          </h1>

          <p style={{
            fontSize: 18, lineHeight: 1.65, color: '#6B7280',
            maxWidth: 540, margin: '0 0 36px',
            animation: 'pg-fade-up 0.6s 0.2s ease-out both',
          }}>
            PulseGuard vigila tus APIs y sitios web las 24 horas. Recibí alertas instantáneas
            ante caídas, degradación de rendimiento y certificados SSL por vencer.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64, animation: 'pg-fade-up 0.6s 0.3s ease-out both' }}>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 14, fontWeight: 700, fontSize: 15,
              background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: 'white',
              textDecoration: 'none', boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
              transition: 'all 0.2s',
            }}>
              Empezar gratis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <Link href="/status" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 14, fontWeight: 700, fontSize: 15,
              background: 'white', color: '#374151',
              textDecoration: 'none', border: '1px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s',
            }}>
              Ver estado en vivo
            </Link>
          </div>

          {/* Mockup */}
          <div style={{ width: '100%', animation: 'pg-scale 0.7s 0.4s ease-out both' }}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────────── */}
      <section id="how" className="pg-section" style={{ padding: '96px 40px', background: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '-5%', top: 0, width: '35%', height: '100%', background: 'radial-gradient(ellipse,#DDD6FE,transparent 70%)', opacity: 0.35, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '-5%', top: '20%', width: '30%', height: '70%', background: 'radial-gradient(ellipse,#BAE6FD,transparent 70%)', opacity: 0.35, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div ref={r1 as React.RefObject<HTMLDivElement>} className="pg-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 12 }}>Cómo funciona</p>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#1F2937', margin: 0, letterSpacing: '-0.02em' }}>En 3 pasos arrancás</h2>
          </div>

          <div className="pg-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ padding: '32px', borderRadius: 24, background: 'white', border: '1px solid #F1F5F9', transition: 'all 0.3s', cursor: 'default' }}
                onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow='0 12px 40px rgba(124,58,237,0.1)'; d.style.borderColor='#DDD6FE'; d.style.transform='translateY(-4px)'; }}
                onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow='none'; d.style.borderColor='#F1F5F9'; d.style.transform='translateY(0)'; }}>
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
      <section id="features" className="pg-section" style={{ padding: '96px 40px', background: '#FAFBFF', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-5%', top: '-10%', width: '40%', height: '60%', background: 'radial-gradient(ellipse,#EEE9FF,transparent 70%)', opacity: 0.7, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '-5%', bottom: '10%', width: '35%', height: '55%', background: 'radial-gradient(ellipse,#E0F2FE,transparent 70%)', opacity: 0.7, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div ref={r2 as React.RefObject<HTMLDivElement>} className="pg-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 12 }}>Características</p>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#1F2937', margin: '0 0 12px', letterSpacing: '-0.02em' }}>Todo lo que necesitás para estar un paso adelante</h2>
            <p style={{ fontSize: 16, color: '#6B7280', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              Desde chequeos de uptime hasta tracking de SSL, PulseGuard te cubre.
            </p>
          </div>

          <div className="pg-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {FEATURES.map(({ icon, title, desc }, i) => {
              const colors = ['#7C3AED','#0284C7','#059669','#D97706','#DB2777','#6B7280'];
              const bgs    = ['#EEE9FF','#E0F2FE','#ECFDF5','#FEF3C7','#FCE7F3','#F3F4F6'];
              return (
                <div key={title} className="pg-feature-card" style={{ padding: '28px', borderRadius: 20, background: 'white', border: '1px solid #F1F5F9', transition: 'all 0.3s', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
                  <span style={{ position: 'absolute', top: 12, right: 16, fontSize: 64, fontWeight: 900, color: bgs[i%6], lineHeight: 1, userSelect: 'none' }}>
                    {String(i+1).padStart(2,'0')}
                  </span>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: bgs[i%6], display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 20 }}>{icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1F2937', margin: '0 0 6px' }}>{title}</h3>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>{desc}</p>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: colors[i%6], transform: 'scaleX(0)', transformOrigin: 'left', transition: 'transform 0.3s', borderRadius: '0 0 20px 20px' }}
                    className="pg-feature-bar" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────────── */}
      <section className="pg-section" style={{ padding: '100px 40px', position: 'relative', overflow: 'hidden', background: 'white' }}>
        <div style={{ position: 'absolute', left: '10%', top: '-20%', width: '55%', height: '80%', background: 'radial-gradient(ellipse,#C4B5FD,transparent 70%)', opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '-5%', bottom: '-10%', width: '45%', height: '70%', background: 'radial-gradient(ellipse,#BAE6FD,transparent 70%)', opacity: 0.35, pointerEvents: 'none' }} />

        <div ref={r3 as React.RefObject<HTMLDivElement>} className="pg-reveal" style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 24px', background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 'clamp(32px,4vw,54px)', fontWeight: 900, color: '#111827', margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Tu infraestructura,<br />
            <span style={{ background: 'linear-gradient(135deg,#7C3AED,#2563EB,#0891B2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              siempre visible.
            </span>
          </h2>
          <p style={{ fontSize: 16, color: '#6B7280', margin: '0 0 36px', lineHeight: 1.65 }}>
            Agregá monitores en 30 segundos. Sin tarjeta de crédito.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
            <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: 'white', textDecoration: 'none', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
              Empezar gratis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 28px', borderRadius: 14, fontWeight: 700, fontSize: 15, background: 'white', color: '#374151', textDecoration: 'none', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              Iniciar sesión
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Sin tarjeta de crédito', 'Cancelás cuando querés', 'Gratis para empezar'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9CA3AF' }}>
                <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="pg-footer" style={{ borderTop: '1px solid #F1F5F9', padding: '24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#374151' }}>PulseGuard</span>
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Built for AranguriApps Challenge · 2026</span>
      </footer>
    </div>
  );
}
