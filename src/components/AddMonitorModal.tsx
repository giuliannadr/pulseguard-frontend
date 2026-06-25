'use client';

import { useState } from 'react';
import { api, type CreateMonitorPayload } from '@/lib/api';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[480px] panel-base p-8 animate-fade-in shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-pink-primary)] to-transparent opacity-20" />
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display font-bold text-2xl text-white">
            New Monitor
          </h2>
          <button 
            onClick={onClose} 
            className="text-[var(--color-text-muted)] hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Field label="Name">
            <input
              className="input-strict"
              placeholder="My API"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </Field>

          <Field label="URL">
            <input
              className="input-strict"
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
                className="input-strict"
                type="number"
                min={100}
                max={599}
                value={form.expectedStatus}
                onChange={(e) => update('expectedStatus', parseInt(e.target.value))}
              />
            </Field>
            <Field label="Interval (min)">
              <select
                className="input-strict cursor-pointer appearance-none"
                value={form.intervalMinutes}
                onChange={(e) => update('intervalMinutes', parseInt(e.target.value))}
              >
                <option value={1} className="bg-[#000] text-white">1 min</option>
                <option value={5} className="bg-[#000] text-white">5 min</option>
                <option value={10} className="bg-[#000] text-white">10 min</option>
                <option value={15} className="bg-[#000] text-white">15 min</option>
                <option value={30} className="bg-[#000] text-white">30 min</option>
                <option value={60} className="bg-[#000] text-white">60 min</option>
              </select>
            </Field>
          </div>

          <Field label="Expected text (optional)" hint="Check if response body contains this string">
            <input
              className="input-strict"
              placeholder="ok"
              value={form.expectedText}
              onChange={(e) => update('expectedText', e.target.value)}
            />
          </Field>

          {error && (
            <p className="text-[13px] text-[#ff4444] bg-[rgba(255,0,0,0.1)] border border-[rgba(255,0,0,0.2)] rounded-lg p-3 mt-1 animate-fade-in">
              {error}
            </p>
          )}

          <div className="flex gap-4 mt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-strict-secondary flex-1"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-strict-primary flex-[2]"
            >
              {loading ? 'Creating...' : 'Create Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-widest font-mono">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal font-sans text-white/30">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
