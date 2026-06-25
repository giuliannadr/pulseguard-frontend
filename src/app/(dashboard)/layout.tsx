'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import DashboardNav from '@/components/DashboardNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        background: '#000',
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
