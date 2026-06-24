import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PulseGuard — API & Uptime Monitor',
  description: 'Monitor your APIs and websites in real-time. Uptime tracking, SSL alerts, and response time analytics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
