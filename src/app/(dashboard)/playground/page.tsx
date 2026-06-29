'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api, githubToken as ghTokenHelper, type Monitor } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useScan } from '@/lib/scan-context';
import type { MonitorStatus } from '@/lib/api';

type Tab = 'api' | 'code' | 'dns' | 'hacking';

function getLastStatus(m: Monitor): MonitorStatus {
  return (m.checks?.[0]?.status as MonitorStatus) ?? 'unknown';
}

export default function PlaygroundPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('api');
  const [token, setToken] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loadingMonitors, setLoadingMonitors] = useState(true);
  const { startScan, scan } = useScan();

  // ── Shared selected monitor (auto-fills URL across all tabs)
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoadingMonitors(false); return; }
      supabase.auth.getSession().then(({ data: { session } }) => {
        const tok = session?.access_token ?? null;
        setToken(tok);
        const freshGToken = session?.provider_token ?? null;
        if (freshGToken) ghTokenHelper.set(freshGToken);
        setGithubToken(freshGToken ?? ghTokenHelper.get());
        if (tok) {
          api.monitors.list(tok)
            .then(data => { setMonitors(data); })
            .catch(() => {})
            .finally(() => setLoadingMonitors(false));
        } else {
          setLoadingMonitors(false);
        }
      });
    });
  }, []);

  // When a monitor is selected, auto-fill tab URLs
  useEffect(() => {
    if (!selectedMonitor) return;
    const url = selectedMonitor.url ?? '';
    if (url) setApiUrl(url);
    if (url) {
      try { setDomainInput(new URL(url).hostname); } catch {}
    }
    if (url) setCustomHackUrl(url);
    // For code tab, switch to repo if monitor has a repo
    if (selectedMonitor.githubRepoUrl) {
      setCodeSourceMode('repo');
      setSelectedRepoId(selectedMonitor.id);
    }
  }, [selectedMonitor]);

  // ── Tab 1: API Auditor
  const [apiUrl, setApiUrl] = useState('https://httpbin.org/get');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiHeaders, setApiHeaders] = useState('{\n  "Accept": "application/json"\n}');
  const [apiBody, setApiBody] = useState('{\n  \n}');
  const [apiResult, setApiResult] = useState<any | null>(null);
  const [apiRunning, setApiRunning] = useState(false);
  const [apiError, setApiError] = useState('');

  // ── Tab 2: Code Auditor
  const [codeSnippet, setCodeSnippet] = useState(
    `// Example Dockerfile snippet\nFROM node:18\nWORKDIR /app\nCOPY . .\nRUN npm install\n# Running as root (Vulnerability)\nCMD ["node", "server.js"]`
  );
  const [codeLanguage, setCodeLanguage] = useState('dockerfile');
  const [codeResult, setCodeResult] = useState<any | null>(null);
  const [codeRunning, setCodeRunning] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [codeSourceMode, setCodeSourceMode] = useState<'paste' | 'repo'>('paste');
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [commitsList, setCommitsList] = useState<any[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [selectedCommitSha, setSelectedCommitSha] = useState('');
  const [fetchingDiff, setFetchingDiff] = useState(false);
  const [patchResult, setPatchResult] = useState<any | null>(null);
  const [patchRunning, setPatchRunning] = useState(false);

  useEffect(() => {
    if (codeSourceMode !== 'repo' || !selectedRepoId || !githubToken) return;
    const mon = monitors.find(m => m.id === selectedRepoId);
    if (!mon?.githubRepoUrl) return;
    const cleanUrl = mon.githubRepoUrl.replace('.git', '');
    const parts = cleanUrl.split('/');
    const repo = parts.pop(); const owner = parts.pop();
    if (!owner || !repo) return;
    setLoadingCommits(true);
    setCommitsList([]); setSelectedCommitSha('');
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, {
      headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' }
    }).then(r => r.json()).then(data => {
      const formatted = data.map((c: any) => ({ sha: c.sha, message: c.commit.message.split('\n')[0], author: c.commit.author.name }));
      setCommitsList(formatted);
      if (formatted.length > 0) setSelectedCommitSha(formatted[0].sha);
    }).catch(() => setCodeError('No se pudieron cargar los commits.')).finally(() => setLoadingCommits(false));
  }, [selectedRepoId, codeSourceMode, githubToken, monitors]);

  useEffect(() => {
    if (codeSourceMode !== 'repo' || !selectedRepoId || !selectedCommitSha || !githubToken) return;
    const mon = monitors.find(m => m.id === selectedRepoId);
    if (!mon?.githubRepoUrl) return;
    const cleanUrl = mon.githubRepoUrl.replace('.git', '');
    const parts = cleanUrl.split('/');
    const repo = parts.pop(); const owner = parts.pop();
    if (!owner || !repo) return;
    setFetchingDiff(true); setCodeError('');
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${selectedCommitSha}`, {
      headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3.diff' }
    }).then(r => r.text()).then(diff => { setCodeSnippet(diff); setCodeLanguage('javascript'); })
      .catch(() => setCodeError('Error al obtener el diff del commit.'))
      .finally(() => setFetchingDiff(false));
  }, [selectedCommitSha, selectedRepoId, codeSourceMode, githubToken, monitors]);

  // ── Tab 3: DNS/SSL
  const [domainInput, setDomainInput] = useState('github.com');
  const [dnsResult, setDnsResult] = useState<any | null>(null);
  const [dnsRunning, setDnsRunning] = useState(false);
  const [dnsError, setDnsError] = useState('');
  const [latencyResult, setLatencyResult] = useState<any | null>(null);
  const [latencyRunning, setLatencyRunning] = useState(false);
  const [latencyError, setLatencyError] = useState('');

  // ── Tab 4: Hacking Simulator
  const [hackTargetMode, setHackTargetMode] = useState<'monitor' | 'custom'>('custom');
  const [selectedMonitorId, setSelectedMonitorId] = useState('');
  const [customHackUrl, setCustomHackUrl] = useState('https://httpbin.org/get');
  const [attackVector, setAttackVector] = useState('sqli');
  const [hackLogs, setHackLogs] = useState<string[]>([]);
  const [hackResult, setHackResult] = useState<any | null>(null);
  const [hackRunning, setHackRunning] = useState(false);
  const [hackError, setHackError] = useState('');

  // ── Handlers ──
  async function handleRunApi() {
    if (!token) return;
    setApiRunning(true); setApiError(''); setApiResult(null);
    let parsedHeaders = {}; let parsedBody = null;
    try { if (apiHeaders.trim()) parsedHeaders = JSON.parse(apiHeaders); }
    catch { setApiError('JSON inválido en Headers'); setApiRunning(false); return; }
    try { if (apiBody.trim() && apiMethod !== 'GET') parsedBody = JSON.parse(apiBody); }
    catch { setApiError('JSON inválido en Body'); setApiRunning(false); return; }
    try {
      const data = await api.playground.testEndpoint({ url: apiUrl, method: apiMethod, headers: parsedHeaders, body: parsedBody }, token);
      setApiResult(data);
    } catch (err: any) { setApiError(err.message || 'Solicitud fallida'); }
    finally { setApiRunning(false); }
  }

  async function handleRunCodeAudit() {
    if (!token) return;
    // Repo mode: scan commits via backend (long-running — use global context so it survives navigation)
    if (codeSourceMode === 'repo' && selectedRepoId && githubToken) {
      const mon = monitors.find(m => m.id === selectedRepoId);
      if (!mon) return;
      const gToken = githubToken;
      const tok = token;
      setCodeRunning(true);
      startScan(async () => {
        try {
          const result = await api.monitors.scanRepo(mon.id, tok, gToken, true);
          return { count: result.count ?? 0 };
        } finally {
          setCodeRunning(false);
          // reload incidents if still on page
          setCodeResult({ findings: [], recommendations: 'Scan completado. Revisá la sección de incidentes del monitor.', severity: 'None' });
        }
      });
      return;
    }
    // Paste mode: inline Gemini audit (fast, stays on page)
    setCodeRunning(true); setCodeError(''); setCodeResult(null); setPatchResult(null);
    try {
      const data = await api.playground.auditCode({ code: codeSnippet, language: codeLanguage }, token);
      setCodeResult(data);
    } catch (err: any) { setCodeError(err.message || 'Auditoría fallida'); }
    finally { setCodeRunning(false); }
  }

  async function handleGenerateCodePatch() {
    if (!token || !codeResult) return;
    setPatchRunning(true); setPatchResult(null);
    try {
      const data = await api.playground.generatePatch({ code: codeSnippet, findings: (codeResult.findings || []).join('\n') + '\n' + (codeResult.recommendations || ''), language: codeLanguage }, token);
      setPatchResult(data);
    } catch (err: any) { alert(err.message || 'Error generando parche'); }
    finally { setPatchRunning(false); }
  }

  async function handleRunDns() {
    if (!token) return;
    setDnsRunning(true); setDnsError(''); setDnsResult(null); setLatencyResult(null); setLatencyError('');
    try {
      const data = await api.playground.inspectDomain({ domain: domainInput }, token);
      setDnsResult(data);
    } catch (err: any) { setDnsError(err.message || 'Error consultando dominio'); }
    finally { setDnsRunning(false); }
  }

  async function handleRunDomainLatency() {
    if (!token) return;
    setLatencyRunning(true); setLatencyError(''); setLatencyResult(null);
    try {
      let targetUrl = domainInput.trim();
      if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
      const data = await api.playground.networkDiagnostics({ url: targetUrl }, token);
      setLatencyResult(data);
    } catch (err: any) { setLatencyError(err.message || 'Error en test de latencia'); }
    finally { setLatencyRunning(false); }
  }

  async function handleRunHacking() {
    if (!token) return;
    setHackRunning(true); setHackError(''); setHackResult(null); setHackLogs([]);
    let targetUrl = '';
    if (hackTargetMode === 'monitor') {
      const mon = monitors.find(m => m.id === selectedMonitorId);
      if (!mon?.url) { setHackError('Monitor sin URL configurada'); setHackRunning(false); return; }
      targetUrl = mon.url;
    } else {
      targetUrl = customHackUrl;
    }
    if (!targetUrl.startsWith('http')) { setHackError('URL debe comenzar con http:// o https://'); setHackRunning(false); return; }

    const addLog = (msg: string, delay: number) => new Promise<void>(res => setTimeout(() => { setHackLogs(prev => [...prev, msg]); res(); }, delay));
    await addLog(`[${new Date().toLocaleTimeString()}] 🚀 Iniciando simulación contra ${targetUrl}...`, 0);
    await addLog(`[${new Date().toLocaleTimeString()}] 📡 Vector configurado: ${attackVector.toUpperCase()}`, 600);
    await addLog(`[${new Date().toLocaleTimeString()}] 🧪 Enviando payloads de prueba...`, 800);
    if (attackVector === 'rate-limit') await addLog(`[${new Date().toLocaleTimeString()}] ⚡ Enviando ráfaga de 5 peticiones concurrentes...`, 500);
    else if (attackVector === 'sqli') await addLog(`[${new Date().toLocaleTimeString()}] 🛠 Enviando parámetros de inyección SQL...`, 500);
    else if (attackVector === 'xss') await addLog(`[${new Date().toLocaleTimeString()}] 🛠 Enviando payloads XSS en query strings...`, 500);
    else await addLog(`[${new Date().toLocaleTimeString()}] 🛠 Sondeando rutas sensibles...`, 500);
    try {
      const data = await api.playground.simulateAttack({ url: targetUrl, attackType: attackVector }, token);
      await addLog(`[${new Date().toLocaleTimeString()}] 📥 Respuestas recibidas. Analizando headers...`, 800);
      await addLog(`[${new Date().toLocaleTimeString()}] 🧠 Ejecutando diagnóstico Gemini AI...`, 800);
      await addLog(`[${new Date().toLocaleTimeString()}] ✅ Análisis completado.`, 1000);
      setHackResult(data);
    } catch (err: any) {
      setHackError(err.message || 'Simulación fallida');
      setHackLogs(prev => [...prev, `[ERROR] ${err.message || 'Error desconocido'}`]);
    } finally { setHackRunning(false); }
  }

  function getSeverityColor(sev: string) {
    switch (sev?.toLowerCase()) {
      case 'critical': return '#FF1744'; case 'high': return '#FF5252';
      case 'medium': return '#FFB300'; case 'low': return '#00E676';
      default: return 'var(--color-acid)';
    }
  }

  function getStatusStyle(isVuln: string) {
    switch (isVuln?.toLowerCase()) {
      case 'yes': return { label: 'VULNERABLE', color: '#FF1744', bg: 'rgba(255,23,68,0.1)', border: '#FF1744' };
      case 'suspected': return { label: 'RIESGO DETECTADO', color: '#FFB300', bg: 'rgba(255,179,0,0.1)', border: '#FFB300' };
      default: return { label: 'SEGURO / PROTEGIDO', color: '#00E676', bg: 'rgba(0,230,118,0.1)', border: '#00E676' };
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--color-bg-base)', border: '1px solid var(--color-border-main)',
    color: 'var(--color-txt-primary)', fontFamily: 'var(--font-mono)', fontSize: 12,
    padding: '0 12px', borderRadius: 8, height: 40,
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9,
    color: 'var(--color-txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
  };

  const TABS: { id: Tab; name: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'api', name: t('play_tab_api'), desc: t('play_tab_api_desc'),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    },
    {
      id: 'code', name: t('play_tab_code'), desc: t('play_tab_code_desc'),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    },
    {
      id: 'dns', name: t('play_tab_dns'), desc: t('play_tab_dns_desc'),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    },
    {
      id: 'hacking', name: t('play_tab_hack'), desc: t('play_tab_hack_desc'),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    },
  ];

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: 'var(--font-body)' }}>
          {t('play_sub')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--color-txt-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          {t('play_title')}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-muted)', margin: 0 }}>
          {t('play_desc')}
        </p>
      </div>

      {/* ── Monitor Quick-Picker ── */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 28, borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-txt-primary)', marginBottom: 2 }}>
              {t('play_pick_project')}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)' }}>
              {t('play_pick_desc')}
            </div>
          </div>
          {selectedMonitor && (
            <button
              onClick={() => setSelectedMonitor(null)}
              style={{ background: 'transparent', border: '1px solid var(--color-border-main)', borderRadius: 8, padding: '4px 10px', color: 'var(--color-txt-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer' }}
            >
              ✕ Deseleccionar
            </button>
          )}
        </div>

        {loadingMonitors ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>Cargando monitores...</div>
        ) : monitors.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>{t('play_no_monitors')}</div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {monitors.map(m => {
              const status = getLastStatus(m);
              const isSelected = selectedMonitor?.id === m.id;
              const statusColor = status === 'up' ? '#16A34A' : status === 'down' ? '#DC2626' : '#D97706';
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMonitor(isSelected ? null : m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 12,
                    background: isSelected ? 'var(--color-brand-light)' : 'var(--color-bg-card-hover)',
                    border: `1px solid ${isSelected ? 'var(--color-brand-mid)' : 'var(--color-border-main)'}`,
                    color: isSelected ? 'var(--color-brand-primary)' : 'var(--color-txt-primary)',
                    cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                  {m.name}
                  {m.checks?.[0]?.responseTimeMs != null && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: isSelected ? 'var(--color-brand-primary)' : 'var(--color-txt-muted)', opacity: 0.8 }}>
                      {m.checks[0].responseTimeMs}ms
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selectedMonitor && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status={getLastStatus(selectedMonitor)} showPulse />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-brand-primary)', fontWeight: 600 }}>
              {t('play_analyzing')}: {selectedMonitor.name}
            </span>
            {selectedMonitor.url && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)' }}>
                — {selectedMonitor.url.replace('https://', '').replace('http://', '')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '10px 16px', borderRadius: 14,
              background: activeTab === tab.id ? 'var(--color-brand-light)' : 'rgba(255,255,255,0.6)',
              border: activeTab === tab.id ? '1px solid var(--color-brand-mid)' : '1px solid var(--color-border-main)',
              color: activeTab === tab.id ? 'var(--color-brand-primary)' : 'var(--color-txt-secondary)',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              minWidth: 140,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
              {tab.icon}
              {tab.name}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: activeTab === tab.id ? 'var(--color-brand-primary)' : 'var(--color-txt-muted)', opacity: 0.8, lineHeight: 1.3 }}>
              {tab.desc}
            </div>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ minHeight: 400 }}>

        {/* ─── Tab 1: API Auditor ─── */}
        {activeTab === 'api' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }} className="playground-grid">
            <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-txt-primary)', margin: 0 }}>
                  {t('play_tab_api')}
                </h3>
                {selectedMonitor?.url && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-brand-primary)', background: 'var(--color-brand-light)', padding: '2px 8px', borderRadius: 6 }}>
                    {selectedMonitor.name}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ ...labelStyle, marginBottom: 0 }}>{t('play_load_preset')}</span>
                {[
                  { label: 'Public IP', url: 'https://api.ipify.org?format=json', method: 'GET', headers: '{\n  "Accept": "application/json"\n}' },
                  { label: 'HTTPBin POST', url: 'https://httpbin.org/post', method: 'POST', headers: '{\n  "Content-Type": "application/json"\n}' },
                  { label: 'GitHub API', url: 'https://api.github.com/users/octocat', method: 'GET', headers: '{\n  "User-Agent": "PulseGuard"\n}' },
                ].map(p => (
                  <button key={p.label} onClick={() => { setApiUrl(p.url); setApiMethod(p.method); setApiHeaders(p.headers); }}
                    style={{ background: 'var(--color-bg-card-hover)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: '4px 8px', color: 'var(--color-brand-primary)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}>
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={apiMethod} onChange={e => setApiMethod(e.target.value)}
                  style={{ ...inputStyle, width: 90, flex: 'none', fontWeight: 700, color: apiMethod === 'GET' ? '#16A34A' : apiMethod === 'DELETE' ? '#DC2626' : '#D97706' }}>
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                </select>
                <input type="text" value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                  placeholder="https://api.tudominio.com/endpoint" style={{ ...inputStyle, flex: 1 }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Headers (JSON)</label>
                <textarea value={apiHeaders} onChange={e => setApiHeaders(e.target.value)} rows={3}
                  style={{ ...inputStyle, height: 'auto', padding: 10, resize: 'vertical' }} />
              </div>

              {apiMethod !== 'GET' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Body (JSON)</label>
                  <textarea value={apiBody} onChange={e => setApiBody(e.target.value)} rows={3}
                    style={{ ...inputStyle, height: 'auto', padding: 10, resize: 'vertical' }} />
                </div>
              )}

              {apiError && <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid #DC2626', borderRadius: 8, color: '#DC2626', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 16 }}>⚠ {apiError}</div>}

              <button onClick={handleRunApi} disabled={apiRunning} className="btn-solid-glow" style={{ width: '100%', height: 42, fontSize: 13, borderRadius: 12, justifyContent: 'center' }}>
                {apiRunning ? t('play_running_api') : t('play_run_api')}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {apiResult ? (
                <>
                  <div style={{ background: 'var(--color-bg-card)', border: `2px solid ${getSeverityColor(apiResult.audit.overallRisk)}`, borderRadius: 20, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#fff', background: getSeverityColor(apiResult.audit.overallRisk), padding: '3px 10px', borderRadius: 6 }}>
                        {apiResult.audit.overallRisk.toUpperCase()}
                      </span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-txt-primary)' }}>Gemini AI API Audit</span>
                    </div>
                    <p style={{ ...labelStyle }}>Hallazgos</p>
                    {apiResult.audit.findings?.length > 0 ? (
                      <ul style={{ margin: '0 0 14px', paddingLeft: 16, color: 'var(--color-txt-secondary)', fontSize: 12, lineHeight: 1.6 }}>
                        {apiResult.audit.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                      </ul>
                    ) : <p style={{ color: '#16A34A', fontSize: 12, margin: '0 0 14px' }}>✓ Sin vulnerabilidades detectadas en headers o respuesta.</p>}
                    <p style={{ ...labelStyle }}>Recomendaciones</p>
                    <p style={{ margin: 0, color: 'var(--color-txt-muted)', fontSize: 11, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{apiResult.audit.recommendation}</p>
                  </div>

                  <div className="glass-card" style={{ padding: 20, borderRadius: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center', marginBottom: 16 }}>
                      {[
                        { label: 'Status', value: apiResult.status, color: apiResult.status >= 200 && apiResult.status < 300 ? '#16A34A' : '#DC2626' },
                        { label: 'Latencia', value: `${apiResult.latencyMs}ms`, color: 'var(--color-brand-primary)' },
                        { label: 'Tamaño', value: `${JSON.stringify(apiResult.responseBody).length}B`, color: 'var(--color-txt-primary)' },
                      ].map(s => (
                        <div key={s.label} style={{ borderRight: s.label !== 'Tamaño' ? '1px solid var(--color-border-main)' : 'none' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <details style={{ marginBottom: 8 }}>
                      <summary style={{ fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', color: 'var(--color-txt-secondary)', padding: '4px 0' }}>
                        Response Headers ({Object.keys(apiResult.responseHeaders).length})
                      </summary>
                      <pre style={{ margin: '8px 0 0', padding: 10, background: 'var(--color-bg-card-hover)', borderRadius: 8, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-txt-secondary)', overflowX: 'auto' }}>
                        {JSON.stringify(apiResult.responseHeaders, null, 2)}
                      </pre>
                    </details>
                    <details>
                      <summary style={{ fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', color: 'var(--color-txt-secondary)', padding: '4px 0' }}>
                        Response Body
                      </summary>
                      <pre style={{ margin: '8px 0 0', padding: 10, background: 'var(--color-bg-card-hover)', borderRadius: 8, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-txt-secondary)', overflowX: 'auto', maxHeight: 180, overflowY: 'auto' }}>
                        {typeof apiResult.responseBody === 'object' ? JSON.stringify(apiResult.responseBody, null, 2) : String(apiResult.responseBody)}
                      </pre>
                    </details>
                  </div>
                </>
              ) : (
                <EmptyResult icon="wave" text={t('play_results_empty')} />
              )}
            </div>
          </div>
        )}

        {/* ─── Tab 2: Code Auditor ─── */}
        {activeTab === 'code' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }} className="playground-grid">
            <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-txt-primary)', margin: 0 }}>{t('play_tab_code')}</h3>
                {selectedMonitor?.githubRepoUrl && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-brand-primary)', background: 'var(--color-brand-light)', padding: '2px 8px', borderRadius: 6 }}>
                    {selectedMonitor.name}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ ...labelStyle, marginBottom: 0 }}>{t('play_load_preset')}</span>
                {[
                  { label: 'Dockerfile inseguro', lang: 'dockerfile', code: 'FROM ubuntu:latest\nRUN apt-get update && apt-get install -y curl\nUSER root\nCMD ["bash"]' },
                  { label: 'SQL Injection', lang: 'javascript', code: 'app.get("/users", (req, res) => {\n  const sql = "SELECT * FROM users WHERE name = \'" + req.query.name + "\'";\n  client.query(sql, (err, result) => res.json(result.rows));\n});' },
                  { label: 'Deps vulnerables', lang: 'dependencies', code: '{\n  "dependencies": {\n    "express": "^4.16.0",\n    "lodash": "4.17.4"\n  }\n}' },
                ].map(p => (
                  <button key={p.label} onClick={() => { setCodeLanguage(p.lang); setCodeSnippet(p.code); setCodeSourceMode('paste'); }}
                    style={{ background: 'var(--color-bg-card-hover)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: '4px 8px', color: 'var(--color-brand-primary)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}>
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  { id: 'paste', label: t('play_paste_code') },
                  { id: 'repo', label: t('play_select_repo') },
                ].map(m => (
                  <button key={m.id} onClick={() => {
                    setCodeSourceMode(m.id as 'paste' | 'repo');
                    if (m.id === 'repo' && monitors.length > 0 && !selectedRepoId) {
                      const first = monitors.find(mon => mon.githubRepoUrl);
                      if (first) setSelectedRepoId(first.id);
                    }
                  }}
                    style={{ flex: 1, height: 34, background: codeSourceMode === m.id ? 'var(--color-brand-light)' : 'transparent', border: `1px solid ${codeSourceMode === m.id ? 'var(--color-brand-mid)' : 'var(--color-border-main)'}`, color: codeSourceMode === m.id ? 'var(--color-brand-primary)' : 'var(--color-txt-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, borderRadius: 8, cursor: 'pointer' }}>
                    {m.label}
                  </button>
                ))}
              </div>

              {codeSourceMode === 'repo' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Repositorio</label>
                    <select value={selectedRepoId} onChange={e => setSelectedRepoId(e.target.value)} style={inputStyle}>
                      {monitors.filter(m => m.githubRepoUrl).length === 0
                        ? <option>Sin repos conectados</option>
                        : monitors.filter(m => m.githubRepoUrl).map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                      }
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Commit</label>
                    <select value={selectedCommitSha} onChange={e => setSelectedCommitSha(e.target.value)} disabled={loadingCommits || commitsList.length === 0} style={inputStyle}>
                      {loadingCommits ? <option>Cargando...</option>
                        : commitsList.length === 0 ? <option>Sin commits</option>
                        : commitsList.map(c => <option key={c.sha} value={c.sha}>{c.sha.substring(0, 7)} — {c.message}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {codeSourceMode === 'paste' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Tipo de código</label>
                  <select value={codeLanguage} onChange={e => setCodeLanguage(e.target.value)} style={inputStyle}>
                    <option value="javascript">JavaScript / TypeScript</option>
                    <option value="dockerfile">Dockerfile</option>
                    <option value="dependencies">Dependencias (package.json, requirements.txt)</option>
                    <option value="yaml">Config (Kubernetes, docker-compose)</option>
                    <option value="shell">Shell script</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{codeSourceMode === 'repo' ? 'Diff del commit (cargado automáticamente)' : 'Código a auditar'}</label>
                {fetchingDiff ? (
                  <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)', border: '1px solid var(--color-border-main)', borderRadius: 8, color: 'var(--color-txt-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    Obteniendo diff de GitHub...
                  </div>
                ) : (
                  <textarea value={codeSnippet} onChange={e => setCodeSnippet(e.target.value)} rows={10}
                    style={{ ...inputStyle, height: 'auto', padding: 10, resize: 'vertical', lineHeight: 1.5 }} />
                )}
              </div>

              {codeError && <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid #DC2626', borderRadius: 8, color: '#DC2626', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 16 }}>⚠ {codeError}</div>}

              <button onClick={handleRunCodeAudit} disabled={codeRunning} className="btn-solid-glow" style={{ width: '100%', height: 42, fontSize: 13, borderRadius: 12, justifyContent: 'center' }}>
                {codeRunning ? t('play_running_code') : t('play_run_code')}
              </button>
            </div>

            <div>
              {scan.status === 'scanning' && codeSourceMode === 'repo' && (
                <div style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: 16, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D97706', flexShrink: 0, animation: 'pg-pulse 1.2s ease-in-out infinite' }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#D97706', fontWeight: 700 }}>Analizando commits con Gemini IA...</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)', marginTop: 3 }}>Podés navegar a otra sección — el análisis continúa en segundo plano.</div>
                  </div>
                </div>
              )}
              {codeResult ? (
                <div style={{ background: 'var(--color-bg-card)', border: `2px solid ${getSeverityColor(codeResult.severity)}`, borderRadius: 20, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#fff', background: getSeverityColor(codeResult.severity), padding: '3px 10px', borderRadius: 6 }}>
                      {codeResult.severity.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-txt-primary)' }}>Static Code Audit</span>
                  </div>

                  <p style={labelStyle}>Hallazgos de seguridad</p>
                  {codeResult.findings?.length > 0 ? (
                    <ul style={{ margin: '0 0 16px', paddingLeft: 16, color: 'var(--color-txt-secondary)', fontSize: 12, lineHeight: 1.6 }}>
                      {codeResult.findings.map((f: string, i: number) => <li key={i} style={{ marginBottom: 6 }}>{f}</li>)}
                    </ul>
                  ) : <p style={{ color: '#16A34A', fontSize: 12, margin: '0 0 16px' }}>✓ Sin problemas detectados.</p>}

                  <p style={labelStyle}>Recomendaciones</p>
                  <pre style={{ margin: '0 0 16px', padding: 10, background: 'var(--color-bg-base)', border: '1px solid var(--color-border-main)', borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-txt-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                    {codeResult.recommendations}
                  </pre>

                  <div style={{ borderTop: '1px solid var(--color-border-main)', paddingTop: 14 }}>
                    <button onClick={handleGenerateCodePatch} disabled={patchRunning}
                      style={{ width: '100%', height: 38, background: 'transparent', border: '1px solid rgba(0,240,255,0.35)', color: 'var(--color-acid)', borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}>
                      {patchRunning ? 'Generando parche...' : '⚡ Generar parche con IA'}
                    </button>
                    {patchResult && (
                      <div style={{ marginTop: 14, border: '1px solid rgba(0,240,255,0.2)', borderRadius: 10, background: '#020202', overflow: 'hidden' }}>
                        <div style={{ padding: '6px 12px', background: 'rgba(0,240,255,0.04)', borderBottom: '1px solid rgba(0,240,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-acid)', fontWeight: 700 }}>PARCHE SUGERIDO POR IA</span>
                          <button onClick={() => navigator.clipboard.writeText(patchResult.patch)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-acid)', fontSize: 9, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                            [Copiar]
                          </button>
                        </div>
                        <pre style={{ margin: 0, padding: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#00FF00', lineHeight: 1.4, overflowX: 'auto' }}>
                          {patchResult.patch}
                        </pre>
                        {patchResult.explanation && (
                          <p style={{ margin: '0', padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-txt-muted)', lineHeight: 1.4, borderTop: '1px solid rgba(0,240,255,0.1)' }}>
                            {patchResult.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyResult icon="code" text={t('play_results_empty')} />
              )}
            </div>
          </div>
        )}

        {/* ─── Tab 3: SSL & DNS ─── */}
        {activeTab === 'dns' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }} className="playground-grid">
            <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-txt-primary)', margin: 0 }}>{t('play_tab_dns')}</h3>
                {selectedMonitor?.url && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-brand-primary)', background: 'var(--color-brand-light)', padding: '2px 8px', borderRadius: 6 }}>
                    {selectedMonitor.name}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ ...labelStyle, marginBottom: 0 }}>{t('play_load_preset')}</span>
                {['github.com', 'google.com', 'vercel.com'].map(d => (
                  <button key={d} onClick={() => setDomainInput(d)}
                    style={{ background: 'var(--color-bg-card-hover)', border: '1px solid var(--color-border-main)', borderRadius: 6, padding: '4px 8px', color: 'var(--color-brand-primary)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}>
                    {d}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Dominio</label>
                <input type="text" value={domainInput} onChange={e => setDomainInput(e.target.value)}
                  placeholder="dominio.com" style={inputStyle} />
              </div>

              {dnsError && <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid #DC2626', borderRadius: 8, color: '#DC2626', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 16 }}>⚠ {dnsError}</div>}

              <button onClick={handleRunDns} disabled={dnsRunning} className="btn-solid-glow" style={{ width: '100%', height: 42, fontSize: 13, borderRadius: 12, justifyContent: 'center' }}>
                {dnsRunning ? t('play_running_dns') : t('play_run_dns')}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {dnsResult ? (
                <>
                  <div className="glass-card" style={{ padding: 20, borderRadius: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-txt-primary)' }}>Network Posture Audit</span>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,240,255,0.08)', border: '2px solid var(--color-acid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, fontFamily: 'var(--font-mono)', color: 'var(--color-acid)' }}>
                        {dnsResult.audit.securityScore}
                      </div>
                    </div>
                    {[
                      { label: 'SSL', items: dnsResult.audit.sslFindings, ok: 'SSL en buen estado.' },
                      { label: 'DNS', items: dnsResult.audit.dnsFindings, ok: 'Registros de seguridad de email presentes.' },
                    ].map(s => (
                      <div key={s.label} style={{ marginBottom: 12 }}>
                        <span style={{ ...labelStyle, marginBottom: 4 }}>Hallazgos {s.label}</span>
                        {s.items?.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--color-txt-secondary)', fontSize: 11, lineHeight: 1.5 }}>
                            {s.items.map((f: string, i: number) => <li key={i}>{f}</li>)}
                          </ul>
                        ) : <span style={{ color: '#16A34A', fontSize: 11 }}>✓ {s.ok}</span>}
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--color-border-main)', paddingTop: 10 }}>
                      <span style={{ ...labelStyle, marginBottom: 4 }}>Consejo IA</span>
                      <p style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-txt-muted)', lineHeight: 1.5 }}>{dnsResult.audit.advice}</p>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 20, borderRadius: 20 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--color-txt-primary)', display: 'block', marginBottom: 12 }}>DNS & TLS</span>
                    {[
                      { label: 'SPF', value: dnsResult.dnsInfo.spf },
                      { label: 'DMARC', value: dnsResult.dnsInfo.dmarc },
                      { label: 'TLS Status', value: dnsResult.sslInfo.status, color: dnsResult.sslInfo.status === 'Valid' ? '#16A34A' : '#DC2626' },
                      dnsResult.sslInfo.status === 'Valid' && { label: 'Emisor', value: dnsResult.sslInfo.issuer },
                      dnsResult.sslInfo.status === 'Valid' && { label: 'Vence', value: new Date(dnsResult.sslInfo.validTo).toLocaleDateString() },
                    ].filter(Boolean).map((row: any) => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: 'var(--color-txt-muted)' }}>{row.label}</span>
                        <span style={{ color: row.color ?? 'var(--color-txt-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.value}>{row.value || '—'}</span>
                      </div>
                    ))}
                  </div>

                  <div className="glass-card" style={{ padding: 20, borderRadius: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--color-txt-primary)' }}>Desglose de conexión</span>
                      {!latencyResult && !latencyRunning && (
                        <button onClick={handleRunDomainLatency}
                          style={{ background: 'transparent', border: '1px solid rgba(0,240,255,0.3)', color: 'var(--color-acid)', padding: '3px 10px', borderRadius: 6, fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                          Ejecutar timing
                        </button>
                      )}
                    </div>
                    {latencyRunning && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>Midiendo TCP/TLS...</div>}
                    {latencyError && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#DC2626' }}>⚠ {latencyError}</div>}
                    {latencyResult?.success && latencyResult.timings && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', height: 6, borderRadius: 4, overflow: 'hidden', background: '#222' }}>
                          {[
                            { name: 'DNS', val: latencyResult.timings.dnsLookupMs, color: '#16A34A' },
                            { name: 'TCP', val: latencyResult.timings.tcpConnectMs, color: 'var(--color-acid)' },
                            { name: 'TLS', val: latencyResult.timings.tlsHandshakeMs, color: '#00B0FF' },
                            { name: 'TTFB', val: Math.max(0, latencyResult.timings.ttfbMs - latencyResult.timings.dnsLookupMs - latencyResult.timings.tcpConnectMs - latencyResult.timings.tlsHandshakeMs), color: '#FF007F' },
                          ].map((s, i) => {
                            const pct = latencyResult.timings.totalMs > 0 ? (s.val / latencyResult.timings.totalMs) * 100 : 0;
                            return pct > 0 ? <div key={i} style={{ width: `${pct}%`, backgroundColor: s.color }} title={`${s.name}: ${s.val}ms`} /> : null;
                          })}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                          {[
                            { label: 'DNS', val: latencyResult.timings.dnsLookupMs, color: '#16A34A' },
                            { label: 'TCP', val: latencyResult.timings.tcpConnectMs, color: 'var(--color-acid)' },
                            { label: 'TLS', val: latencyResult.timings.tlsHandshakeMs, color: '#00B0FF' },
                            { label: 'TTFB', val: latencyResult.timings.ttfbMs, color: '#FF007F' },
                          ].map(l => (
                            <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-txt-muted)' }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: l.color }} />
                                {l.label}
                              </span>
                              <span style={{ fontWeight: 700, color: 'var(--color-txt-primary)' }}>{l.val}ms</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-main)', paddingTop: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: 'var(--color-txt-muted)' }}>Total</span>
                          <span style={{ color: 'var(--color-acid)', fontWeight: 800 }}>{latencyResult.timings.totalMs}ms</span>
                        </div>
                        {latencyResult.advice && (
                          <div style={{ background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: 8, padding: 10 }}>
                            <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-acid)', marginBottom: 3 }}>CONSEJO IA SRE</span>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-txt-secondary)', lineHeight: 1.4 }}>{latencyResult.advice}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {!latencyResult && !latencyRunning && !latencyError && (
                      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-muted)' }}>
                        Ejecutá el timing para ver el desglose de DNS, TCP, TLS y TTFB.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <EmptyResult icon="shield" text={t('play_results_empty')} />
              )}
            </div>
          </div>
        )}

        {/* ─── Tab 4: Attack Simulator ─── */}
        {activeTab === 'hacking' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }} className="playground-grid">
            <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-txt-primary)', margin: 0 }}>{t('play_tab_hack')}</h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#16A34A', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', padding: '2px 8px', borderRadius: 6 }}>
                  ✓ SAFE — solo lectura
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-txt-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
                Envía payloads de prueba contra la URL objetivo y analiza la respuesta con Gemini IA. No modifica datos — solo testea headers y comportamiento del servidor.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>URL Objetivo</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {[{ id: 'custom', label: t('play_custom_url') }, { id: 'monitor', label: t('play_my_projects') }].map(m => (
                    <button key={m.id} onClick={() => {
                      setHackTargetMode(m.id as 'monitor' | 'custom');
                      if (m.id === 'monitor' && monitors.length > 0 && !selectedMonitorId) setSelectedMonitorId(monitors[0].id);
                    }}
                      style={{ flex: 1, height: 32, background: hackTargetMode === m.id ? 'var(--color-brand-light)' : 'transparent', border: `1px solid ${hackTargetMode === m.id ? 'var(--color-brand-mid)' : 'var(--color-border-main)'}`, color: hackTargetMode === m.id ? 'var(--color-brand-primary)' : 'var(--color-txt-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, borderRadius: 8, cursor: 'pointer' }}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {hackTargetMode === 'custom' ? (
                  <input type="text" value={customHackUrl} onChange={e => setCustomHackUrl(e.target.value)} placeholder="https://api.dominio.com/auth" style={inputStyle} />
                ) : (
                  <select value={selectedMonitorId} onChange={e => setSelectedMonitorId(e.target.value)} style={inputStyle}>
                    {monitors.length === 0 ? <option>Sin monitores</option> : monitors.map(m => <option key={m.id} value={m.id}>{m.name} {m.url ? `(${m.url.replace('https://', '')})` : ''}</option>)}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Vector de ataque</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { id: 'sqli', label: 'SQL Injection', desc: 'Inyección en query params', color: '#FF5252' },
                    { id: 'xss', label: 'XSS Reflejado', desc: 'Payloads en query strings', color: '#FFB300' },
                    { id: 'rate-limit', label: 'Rate Limit (DOS)', desc: 'Ráfaga de 5 peticiones', color: '#FF1744' },
                    { id: 'sensitive-path', label: 'Path Traversal', desc: 'Rutas sensibles (.env, /admin)', color: '#7C3AED' },
                  ].map(v => (
                    <button key={v.id} onClick={() => setAttackVector(v.id)}
                      style={{ padding: '10px 12px', borderRadius: 10, textAlign: 'left', border: `1px solid ${attackVector === v.id ? v.color : 'var(--color-border-main)'}`, background: attackVector === v.id ? `${v.color}15` : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: attackVector === v.id ? v.color : 'var(--color-txt-primary)', marginBottom: 2 }}>{v.label}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)' }}>{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {hackError && <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid #DC2626', borderRadius: 8, color: '#DC2626', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 16 }}>⚠ {hackError}</div>}

              <button onClick={handleRunHacking} disabled={hackRunning}
                style={{ width: '100%', height: 44, background: 'linear-gradient(135deg,#DC2626,#7C3AED)', border: 'none', color: 'white', fontWeight: 800, fontSize: 13, borderRadius: 12, cursor: hackRunning ? 'not-allowed' : 'pointer', opacity: hackRunning ? 0.7 : 1, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                {hackRunning ? t('play_running_hack') : `⚡ ${t('play_run_hack')}`}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#080415', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16, padding: 16, height: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid rgba(124,58,237,0.15)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(196,181,253,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Console</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: hackRunning ? '#FF1744' : '#16A34A', animation: hackRunning ? 'pg-pulse 1s infinite' : 'none' }} />
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {hackLogs.length === 0 ? (
                    <span style={{ color: 'rgba(196,181,253,0.4)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{'>'} Console idle. Lanzá una simulación para comenzar.</span>
                  ) : (
                    hackLogs.map((log, idx) => (
                      <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: log.includes('[ERROR]') ? '#FF5252' : 'rgba(196,181,253,0.8)', lineHeight: 1.4 }}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {hackResult ? (
                (() => {
                  const uiStyle = getStatusStyle(hackResult.analysis.isVulnerable);
                  return (
                    <div style={{ background: 'var(--color-bg-card)', border: `2px solid ${uiStyle.border}`, borderRadius: 20, padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#000', background: uiStyle.color, padding: '3px 10px', borderRadius: 6 }}>
                          {uiStyle.label}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-txt-primary)' }}>Gemini AI Diagnóstico</span>
                      </div>
                      <p style={labelStyle}>Diagnóstico del servidor</p>
                      <p style={{ margin: '0 0 14px', color: 'var(--color-txt-primary)', fontSize: 12, lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}>{hackResult.analysis.diagnosis}</p>
                      <p style={labelStyle}>Mitigaciones recomendadas</p>
                      <p style={{ margin: 0, color: 'var(--color-txt-muted)', fontSize: 11, lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}>{hackResult.analysis.mitigation}</p>
                    </div>
                  );
                })()
              ) : (
                <EmptyResult icon="shield" text="El reporte de IA aparecerá aquí después de la simulación." />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function EmptyResult({ icon, text }: { icon: 'wave' | 'code' | 'shield'; text: string }) {
  const icons = {
    wave: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
    code: <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
  };
  return (
    <div style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(12px)', border: '1px dashed rgba(196,181,253,0.35)', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center', color: 'var(--color-txt-muted)', height: '100%', minHeight: 200 }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.4 }}>
        {icons[icon]}
      </svg>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, margin: 0, opacity: 0.7 }}>{text}</p>
    </div>
  );
}
