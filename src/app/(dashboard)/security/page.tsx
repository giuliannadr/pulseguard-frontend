'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api, type SecurityIncident } from '@/lib/api';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const SEVERITY_ES: Record<string, string> = {
  Critical: 'Crítico',
  High: 'Alto',
  Medium: 'Medio',
  Low: 'Bajo',
  None: 'Ninguno',
};

const RISK_TYPE_ES: Record<string, string> = {
  None: 'Sin riesgo detectado',
};

function translateSeverity(s: string, lang: string) {
  return lang === 'es' ? (SEVERITY_ES[s] ?? s) : s;
}

function translateRiskType(r: string, lang: string) {
  return lang === 'es' ? (RISK_TYPE_ES[r] ?? r) : r;
}

export default function SecurityPage() {
  const { t, language } = useTranslation();
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase.auth.getSession().then(({ data: { session } }) => {
        const tok = session?.access_token ?? null;
        setToken(tok);
        if (tok) loadIncidents(tok);
        else setLoading(false);
      });
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
          <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>
            {t('sec_global')}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--color-txt-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {t('sec_title')}
          </h1>
        </div>
      </div>

      {/* ── Stat row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: t('sec_critical'), value: critical, color: critical > 0 ? '#DC2626' : 'var(--color-txt-primary)', bg: critical > 0 ? 'rgba(220,38,38,0.06)' : 'rgba(255,255,255,0.72)' },
          { label: t('sec_high'),     value: high,     color: high > 0 ? '#D97706' : 'var(--color-txt-primary)', bg: high > 0 ? 'rgba(217,119,6,0.06)' : 'rgba(255,255,255,0.72)' },
          { label: t('sec_medium'),   value: medium,   color: medium > 0 ? 'var(--color-txt-primary)' : 'var(--color-txt-muted)', bg: 'rgba(255,255,255,0.72)' },
          { label: t('sec_resolved'), value: resolved, color: '#16A34A', bg: resolved > 0 ? 'rgba(22,163,74,0.06)' : 'rgba(255,255,255,0.72)' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: '24px',
              background: s.bg,
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.8)',
              borderRadius: 20,
              boxShadow: '0 4px 24px rgba(124,58,237,0.06)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.02em' }}>
              {loading ? '—' : s.value}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-txt-muted)', fontWeight: 500 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 72, background: 'var(--color-bg-card)', borderRadius: 16,opacity: 0.5 }} />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 24, padding: '80px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(124,58,237,0.06)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#16A34A', margin: '0 0 8px' }}>{t('sec_all_clear')}</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-muted)', margin: 0 }}>{t('sec_no_incidents')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {incidents.map((inc) => (
            <div
              key={inc.id}
              style={{
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(16px)',
                border: inc.resolved ? '1px solid rgba(255,255,255,0.6)' : `1px solid ${inc.severity === 'Critical' ? 'rgba(220,38,38,0.3)' : inc.severity === 'High' ? 'rgba(217,119,6,0.3)' : 'rgba(124,58,237,0.3)'}`,
                borderRadius: 20,
                padding: '20px 24px',
                opacity: inc.resolved ? 0.55 : 1,
                transition: 'opacity 0.2s',
                boxShadow: '0 4px 24px rgba(124,58,237,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: 11, 
                      fontWeight: 700, 
                      color: 'white',
                      background: inc.resolved ? 'var(--color-txt-muted)' : inc.severity === 'Critical' ? '#DC2626' : inc.severity === 'High' ? '#D97706' : 'var(--color-brand-primary)', 
                      padding: '2px 8px', 
                      borderRadius: 2 
                    }}>
                      {translateSeverity(inc.severity, language).toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: inc.resolved ? 'var(--color-txt-muted)' : 'var(--color-txt-primary)', fontWeight: 'bold' }}>
                      {translateRiskType(inc.riskType, language)}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{t('dash_project')}:</span>
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
                      border: '1px solid var(--color-border-main)', 
                      color: 'var(--color-txt-primary)', 
                      padding: '6px 12px', 
                      borderRadius: 16,
                      fontSize: 11, 
                      fontFamily: 'var(--font-mono)', 
                      cursor: 'pointer' 
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-border-main)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    ✔ {t('btn_resolve')}
                  </button>
                )}
                {inc.resolved && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#16A34A' }}>
                    ✓ {t('sec_resolved_badge')}
                  </span>
                )}
              </div>
              
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: inc.resolved ? 'var(--color-txt-muted)' : 'var(--color-txt-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                {inc.description}
              </p>
              
              <div style={{ background: 'var(--color-bg-card-hover)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border-main)' }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                  {t('sec_recommendation')}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: inc.resolved ? 'var(--color-txt-muted)' : 'var(--color-txt-secondary)' }}>
                  {inc.recommendation}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: inc.resolved ? 'var(--color-txt-muted)' : 'var(--color-brand-primary)' }}>
                  👤 {t('sec_author')}: {inc.commitAuthor || 'Unknown'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>
                  {language === 'es' ? 'Commit' : 'Commit'}: {inc.commitHash?.substring(0, 7) ?? '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
