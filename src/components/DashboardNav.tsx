'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardNav({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const links = [
    { href: '/dashboard', label: 'Monitors', icon: <MonitorIcon /> },
    { href: '/status', label: 'Status Page', icon: <StatusIcon /> },
  ];

  return (
    <nav className="w-64 h-full border-r border-[var(--color-border-subtle)] bg-[var(--color-surface)]/50 backdrop-blur-3xl flex flex-col relative z-20">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-violet-primary)] to-[var(--color-pink-primary)] flex items-center justify-center shadow-[0_0_12px_rgba(255,20,147,0.3)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-white">Ethereal</span>
        </Link>
      </div>

      <div className="flex-1 px-4 py-2 flex flex-col gap-2">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 h-12 rounded-lg font-medium text-sm transition-all duration-200 ${
                active
                  ? 'bg-[var(--color-border-subtle)] text-white shadow-[inset_2px_0_0_var(--color-pink-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={active ? 'text-[var(--color-pink-primary)]' : 'opacity-70'}>{link.icon}</div>
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
            {userEmail ? userEmail[0].toUpperCase() : 'U'}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs text-[var(--color-text-muted)] font-mono uppercase tracking-widest">Signed in</span>
            <span className="text-sm text-white font-medium truncate">{userEmail ?? 'Loading...'}</span>
          </div>
        </div>
        <button
          onClick={handleSignout}
          className="w-full flex items-center gap-3 px-4 h-10 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </nav>
  );
}

function MonitorIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
}

function StatusIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
}
