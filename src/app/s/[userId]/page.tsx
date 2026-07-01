'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { UptimeBar } from '@/components/ui/UptimeBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const REFRESH_INTERVAL = 60_000; // 60s

type PublicMonitor = {
  id: string;
  name: string;
  url: string | null;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  uptime: number | null;
  responseTimeMs: number | null;
  checks: { status: string; checkedAt: string }[];
};

function statusColor(s: string) {
  if (s === 'up') return '#16A34A';
  if (s === 'down') return '#DC2626';
  if (s === 'degraded') return '#D97706';
  return '#9CA3AF';
}
function statusLabel(s: string) {
  if (s === 'up') return 'Operativo';
  if (s === 'down') return 'Caído';
  if (s === 'degraded') return 'Degradado';
  return 'Desconocido';
}

function Bone({ w = '100%', h = 14, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'pub-shimmer 1.4s ease-in-out infinite',
    }} />
  );
}

export default function PublicStatusPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [monitors, setMonitors] = useState<PublicMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const r = await fetch(`${API_URL}/public/status/${userId}`);
      if (!r.ok) throw new Error('Not found');
      const data = await r.json();
      setMonitors(data);
      setLastUpdated(new Date());
      setError('');
    } catch {
      setError('Página de estado no encontrada.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const id = setInterval(() => fetchData(), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  const hasDown = monitors.some(m => m.status === 'down');
  const hasDegraded = monitors.some(m => m.status === 'degraded');

  const overallStatus = monitors.length === 0 ? null
    : hasDown ? 'down'
    : hasDegraded ? 'degraded'
    : 'up';

  const overallLabel = overallStatus === 'up' ? 'Todos los sistemas operativos'
    : overallStatus === 'down' ? 'Interrupción detectada'
    : overallStatus === 'degraded' ? 'Degradación parcial'
    : 'Sin servicios configurados';

  const overallColor = overallStatus === 'up' ? '#16A34A'
    : overallStatus === 'down' ? '#DC2626'
    : overallStatus === 'degraded' ? '#D97706'
    : '#9CA3AF';

  return (
    <div style={{ minHeight: '100dvh', background: '#F8F9FC', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes pub-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pub-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
        @keyframes pub-spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Navbar ── */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#111827', letterSpacing: '-0.02em' }}>PulseGuard</span>
          <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>/ Estado del sistema</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
              Actualizado {lastUpdated.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{ background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#6B7280', cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: refreshing ? 'pub-spin 0.8s linear infinite' : 'none' }}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Actualizar
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── Overall banner ── */}
        {!loading && !error && monitors.length > 0 && (
          <div style={{
            background: '#fff',
            border: `1px solid ${overallColor}40`,
            borderLeft: `4px solid ${overallColor}`,
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${overallColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {overallStatus === 'up' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={overallColor} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={overallColor} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/><circle cx="12" cy="12" r="10"/></svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>{overallLabel}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                {monitors.filter(m => m.status === 'up').length} de {monitors.length} servicios operativos
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: overallColor, animation: overallStatus === 'up' ? 'pub-pulse 2s ease-in-out infinite' : 'none' }} />
              <span style={{ fontSize: 11, color: overallColor, fontWeight: 600, fontFamily: 'monospace' }}>LIVE</span>
            </div>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB', display: 'flex', gap: 12, alignItems: 'center' }}>
              <Bone w={40} h={40} r={20} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Bone w="40%" h={16} />
                <Bone w="20%" h={10} />
              </div>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Bone w="30%" h={14} />
                  <Bone w={60} h={22} r={11} />
                </div>
                <Bone w="100%" h={8} r={4} />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Página no encontrada</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{error}</div>
          </div>
        )}

        {/* ── Services list ── */}
        {!loading && !error && monitors.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'monospace' }}>
              SERVICIOS — {monitors.length} total
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {monitors.map(m => {
                const sc = statusColor(m.status);
                const sl = statusLabel(m.status);
                return (
                  <div key={m.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '18px 22px', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: m.checks.length > 0 ? 14 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ position: 'relative', width: 10, height: 10 }}>
                          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: sc, opacity: m.status === 'up' ? 0.3 : 0, animation: m.status === 'up' ? 'pub-pulse 2s ease-in-out infinite' : 'none' }} />
                          <span style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: sc }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{m.name}</div>
                          {m.url && <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 2 }}>{m.url.replace('https://', '')}</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        {m.uptime != null && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: m.uptime >= 99 ? '#16A34A' : m.uptime >= 95 ? '#D97706' : '#DC2626', fontFamily: 'monospace' }}>{m.uptime}%</div>
                            <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uptime</div>
                          </div>
                        )}
                        {m.responseTimeMs != null && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', fontFamily: 'monospace' }}>{m.responseTimeMs}ms</div>
                            <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resp.</div>
                          </div>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 600, color: sc, background: `${sc}15`, padding: '4px 10px', borderRadius: 20, fontFamily: 'monospace' }}>
                          {sl}
                        </span>
                      </div>
                    </div>
                    {m.checks.length > 0 && (
                      <div>
                        <UptimeBar checks={m.checks as any} segments={90} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace' }}>
                          <span>90 días atrás</span>
                          <span>Hoy</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Footer ── */}
        {!loading && !error && (
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 18, height: 18, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>Impulsado por <strong style={{ color: '#6B7280' }}>PulseGuard</strong></span>
            </div>
            <span style={{ fontSize: 10, color: '#D1D5DB', fontFamily: 'monospace' }}>
              Se actualiza cada 60s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
