'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNav from '@/components/DashboardNav';
import { ScanProvider } from '@/lib/scan-context';
import { TourProvider, TourSpotlight } from '@/components/Tour';
import { notify } from '@/lib/toast';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace('/login');
        return;
      }

      setEmail(user.email ?? null);
      setReady(true);
      if (!sessionStorage.getItem('pg_welcomed')) {
        sessionStorage.setItem('pg_welcomed', '1');
        setTimeout(() => notify.success(`¡Bienvenido de vuelta, ${user.email?.split('@')[0]}!`), 600);
      }
    }

    checkSession();

    // Re-check whenever auth state changes (logout, token expiry, account deletion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (!ready) {
    return (
      <div style={{
        display: 'flex',
        height: '100dvh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-base)',
        color: 'var(--color-txt-muted)',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <TourProvider>
    <ScanProvider>
    <div className="dashboard-container">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 24, height: 24, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--color-txt-primary)' }}>
            PulseGuard
          </span>
        </Link>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            background: 'transparent', border: 'none', color: 'var(--color-txt-primary)', cursor: 'pointer',
            padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isSidebarOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Backdrop for mobile drawer */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="mobile-backdrop"
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`dashboard-sidebar-wrapper ${isSidebarOpen ? 'drawer-open' : ''}`}>
        <DashboardNav userEmail={email} onCloseMobile={() => setIsSidebarOpen(false)} />
      </div>

      <main className="dashboard-main">
        <div className="dashboard-content">
          {children}
        </div>
      </main>
      <TourSpotlight />
    </div>
    </ScanProvider>
    </TourProvider>
  );
}
