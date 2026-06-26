import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#000', fontFamily: 'var(--font-mono)',
    }}>
      <p style={{ fontSize: 10, color: 'var(--color-acid)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        // 404
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 800, color: '#F0F0F0', margin: '0 0 12px', letterSpacing: '-0.04em', lineHeight: 1 }}>
        Not Found
      </h1>
      <p style={{ fontSize: 13, color: '#4A4A4A', margin: '0 0 32px' }}>
        This page doesn&apos;t exist or was moved.
      </p>
      <Link href="/dashboard" style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-acid)',
        border: '1px solid rgba(0,240,255,0.3)', borderRadius: 3,
        padding: '10px 20px', textDecoration: 'none',
        background: 'rgba(0,240,255,0.03)',
      }}>
        ← Back to Dashboard
      </Link>
    </div>
  );
}
