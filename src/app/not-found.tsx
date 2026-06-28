import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg,#0F0A1E 0%,#1A0F42 50%,#1e3a8a 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Blobs */}
      {[
        { left: '-10%', top: '-20%', w: '50%', h: '60%', c: '#7C3AED' },
        { left: '55%',  top: '30%',  w: '50%', h: '55%', c: '#2563EB' },
      ].map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: b.left, top: b.top, width: b.w, height: b.h, background: b.c, opacity: 0.25, borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span style={{ fontWeight: 900, fontSize: 16, color: 'white' }}>PulseGuard</span>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C4B5FD', margin: '0 0 16px' }}>
          Error 404
        </p>
        <h1 style={{ fontSize: 'clamp(56px,10vw,96px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', margin: '0 0 16px', background: 'linear-gradient(135deg,#C4B5FD,#93C5FD,#67E8F9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          404
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: '0 0 40px', lineHeight: 1.65 }}>
          This page doesn&apos;t exist or was moved.
        </p>
        <Link href="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '14px 28px', borderRadius: 14,
          background: 'white', color: '#2D1B69', fontWeight: 700, fontSize: 14,
          textDecoration: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          transition: 'all 0.2s',
        }}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
