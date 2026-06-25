'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: '/status',
    label: 'Status Page',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
];

export function DashboardNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const email = userEmail || '';
  const initials = email.charAt(0).toUpperCase();

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[260px] glass-panel rounded-none border-t-0 border-l-0 border-b-0 flex flex-col z-50">
      {/* Logo */}
      <div className="p-8 pb-6 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-purple flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(199,121,208,0.4)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-display font-bold text-xl tracking-tight text-white">Ethereal</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="relative group">
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-white/10 rounded-xl border border-white/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-colors ${active ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-white'}`}>
                <span className={`${active ? 'text-[var(--green-start)]' : 'opacity-70 group-hover:opacity-100 group-hover:text-[var(--green-start)]'} transition-colors`}>
                  {item.icon}
                </span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-6 border-t border-[var(--border)] bg-black/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-gradient-green flex items-center justify-center text-sm font-bold text-black shrink-0 shadow-[0_0_15px_rgba(142,254,161,0.3)]">
            {initials}
          </div>
          <span className="text-sm text-[var(--text-muted)] overflow-hidden text-ellipsis whitespace-nowrap">
            {email}
          </span>
        </div>
        <form action="/auth/signout" method="POST" className="w-full">
          <button type="submit" className="w-full btn-glass justify-center text-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
