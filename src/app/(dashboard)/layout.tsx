'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNav from '@/components/DashboardNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
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
        background: '#03050F',
        color: '#666',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        background: '#03050F',
        overflow: 'hidden',
        color: '#F0F0F0',
        fontFamily: 'var(--font-body)',
      }}
    >
      <DashboardNav userEmail={email} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 40px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
