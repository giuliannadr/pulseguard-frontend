'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden bg-[#05070A]">
      <div className="noise-overlay" />
      
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[var(--green-start)]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-[var(--purple-start)]/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-purple rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(199,121,208,0.4)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">Ethereal</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/status" className="text-[14px] font-medium text-[var(--text-muted)] hover:text-white transition-colors">
            System Status
          </Link>
          <Link href="/login" className="text-[14px] font-medium text-white hover:text-[var(--green-start)] transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="btn-solid-glow px-5 py-2 text-[14px] h-auto">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pt-12 pb-24 text-center max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel mb-8 border border-white/10"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--green-start)] animate-pulse shadow-[0_0_10px_var(--green-start)]" />
          <span className="text-[12px] font-mono tracking-widest uppercase text-[var(--text-muted)]">Monitoring Reimagined</span>
        </motion.div>

        <motion.h1 
          className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--green-start)] to-[var(--cyan)]">Elegant</span> Way<br />
          To Track Uptime.
        </motion.h1>

        <motion.p 
          className="text-lg md:text-xl text-[var(--text-muted)] max-w-2xl mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          Stop relying on clunky, outdated dashboards. Experience the future of infrastructure monitoring with our ultra-premium glassmorphism interface. Real-time alerts, beautiful charts, zero friction.
        </motion.p>

        <motion.div 
          className="flex flex-col sm:flex-row items-center gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/signup" className="btn-solid-glow px-8 py-4 text-[16px] w-full sm:w-auto text-center h-auto">
            Start Monitoring for Free
          </Link>
          <Link href="/status" className="glass-panel px-8 py-4 rounded-xl text-white font-medium text-[16px] w-full sm:w-auto text-center hover:bg-white/5 transition-all">
            View Live Status Page
          </Link>
        </motion.div>
      </main>

      {/* Decorative Dashboard Preview */}
      <motion.div 
        className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-24"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="glass-panel w-full aspect-[21/9] rounded-2xl overflow-hidden relative border-t-white/20">
          <div className="absolute top-0 left-0 right-0 h-12 border-b border-white/5 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5A79]/50" />
            <div className="w-3 h-3 rounded-full bg-[#FFDF00]/50" />
            <div className="w-3 h-3 rounded-full bg-[var(--green-start)]/50" />
          </div>
          <div className="pt-20 px-8 pb-8 flex flex-col gap-4">
            <div className="h-24 glass-card w-full flex items-center p-6 gap-6 opacity-80">
               <div className="w-3 h-3 rounded-full bg-[var(--green-start)] shadow-[0_0_10px_var(--green-start)]" />
               <div className="flex-1">
                 <div className="h-4 w-32 bg-white/20 rounded mb-2" />
                 <div className="h-3 w-48 bg-white/10 rounded" />
               </div>
               <div className="h-8 w-24 bg-white/10 rounded" />
            </div>
            <div className="h-24 glass-card w-full flex items-center p-6 gap-6 opacity-60">
               <div className="w-3 h-3 rounded-full bg-[#FFDF00] shadow-[0_0_10px_#FFDF00]" />
               <div className="flex-1">
                 <div className="h-4 w-40 bg-white/20 rounded mb-2" />
                 <div className="h-3 w-56 bg-white/10 rounded" />
               </div>
               <div className="h-8 w-24 bg-white/10 rounded" />
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#05070A] to-transparent pointer-events-none" />
        </div>
      </motion.div>

    </div>
  );
}
