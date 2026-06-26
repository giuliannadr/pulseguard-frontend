'use client';

import Link from 'next/link';

const TICKER_ITEMS = [
  { name: 'api.stripe.com',    status: 'up',   ms: 42  },
  { name: 'api.github.com',    status: 'up',   ms: 88  },
  { name: 'api.openai.com',    status: 'up',   ms: 124 },
  { name: 'payments.corp.io',  status: 'down', ms: null },
  { name: 'cdn.assets.dev',    status: 'up',   ms: 19  },
  { name: 'auth.service.io',   status: 'up',   ms: 67  },
  { name: 'webhook.relay.net', status: 'up',   ms: 203 },
];

const STATUS_COLORS: Record<string, string> = {
  up:   '#00F0FF',
  down: '#FF007F',
};

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#030514',
        color: '#F0F0F0',
        fontFamily: 'var(--font-body)',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Ambient background glows (Nebulas) */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, transparent 70%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />
      <div style={{
        position: 'absolute',
        top: '40%',
        right: '-10%',
        width: '60vw',
        height: '60vw',
        background: 'radial-gradient(circle, rgba(255, 0, 127, 0.1) 0%, transparent 70%)',
        filter: 'blur(120px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* ── Nav ── */}
      <nav
        style={{
          borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
          padding: '0 40px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(3, 5, 20, 0.75)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: 'var(--color-acid)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#030514" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#F0F0F0', letterSpacing: '-0.01em' }}>
            PulseGuard
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/status" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6D7B9B', textDecoration: 'none', padding: '6px 14px', letterSpacing: '0.06em', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#00F0FF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6D7B9B')}
          >
            Status
          </Link>
          <Link href="/login" className="btn-glass" style={{ height: 34, fontSize: 12, padding: '0 16px' }}>
            Sign in
          </Link>
          <Link href="/signup" className="btn-solid-glow" style={{ height: 34, fontSize: 12, padding: '0 16px' }}>
            Get started
          </Link>
        </div>
      </nav>
 
      {/* ── Hero ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', zIndex: 2 }}>
 
        {/* Big headline section */}
        <section
          style={{
            padding: '100px 40px 80px',
            maxWidth: 1120,
            margin: '0 auto',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 400px',
            gap: 80,
            alignItems: 'center',
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0, 240, 255, 0.05) 1.5px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
          className="hero-grid"
        >
          {/* Left */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid rgba(0, 240, 255, 0.25)',
                borderRadius: 2,
                padding: '5px 12px',
                marginBottom: 32,
                background: 'rgba(0, 240, 255, 0.05)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00F0FF', display: 'inline-block', boxShadow: '0 0 8px #00F0FF' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#00F0FF', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Real-time monitoring
              </span>
            </div>
 
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(52px, 6vw, 80px)',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00F0FF 0%, #FF007F 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: '0 0 24px',
                lineHeight: 1.0,
                letterSpacing: '-0.035em',
              }}
            >
              Know before<br />
              your users do.
            </h1>
 
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                color: '#6D7B9B',
                lineHeight: 1.65,
                margin: '0 0 40px',
                maxWidth: 440,
              }}
            >
              PulseGuard watches your APIs and websites 24/7. Get instant alerts on downtime,
              degraded performance, and expiring SSL certificates.
            </p>
 
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/signup" className="btn-solid-glow" style={{ height: 48, fontSize: 13, padding: '0 28px' }}>
                Start monitoring free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              <Link href="/status" className="btn-glass" style={{ height: 48, fontSize: 13, padding: '0 28px' }}>
                View live status
              </Link>
            </div>
 
            {/* Quick stats */}
            <div style={{ display: 'flex', gap: 36, marginTop: 52, paddingTop: 36, borderTop: '1px solid rgba(0, 240, 255, 0.1)' }}>
              {[['1min', 'Check interval'], ['SSL', 'Expiry tracking'], ['∞', 'Check history']].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--color-acid)', marginBottom: 4, textShadow: '0 0 10px rgba(0, 240, 255, 0.2)' }}>{v}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6D7B9B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
 
          {/* Right — mock monitor card */}
          <div
            className="hero-card scanline-overlay glass-card"
            style={{
              background: 'rgba(8, 12, 36, 0.65)',
              border: '1px solid rgba(0, 240, 255, 0.15)',
              borderRadius: 4,
              overflow: 'hidden',
              fontFamily: 'var(--font-mono)',
              padding: 0,
            }}
          >
            {/* Card header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0, 240, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#6D7B9B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>// Live monitors</span>
              <span style={{ fontSize: 10, color: 'var(--color-acid)', letterSpacing: '0.05em', textShadow: '0 0 8px rgba(0, 240, 255, 0.3)' }}>● LIVE</span>
            </div>
 
            {/* Monitor rows */}
            {TICKER_ITEMS.map((item) => (
              <div
                key={item.name}
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid rgba(0, 240, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: item.status === 'down' ? 'rgba(255, 0, 127, 0.03)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: STATUS_COLORS[item.status],
                      boxShadow: `0 0 8px ${STATUS_COLORS[item.status]}`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#F0F0F0' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: 11, color: item.ms ? '#6D7B9B' : '#FF007F', fontWeight: item.ms ? 'normal' : 'bold' }}>
                  {item.ms ? `${item.ms}ms` : 'DOWN'}
                </span>
              </div>
            ))}
 
            {/* Mini uptime bars */}
            <div style={{ padding: '16px 20px', background: 'rgba(3, 5, 20, 0.4)' }}>
              <div style={{ display: 'flex', gap: 2, height: 16 }}>
                {[...Array(40)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: i === 14 || i === 15 ? '#FF007F' : '#00F0FF',
                      boxShadow: i === 14 || i === 15 ? '0 0 4px rgba(255, 0, 127, 0.5)' : '0 0 4px rgba(0, 240, 255, 0.3)',
                      borderRadius: 1,
                      opacity: i === 14 || i === 15 ? 0.9 : 0.7,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 9, color: '#1A244D', letterSpacing: '0.08em' }}>40 checks ago</span>
                <span style={{ fontSize: 9, color: 'var(--color-acid)', letterSpacing: '0.08em', fontWeight: 'bold' }}>99.7% uptime</span>
              </div>
            </div>
          </div>
        </section>
 
        {/* ── Feature strip ── */}
        <section
          style={{
            borderTop: '1px solid rgba(0, 240, 255, 0.15)',
            borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
            background: 'rgba(8, 12, 36, 0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              maxWidth: 1120,
              margin: '0 auto',
              padding: '0 40px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
            }}
            className="features-grid"
          >
            {[
              { icon: '⟳', title: 'Every Minute', desc: 'Checks run as often as every 60 seconds, catching downtime fast.' },
              { icon: '⬡', title: 'SSL Monitoring', desc: 'Track certificate expiry days before they cause issues.' },
              { icon: '⤿', title: 'Response Time', desc: 'Full history charts for every endpoint you monitor.' },
              { icon: '⊡', title: 'Real-time', desc: 'Supabase Realtime pushes updates to your dashboard instantly.' },
            ].map((f, i) => (
              <div
                key={f.title}
                style={{
                  padding: '40px 32px',
                  borderLeft: i > 0 ? '1px solid rgba(0, 240, 255, 0.1)' : 'none',
                }}
                className="feature-cell"
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: '#FF007F', marginBottom: 16, textShadow: '0 0 8px rgba(255, 0, 127, 0.4)' }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#F0F0F0', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                  {f.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6D7B9B', margin: 0, lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
 
        {/* ── CTA ── */}
        <section style={{ padding: '100px 40px', textAlign: 'center', maxWidth: 640, margin: '0 auto', width: '100%', position: 'relative' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16, textShadow: '0 0 8px rgba(255, 0, 127, 0.3)' }}>
            // Free to start
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 4vw, 52px)',
              fontWeight: 800,
              color: '#F0F0F0',
              margin: '0 0 20px',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            Your infrastructure,<br />always visible.
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#6D7B9B', margin: '0 0 36px', lineHeight: 1.65 }}>
            Add monitors in 30 seconds. No credit card required.
          </p>
          <Link href="/signup" className="btn-solid-glow" style={{ height: 52, fontSize: 14, padding: '0 36px' }}>
            Start monitoring — it's free
          </Link>
        </section>
      </main>
 
      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(0, 240, 255, 0.15)', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2, background: 'rgba(3, 5, 20, 0.9)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 18, height: 18, background: 'var(--color-acid)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#030514" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6D7B9B', letterSpacing: '0.06em' }}>PulseGuard</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6D7B9B', letterSpacing: '0.06em' }}>
          Built for AranguriApps Challenge · 2026
        </span>
      </footer>
 
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .hero-card { display: none !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .feature-cell { border-left: none !important; border-top: 1px solid rgba(0, 240, 255, 0.1); border-bottom: 1px solid rgba(0, 240, 255, 0.1); }
          .feature-cell:first-child { border-top: none; }
        }
        @media (max-width: 600px) {
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
