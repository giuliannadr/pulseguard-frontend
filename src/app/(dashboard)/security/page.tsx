'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api, type SecurityIncident } from '@/lib/api';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { notify } from '@/lib/toast';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const SEVERITY_ES: Record<string, string> = {
  Critical: 'Crítico', High: 'Alto', Medium: 'Medio', Low: 'Bajo', None: 'Sin riesgo',
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

type SeverityFilter = 'all' | 'Critical' | 'High' | 'Medium' | 'Low' | 'None' | 'resolved';

export default function SecurityPage() {
  const { t, language } = useTranslation();
  const [incidents, setIncidents] = useState<(SecurityIncident & { monitor: { name: string, url: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [resolvingAll, setResolvingAll] = useState(false);
  const [showNone, setShowNone] = useState(false);

  const supabase = createClient();

  const loadIncidents = useCallback(async (tok: string) => {
    try {
      const data = await api.securityIncidents.listAll(tok);
      setIncidents(data as any);
    } catch (e: any) {
      notify.error('Error al cargar incidentes', e?.message);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_incidents' }, () => loadIncidents(token))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'security_incidents' }, () => loadIncidents(token))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, loadIncidents]);

  async function handleResolve(id: string) {
    if (!token) return;
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, resolved: true } : i));
    try { await api.securityIncidents.resolve(id, token); }
    catch { loadIncidents(token!); }
  }

  async function handleResolveAll() {
    if (!token) return;
    setResolvingAll(true);
    const toResolve = incidents.filter(i => !i.resolved && i.severity !== 'None');
    try {
      await Promise.all(toResolve.map(i => api.securityIncidents.resolve(i.id, token!)));
      await loadIncidents(token);
      notify.success(`${toResolve.length} incidente${toResolve.length !== 1 ? 's' : ''} resuelto${toResolve.length !== 1 ? 's' : ''}`);
    } catch (e: any) {
      notify.error('Error al resolver incidentes', e?.message);
    } finally {
      setResolvingAll(false);
    }
  }

  const critical = incidents.filter(i => i.severity === 'Critical' && !i.resolved).length;
  const high     = incidents.filter(i => i.severity === 'High' && !i.resolved).length;
  const medium   = incidents.filter(i => i.severity === 'Medium' && !i.resolved).length;
  const low      = incidents.filter(i => i.severity === 'Low' && !i.resolved).length;
  const noneCount = incidents.filter(i => i.severity === 'None' && !i.resolved).length;
  const resolved  = incidents.filter(i => i.resolved).length;
  const realIssues = critical + high + medium + low;

  const filtered = incidents.filter(i => {
    if (filter === 'resolved') return i.resolved;
    if (filter === 'all') {
      if (i.resolved) return false;
      if (i.severity === 'None') return showNone;
      return true;
    }
    if (i.resolved) return false;
    return i.severity === filter;
  });

  const FILTERS: { id: SeverityFilter; label: string; count: number; color: string }[] = [
    { id: 'all',      label: 'Activos',   count: realIssues + (showNone ? noneCount : 0), color: 'var(--color-brand-primary)' },
    { id: 'Critical', label: language === 'es' ? 'Críticos' : 'Critical', count: critical, color: '#DC2626' },
    { id: 'High',     label: language === 'es' ? 'Altos' : 'High',        count: high,     color: '#D97706' },
    { id: 'Medium',   label: language === 'es' ? 'Medios' : 'Medium',     count: medium,   color: '#7C3AED' },
    { id: 'Low',      label: language === 'es' ? 'Bajos' : 'Low',         count: low,      color: '#2563EB' },
    { id: 'resolved', label: language === 'es' ? 'Resueltos' : 'Resolved', count: resolved, color: '#16A34A' },
  ];

  const severityBg = (sev: string, resolved: boolean) => {
    if (resolved) return 'rgba(255,255,255,0.6)';
    if (sev === 'Critical') return 'rgba(220,38,38,0.04)';
    if (sev === 'High')     return 'rgba(217,119,6,0.04)';
    if (sev === 'Medium')   return 'rgba(124,58,237,0.04)';
    return 'rgba(255,255,255,0.72)';
  };
  const severityBorder = (sev: string, resolved: boolean) => {
    if (resolved) return '1px solid rgba(255,255,255,0.6)';
    if (sev === 'Critical') return '1px solid rgba(220,38,38,0.25)';
    if (sev === 'High')     return '1px solid rgba(217,119,6,0.25)';
    if (sev === 'Medium')   return '1px solid rgba(124,58,237,0.2)';
    return '1px solid rgba(255,255,255,0.75)';
  };
  const severityColor = (sev: string) => {
    if (sev === 'Critical') return '#DC2626';
    if (sev === 'High')     return '#D97706';
    if (sev === 'Medium')   return '#7C3AED';
    if (sev === 'Low')      return '#2563EB';
    return 'var(--color-txt-muted)';
  };

  if (loading) return <SecuritySkeleton />;

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>
            {t('sec_global')}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--color-txt-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {t('sec_title')}
          </h1>
        </div>
        {realIssues > 0 && (
          <button
            onClick={handleResolveAll}
            disabled={resolvingAll}
            style={{ background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: 'white', border: 'none', borderRadius: 12, padding: '8px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer', opacity: resolvingAll ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {resolvingAll ? 'Resolviendo...' : language === 'es' ? 'Resolver todos' : 'Resolve all'}
          </button>
        )}
      </div>

      {/* ── Stat row ── */}
      <div className="grid-stats-4" style={{ marginBottom: 28 }}>
        {[
          { label: t('sec_critical'), value: critical, color: critical > 0 ? '#DC2626' : 'var(--color-txt-primary)', bg: critical > 0 ? 'rgba(220,38,38,0.06)' : 'rgba(255,255,255,0.72)', border: critical > 0 ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.85)' },
          { label: t('sec_high'),     value: high,     color: high > 0 ? '#D97706' : 'var(--color-txt-primary)',     bg: high > 0 ? 'rgba(217,119,6,0.06)' : 'rgba(255,255,255,0.72)',     border: high > 0 ? 'rgba(217,119,6,0.2)' : 'rgba(255,255,255,0.85)' },
          { label: t('sec_medium'),   value: medium,   color: medium > 0 ? '#7C3AED' : 'var(--color-txt-muted)',    bg: 'rgba(255,255,255,0.72)',                                           border: 'rgba(255,255,255,0.85)' },
          { label: t('sec_resolved'), value: resolved, color: '#16A34A',                                             bg: resolved > 0 ? 'rgba(22,163,74,0.06)' : 'rgba(255,255,255,0.72)', border: resolved > 0 ? 'rgba(22,163,74,0.2)' : 'rgba(255,255,255,0.85)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '24px', background: s.bg, backdropFilter: 'blur(16px)', border: `1px solid ${s.border}`, borderRadius: 20, boxShadow: '0 4px 24px rgba(124,58,237,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.02em' }}>
              {loading ? '—' : s.value}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-txt-muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      {!loading && incidents.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                background: filter === f.id ? f.color : 'rgba(255,255,255,0.7)',
                color: filter === f.id ? 'white' : 'var(--color-txt-secondary)',
                border: `1px solid ${filter === f.id ? f.color : 'rgba(255,255,255,0.85)'}`,
                borderRadius: 20,
                padding: '5px 14px',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s',
              }}
            >
              {f.label}
              {f.count > 0 && (
                <span style={{
                  background: filter === f.id ? 'rgba(255,255,255,0.25)' : f.color,
                  color: filter === f.id ? 'white' : 'white',
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                }}>
                  {f.count}
                </span>
              )}
            </button>
          ))}

          {/* Show/hide None */}
          {(filter === 'all') && noneCount > 0 && (
            <button
              onClick={() => setShowNone(v => !v)}
              style={{
                background: 'transparent',
                color: 'var(--color-txt-muted)',
                border: '1px dashed var(--color-border-main)',
                borderRadius: 20,
                padding: '5px 12px',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              {showNone ? '✕ Ocultar triviales' : `+ ${noneCount} triviales`}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 100, background: 'var(--color-bg-card)', borderRadius: 16, opacity: 0.5 }} />
          ))}
        </div>
      ) : filtered.length === 0 && incidents.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 24, padding: '80px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(124,58,237,0.06)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#16A34A', margin: '0 0 8px' }}>{t('sec_all_clear')}</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-muted)', margin: 0 }}>{t('sec_no_incidents')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-muted)', margin: 0 }}>
            {language === 'es' ? 'Sin incidentes con este filtro.' : 'No incidents match this filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(inc => (
            <div
              key={inc.id}
              style={{
                background: severityBg(inc.severity, inc.resolved),
                backdropFilter: 'blur(16px)',
                border: severityBorder(inc.severity, inc.resolved),
                borderRadius: 20,
                padding: '20px 24px',
                opacity: inc.resolved ? 0.55 : 1,
                transition: 'opacity 0.2s',
                boxShadow: '0 4px 24px rgba(124,58,237,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'white',
                      background: inc.resolved ? 'var(--color-txt-muted)' : severityColor(inc.severity),
                      padding: '2px 10px', borderRadius: 20,
                    }}>
                      {translateSeverity(inc.severity, language).toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: inc.resolved ? 'var(--color-txt-muted)' : 'var(--color-txt-primary)', fontWeight: 700 }}>
                      {translateRiskType(inc.riskType, language)}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Link href={`/monitors/${inc.monitorId}`} style={{ color: 'var(--color-brand-primary)', textDecoration: 'none', fontWeight: 600 }}>
                      {inc.monitor?.name}
                    </Link>
                    <span>•</span>
                    <span>{fmtDate(inc.createdAt)}</span>
                  </div>
                </div>

                {!inc.resolved ? (
                  <button
                    onClick={() => handleResolve(inc.id)}
                    style={{
                      background: 'transparent', border: '1px solid var(--color-border-main)',
                      color: 'var(--color-txt-primary)', padding: '6px 14px', borderRadius: 20,
                      fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.08)'; e.currentTarget.style.borderColor = '#16A34A'; e.currentTarget.style.color = '#16A34A'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-border-main)'; e.currentTarget.style.color = 'var(--color-txt-primary)'; }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {t('btn_resolve')}
                  </button>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {t('sec_resolved_badge')}
                  </span>
                )}
              </div>

              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: inc.resolved ? 'var(--color-txt-muted)' : 'var(--color-txt-secondary)', margin: '0 0 14px', lineHeight: 1.6 }}>
                {inc.description}
              </p>

              <div style={{ background: 'var(--color-bg-card-hover)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--color-border-main)' }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('sec_recommendation')}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: inc.resolved ? 'var(--color-txt-muted)' : 'var(--color-txt-secondary)', lineHeight: 1.5 }}>
                  {inc.recommendation}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: inc.resolved ? 'var(--color-txt-muted)' : 'var(--color-brand-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {t('sec_author')}: {inc.commitAuthor || 'Unknown'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>
                  Commit: {inc.commitHash?.substring(0, 7) ?? '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bone({ w = '100%', h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: 'linear-gradient(90deg, var(--color-bg-card-hover) 25%, var(--color-border-main) 50%, var(--color-bg-card-hover) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
    }} />
  );
}

function SecuritySkeleton() {
  return (
    <div style={{ width: '100%' }}>
      <style>{`@keyframes skeleton-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div style={{ marginBottom: 32 }}>
        <Bone w={100} h={10} r={4} />
        <div style={{ height: 8 }} />
        <Bone w={260} h={28} r={6} />
      </div>
      <div className="grid-stats-4" style={{ marginBottom: 28 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: 20, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Bone w="50%" h={10} r={4} />
            <Bone w="35%" h={28} r={6} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[...Array(5)].map((_, i) => <Bone key={i} w={80} h={32} r={20} />)}
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card" style={{ padding: 20, borderRadius: 20, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              <Bone w={60} h={22} r={6} />
              <Bone w="40%" h={22} r={6} />
            </div>
            <Bone w={80} h={32} r={16} />
          </div>
          <Bone w="90%" h={12} r={4} />
          <Bone w="70%" h={12} r={4} />
          <Bone w="100%" h={48} r={8} />
        </div>
      ))}
    </div>
  );
}
