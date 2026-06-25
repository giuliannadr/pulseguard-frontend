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
    <div className="flex h-screen bg-[#000000] overflow-hidden relative text-white font-body">
      {/* Strict Orbs */}
      <div className="bg-orb-violet top-[-20%] left-[-10%]" />
      <div className="bg-orb-pink bottom-[-20%] right-[-10%]" />

      {/* Sidebar */}
      <DashboardNav userEmail={email} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10 animate-fade-in flex flex-col">
        <div className="container-strict py-12 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
