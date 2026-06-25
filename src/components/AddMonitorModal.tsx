'use client';

import { useState } from 'react';
import { api, type CreateMonitorPayload } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowingButton } from '@/components/ui/GlowingButton';

interface Props {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddMonitorModal({ token, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateMonitorPayload>({
    name: '',
    url: 'https://',
    expectedStatus: 200,
    intervalMinutes: 5,
    expectedText: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: keyof CreateMonitorPayload, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.expectedText) delete payload.expectedText;
      await api.monitors.create(payload, token);
      onCreated();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[480px] glass-panel p-8"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-bold text-2xl text-white">
              New Monitor
            </h2>
            <button 
              onClick={onClose} 
              className="text-[var(--text-muted)] hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Field label="Name">
              <input
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-black/60 transition-all"
                placeholder="My API"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </Field>

            <Field label="URL">
              <input
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-black/60 transition-all"
                placeholder="https://api.example.com/health"
                value={form.url}
                onChange={(e) => update('url', e.target.value)}
                required
                type="url"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Expected Status">
                <input
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-black/60 transition-all"
                  type="number"
                  min={100}
                  max={599}
                  value={form.expectedStatus}
                  onChange={(e) => update('expectedStatus', parseInt(e.target.value))}
                />
              </Field>
              <Field label="Interval (min)">
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-black/60 transition-all cursor-pointer appearance-none"
                  value={form.intervalMinutes}
                  onChange={(e) => update('intervalMinutes', parseInt(e.target.value))}
                >
                  <option value={1} className="bg-[#0A0D14] text-white">1 min</option>
                  <option value={5} className="bg-[#0A0D14] text-white">5 min</option>
                  <option value={10} className="bg-[#0A0D14] text-white">10 min</option>
                  <option value={15} className="bg-[#0A0D14] text-white">15 min</option>
                  <option value={30} className="bg-[#0A0D14] text-white">30 min</option>
                  <option value={60} className="bg-[#0A0D14] text-white">60 min</option>
                </select>
              </Field>
            </div>

            <Field label="Expected text (optional)" hint="Check if response body contains this string">
              <input
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-black/60 transition-all"
                placeholder="ok"
                value={form.expectedText}
                onChange={(e) => update('expectedText', e.target.value)}
              />
            </Field>

            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <p className="text-[13px] text-[#FF5A79] bg-[#FF5A79]/10 border border-[#FF5A79]/20 rounded-lg p-3 mt-1">
                  {error}
                </p>
              </motion.div>
            )}

            <div className="flex gap-3 mt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-3.5 px-4 bg-white/[0.03] border border-white/10 rounded-xl text-white text-[15px] font-medium transition-all hover:bg-white/[0.08] hover:border-white/20"
              >
                Cancel
              </button>
              <GlowingButton 
                type="submit" 
                variant="primary" 
                disabled={loading} 
                className="flex-[2] py-3.5 px-4 justify-center"
              >
                {loading ? 'Creating...' : 'Create Monitor'}
              </GlowingButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[12px] font-medium text-[var(--text-muted)] ml-1 uppercase tracking-widest font-mono">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal font-sans text-white/30">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
