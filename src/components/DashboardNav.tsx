'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function DashboardNav({ userEmail, onCloseMobile }: { userEmail: string | null; onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return;
      api.securityIncidents.listAll(session.access_token).then((data) => {
        const count = data.filter((i: any) => !i.resolved && i.severity !== 'None').length;
        setAlertCount(count);
      }).catch(() => {});
    });
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('pg-theme', next);
  };

  async function handleSignout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const links = [
    {
      href: '/dashboard',
      label: t('nav_projects'),
      badge: 0,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="1"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      ),
    },
    {
      href: '/security',
      label: t('nav_security'),
      badge: alertCount,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
    },
    {
      href: '/playground',
      label: t('nav_playground'),
      badge: 0,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
        </svg>
      ),
    },
    {
      href: '/status',
      label: t('nav_status'),
      badge: 0,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      ),
    },
    {
      href: '/settings',
      label: t('nav_settings'),
      badge: 0,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ),
    },
  ];

  const initial = userEmail ? userEmail[0].toUpperCase() : '?';

  return (
    <nav style={{
      width: 220, height: '100%',
      borderRight: '1px solid var(--color-border-main)',
      background: 'var(--color-bg-sidebar)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      position: 'relative', zIndex: 20,
    }}>

      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--color-border-main)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg,#7C3AED,#2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-txt-primary)', letterSpacing: '-0.01em' }}>
            PulseGuard
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <div style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-txt-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 8px 8px' }}>
          {t('nav_navigation')}
        </p>
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onCloseMobile?.()}
              className={`sidebar-link ${active ? 'active-link' : ''}`}
              style={{
                fontWeight: active ? 600 : 400,
                color: active ? '#7C3AED' : 'var(--color-txt-secondary)',
                background: active ? '#EEE9FF' : 'transparent',
                borderRadius: 10,
                borderLeft: 'none',
                padding: '9px 12px',
              }}
            >
              <span style={{ color: active ? '#7C3AED' : 'var(--color-txt-muted)', flexShrink: 0 }}>{link.icon}</span>
              {link.label}
              {link.badge > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#DC2626', color: 'white',
                  borderRadius: 10, fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  padding: '1px 5px', minWidth: 16, textAlign: 'center', lineHeight: '14px',
                }}>
                  {link.badge > 99 ? '99+' : link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User + actions */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--color-border-main)' }}>

        {/* User card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          borderRadius: 12, background: 'var(--color-bg-card-hover)',
          border: '1px solid var(--color-border-main)', marginBottom: 8,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg,#7C3AED,#2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: 'white',
          }}>
            {initial}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-txt-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
              {t('nav_signedin')}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-txt-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail ?? '—'}
            </div>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8,
            background: 'transparent', border: '1px solid var(--color-border-main)',
            color: 'var(--color-txt-muted)', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', marginBottom: 4, transition: 'all 0.15s', fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.color = '#7C3AED'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-main)'; e.currentTarget.style.color = 'var(--color-txt-muted)'; }}
        >
          {theme === 'dark' ? (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>Light mode</>
          ) : (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>Dark mode</>
          )}
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8,
            background: 'transparent', border: 'none',
            color: 'var(--color-txt-muted)', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', transition: 'color 0.15s', fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#DC2626'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-txt-muted)'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {t('nav_signout')}
        </button>
      </div>
    </nav>
  );
}
