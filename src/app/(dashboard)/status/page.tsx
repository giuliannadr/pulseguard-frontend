'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { UptimeBar } from '@/components/ui/UptimeBar';

export default function StatusPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadMonitors = useCallback(async (tok: string) => {
    try {
      const data = await api.monitors.list(tok);
      setMonitors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        loadMonitors(session.access_token);
      } else {
        setLoading(false);
      }
    });
  }, [loadMonitors]);

  const allOperational = monitors.every(m => m.checks?.[0]?.status === 'up');

  return (
    <div className="w-full max-w-4xl mx-auto py-12">
      <div className="text-center mb-16 fade-up">
        <h1 className="font-display text-4xl font-bold mb-4 tracking-tight">System Status</h1>
        <p className="text-[var(--text-muted)] text-lg">Current status of all tracked infrastructure</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 glass-card" />
          <div className="h-24 glass-card" />
        </div>
      ) : (
        <div className="fade-up delay-100">
          <GlassCard className="p-8 mb-12 flex items-center gap-6" style={{ background: allOperational ? 'rgba(142,254,161,0.05)' : 'rgba(255,90,121,0.05)', borderColor: allOperational ? 'rgba(142,254,161,0.2)' : 'rgba(255,90,121,0.2)' }}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_30px_${allOperational ? 'rgba(142,254,161,0.4)' : 'rgba(255,90,121,0.4)'}] ${allOperational ? 'bg-gradient-green' : 'bg-[#FF5A79]'}`}>
              {allOperational ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="#fff" strokeWidth="3" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></svg>
              )}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold mb-2">
                {allOperational ? 'All Systems Operational' : 'Some Systems are Experiencing Issues'}
              </h2>
              <p className="text-[var(--text-muted)]">
                Last updated: {new Date().toLocaleString()}
              </p>
            </div>
          </GlassCard>

          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold mb-6">Services</h3>
            {monitors.map(monitor => {
              const status = monitor.checks?.[0]?.status ?? 'unknown';
              return (
                <GlassCard key={monitor.id} className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <span className="font-display font-bold text-lg">{monitor.name}</span>
                      {monitor.url && <span className="text-[12px] text-[var(--text-muted)] font-mono">{monitor.url}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`status-indicator ${status}`} />
                      <span className={`text-sm font-bold uppercase tracking-widest ${status === 'up' ? 'text-[var(--green-start)]' : status === 'down' ? 'text-[#FF5A79]' : 'text-[#FFDF00]'}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  {monitor.checks && monitor.checks.length > 0 && (
                    <UptimeBar checks={monitor.checks} segments={90} />
                  )}
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
