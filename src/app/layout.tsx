import type { Metadata } from 'next';
import { Bricolage_Grotesque, JetBrains_Mono, DM_Sans } from 'next/font/google';
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
      <body className="min-h-full">
        <TranslationProvider>
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
