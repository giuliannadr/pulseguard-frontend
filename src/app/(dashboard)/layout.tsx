import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/DashboardNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="flex min-h-dvh relative">
      <div className="noise-overlay" />
      <DashboardNav userEmail={user.email ?? ''} />
      <main className="flex-1 ml-[260px] min-h-dvh relative z-10 p-8">
        <div className="max-w-7xl mx-auto fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
