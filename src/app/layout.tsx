import type { Metadata } from 'next';
import { Bricolage_Grotesque, JetBrains_Mono, DM_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { TranslationProvider } from '@/lib/i18n';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PulseGuard — Precision Uptime & DevSecOps Monitoring',
  description: 'Real-time API and website monitoring. Uptime, SSL, response time. Built for engineers who care.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${bricolage.variable} ${jetbrains.variable} ${dmSans.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('pg-theme') || 'light';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="min-h-full">
        <TranslationProvider>
          {children}
        </TranslationProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-card, #1a1a2e)',
              color: 'var(--color-txt-primary, #f0f0f0)',
              border: '1px solid var(--color-border-main, rgba(255,255,255,0.1))',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '13px',
              borderRadius: '12px',
              backdropFilter: 'blur(16px)',
            },
            classNames: {
              toast: 'pg-toast',
              success: 'pg-toast-success',
              error: 'pg-toast-error',
              warning: 'pg-toast-warning',
              info: 'pg-toast-info',
            },
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
