'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api, type SecurityIncident } from '@/lib/api';
import Link from 'next/link';

// Use same fmtDate function
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SecurityPage() {
  const [incidents, setIncidents] = useState<(SecurityIncident & { monitor: { name: string, url: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const supabase = createClient();

  const loadIncidents = useCallback(async (tok: string) => {
    try {
      const data = await api.securityIncidents.listAll(tok);
      setIncidents(data as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? null;
      setToken(tok);
      if (tok) loadIncidents(tok);
      else setLoading(false);
    });
  }, [loadIncidents]);

  useEffect(() => {
    if (!token) return;
    const channel = supabase
      .channel('security-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_incidents' }, () => {
        loadIncidents(token);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'security_incidents' }, () => {
        loadIncidents(token);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, loadIncidents]);

  async function handleResolve(id: string) {
    if (!token) return;
    try {
      // Optimistic update
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, resolved: true } : i));
      await api.securityIncidents.resolve(id, token);
    } catch (e) {
      console.error(e);
      loadIncidents(token); // revert on error
    }
  }

  const critical = incidents.filter(i => i.severity === 'Critical' && !i.resolved).length;
  const high = incidents.filter(i => i.severity === 'High' && !i.resolved).length;
  const medium = incidents.filter(i => i.severity === 'Medium' && !i.resolved).length;
  const resolved = incidents.filter(i => i.resolved).length;

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-pink-primary)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            // Global
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: '#F0F0F0', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
            Security Operations
          </h1>
        </div>
      </div>

      {/* ── Stat row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 32, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        {[
          { label: 'Critical Risks', value: critical, color: critical > 0 ? '#FF1744' : '#F0F0F0' },
          { label: 'High Risks',     value: high,     color: high > 0 ? '#FFB300' : '#F0F0F0' },
          { label: 'Medium Risks',   value: medium,   color: medium > 0 ? '#F0F0F0' : '#4A4A4A' },
          { label: 'Resolved',       value: resolved, color: '#00E676' },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: '20px 24px',
              background: '#080808',
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: s.color, lineHeight: 1, marginBottom: 6 }}>
              {loading ? '—' : s.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 72, background: '#080808', borderRadius: 3, opacity: 0.5 }} />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 3, padding: '80px 40px', textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#00E676', margin: '0 0 8px' }}>All Clear!</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#4A4A4A', margin: 0 }}>No security incidents have been detected across your projects.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {incidents.map((inc) => (
            <div 
              key={inc.id} 
              style={{ 
                background: '#080808', 
                border: inc.resolved ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${inc.severity === 'Critical' ? '#FF1744' : inc.severity === 'High' ? '#FFB300' : 'var(--color-pink-primary)'}`, 
                borderRadius: 3, 
                padding: '20px 24px',
                opacity: inc.resolved ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: 11, 
                      fontWeight: 700, 
                      color: '#000', 
                      background: inc.resolved ? '#4A4A4A' : inc.severity === 'Critical' ? '#FF1744' : inc.severity === 'High' ? '#FFB300' : 'var(--color-pink-primary)', 
                      padding: '2px 8px', 
                      borderRadius: 2 
                    }}>
                      {inc.severity.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: inc.resolved ? '#888' : '#F0F0F0', fontWeight: 'bold' }}>
                      {inc.riskType}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Project:</span>
                    <Link href={`/monitors/${inc.monitorId}`} style={{ color: 'var(--color-violet-primary)', textDecoration: 'none' }}>
                      {inc.monitor?.name}
                    </Link>
                    <span>•</span>
                    <span>{fmtDate(inc.createdAt)}</span>
                  </div>
                </div>
                
                {!inc.resolved && (
                  <button 
                    onClick={() => handleResolve(inc.id)}
                    style={{ 
                      background: 'transparent', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      color: '#F0F0F0', 
                      padding: '6px 12px', 
                      borderRadius: 3, 
                      fontSize: 11, 
                      fontFamily: 'var(--font-mono)', 
                      cursor: 'pointer' 
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    ✔ Mark as Resolved
                  </button>
                )}
                {inc.resolved && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#00E676' }}>
                    ✓ RESOLVED
                  </span>
                )}
              </div>
              
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: inc.resolved ? '#666' : '#D0D0D0', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                {inc.description}
              </p>
              
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>
                  Recommendation
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: inc.resolved ? '#666' : '#A0A0A0' }}>
                  {inc.recommendation}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: inc.resolved ? '#4A4A4A' : '#8A2BE2' }}>
                  👤 Author: {inc.commitAuthor || 'Unknown'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>
                  Commit: {inc.commitHash.substring(0, 7)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
