'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api, type Monitor } from '@/lib/api';

type Tab = 'api' | 'code' | 'dns' | 'hacking';

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState<Tab>('api');
  const [token, setToken] = useState<string | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loadingMonitors, setLoadingMonitors] = useState(true);

  // Supabase Auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? null;
      setToken(tok);
      if (tok) {
        api.monitors.list(tok).then(data => {
          setMonitors(data);
          setLoadingMonitors(false);
        }).catch(err => {
          console.error(err);
          setLoadingMonitors(false);
        });
      } else {
        setLoadingMonitors(false);
      }
    });
  }, []);

  // ── Tab 1: API Auditor States ──
  const [apiUrl, setApiUrl] = useState('https://pulseguard-backend-production.up.railway.app/health');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiHeaders, setApiHeaders] = useState('{\n  "Accept": "application/json"\n}');
  const [apiBody, setApiBody] = useState('{\n  \n}');
  const [apiResult, setApiResult] = useState<any | null>(null);
  const [apiRunning, setApiRunning] = useState(false);
  const [apiError, setApiError] = useState('');

  // ── Tab 2: Code Auditor States ──
  const [codeSnippet, setCodeSnippet] = useState(
    `// Example Dockerfile snippet\nFROM node:18\nWORKDIR /app\nCOPY . .\nRUN npm install\n# Running as root (Vulnerability)\nCMD ["node", "server.js"]`
  );
  const [codeLanguage, setCodeLanguage] = useState('dockerfile');
  const [codeResult, setCodeResult] = useState<any | null>(null);
  const [codeRunning, setCodeRunning] = useState(false);
  const [codeError, setCodeError] = useState('');

  // ── Tab 3: SSL & DNS Inspector States ──
  const [domainInput, setDomainInput] = useState('github.com');
  const [dnsResult, setDnsResult] = useState<any | null>(null);
  const [dnsRunning, setDnsRunning] = useState(false);
  const [dnsError, setDnsError] = useState('');

  // ── Tab 4: Hacking Simulator States ──
  const [hackTargetMode, setHackTargetMode] = useState<'monitor' | 'custom'>('custom');
  const [selectedMonitorId, setSelectedMonitorId] = useState('');
  const [customHackUrl, setCustomHackUrl] = useState('https://pulseguard-backend-production.up.railway.app/health');
  const [attackVector, setAttackVector] = useState('sqli');
  const [hackLogs, setHackLogs] = useState<string[]>([]);
  const [hackResult, setHackResult] = useState<any | null>(null);
  const [hackRunning, setHackRunning] = useState(false);
  const [hackError, setHackError] = useState('');

  // ── Handlers ──
  async function handleRunApi() {
    if (!token) return;
    setApiRunning(true);
    setApiError('');
    setApiResult(null);

    let parsedHeaders = {};
    let parsedBody = null;

    try {
      if (apiHeaders.trim()) parsedHeaders = JSON.parse(apiHeaders);
    } catch {
      setApiError('Invalid JSON in Request Headers');
      setApiRunning(false);
      return;
    }

    try {
      if (apiBody.trim() && apiMethod !== 'GET') parsedBody = JSON.parse(apiBody);
    } catch {
      setApiError('Invalid JSON in Request Body');
      setApiRunning(false);
      return;
    }

    try {
      const data = await api.playground.testEndpoint({
        url: apiUrl,
        method: apiMethod,
        headers: parsedHeaders,
        body: parsedBody
      }, token);
      setApiResult(data);
    } catch (err: any) {
      setApiError(err.message || 'Request failed');
    } finally {
      setApiRunning(false);
    }
  }

  async function handleRunCodeAudit() {
    if (!token) return;
    setCodeRunning(true);
    setCodeError('');
    setCodeResult(null);

    try {
      const data = await api.playground.auditCode({
        code: codeSnippet,
        language: codeLanguage
      }, token);
      setCodeResult(data);
    } catch (err: any) {
      setCodeError(err.message || 'Audit failed');
    } finally {
      setCodeRunning(false);
    }
  }

  async function handleRunDns() {
    if (!token) return;
    setDnsRunning(true);
    setDnsError('');
    setDnsResult(null);

    try {
      const data = await api.playground.inspectDomain({
        domain: domainInput
      }, token);
      setDnsResult(data);
    } catch (err: any) {
      setDnsError(err.message || 'Domain lookup failed');
    } finally {
      setDnsRunning(false);
    }
  }

  async function handleRunHacking() {
    if (!token) return;
    setHackRunning(true);
    setHackError('');
    setHackResult(null);
    setHackLogs([]);

    // Determine target URL
    let targetUrl = '';
    if (hackTargetMode === 'monitor') {
      const mon = monitors.find(m => m.id === selectedMonitorId);
      if (!mon) {
        setHackError('Please select a project monitor');
        setHackRunning(false);
        return;
      }
      targetUrl = mon.url;
    } else {
      targetUrl = customHackUrl;
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      setHackError('Target URL must start with http:// or https://');
      setHackRunning(false);
      return;
    }

    // Run simulated logging
    const addLog = (msg: string, delay: number) => {
      return new Promise<void>((res) => {
        setTimeout(() => {
          setHackLogs(prev => [...prev, msg]);
          res();
        }, delay);
      });
    };

    await addLog(`[${new Date().toLocaleTimeString()}] 🚀 Launching Safe Attack Simulator against ${targetUrl}...`, 0);
    await addLog(`[${new Date().toLocaleTimeString()}] 📡 Attack vector configured: ${attackVector.toUpperCase()}`, 600);
    await addLog(`[${new Date().toLocaleTimeString()}] 🧪 Injecting probe payloads...`, 800);
    
    if (attackVector === 'rate-limit') {
      await addLog(`[${new Date().toLocaleTimeString()}] ⚡ Sending burst: 5 concurrent HTTP requests...`, 500);
    } else if (attackVector === 'sqli') {
      await addLog(`[${new Date().toLocaleTimeString()}] 🛠 Sending SQL injection query params...`, 500);
    } else if (attackVector === 'xss') {
      await addLog(`[${new Date().toLocaleTimeString()}] 🛠 Sending XSS payload query strings...`, 500);
    } else {
      await addLog(`[${new Date().toLocaleTimeString()}] 🛠 Probing sensitive path files...`, 500);
    }

    try {
      const data = await api.playground.simulateAttack({
        url: targetUrl,
        attackType: attackVector
      }, token);

      await addLog(`[${new Date().toLocaleTimeString()}] 📥 Server responses received. Analysing headers & payloads...`, 800);
      await addLog(`[${new Date().toLocaleTimeString()}] 🧠 Triggering Gemini AI Diagnostics for Vulnerability Check...`, 800);
      await addLog(`[${new Date().toLocaleTimeString()}] ✅ Completed simulation analysis.`, 1000);

      setHackResult(data);
    } catch (err: any) {
      setHackError(err.message || 'Simulation execution failed');
      setHackLogs(prev => [...prev, `[ERROR] Simulation halted: ${err.message || 'Unknown network error'}`]);
    } finally {
      setHackRunning(false);
    }
  }

  // Color helpers
  function getSeverityColor(sev: string) {
    switch (sev?.toLowerCase()) {
      case 'critical': return '#FF1744';
      case 'high': return '#FF5252';
      case 'medium': return '#FFB300';
      case 'low': return '#00E676';
      default: return '#CAFF00';
    }
  }

  function getStatusStyle(isVuln: string) {
    switch (isVuln?.toLowerCase()) {
      case 'yes':
        return { label: 'VULNERABLE', color: '#FF1744', bg: 'rgba(255,23,68,0.1)', border: '#FF1744' };
      case 'suspected':
        return { label: 'RISK DETECTED', color: '#FFB300', bg: 'rgba(255,179,0,0.1)', border: '#FFB300' };
      default:
        return { label: 'SECURE / PROTECTED', color: '#00E676', bg: 'rgba(0,230,118,0.1)', border: '#00E676' };
    }
  }

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both' }}>
      
      {/* ── Title Header ── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#CAFF00', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          // SecOps Laboratory
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: '#F0F0F0', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
          Developer Playground
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#666', marginTop: 8 }}>
          Test API endpoints, scan code snippets, check network configurations, and run safe attack simulations in real-time.
        </p>
      </div>

      {/* ── Tabs Selector ── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 16, marginBottom: 32 }}>
        {[
          { id: 'api', name: 'API Auditor' },
          { id: 'code', name: 'Code Auditor' },
          { id: 'dns', name: 'SSL & DNS Inspector' },
          { id: 'hacking', name: 'Hacking Simulator' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            style={{
              padding: '8px 16px',
              background: activeTab === t.id ? 'rgba(202,255,0,0.05)' : 'transparent',
              border: activeTab === t.id ? '1px solid rgba(202,255,0,0.3)' : '1px solid transparent',
              borderRadius: 3,
              color: activeTab === t.id ? '#CAFF00' : '#888',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'color 0.15s, background 0.15s, border-color 0.15s'
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* ── Tab Content Container ── */}
      <div style={{ minHeight: 400 }}>

        {/* ── Tab 1: API Auditor ── */}
        {activeTab === 'api' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }} className="playground-grid">
            {/* Form */}
            <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#F0F0F0', margin: '0 0 16px' }}>Test API Endpoint</h3>
               
               <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                 <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', textTransform: 'uppercase', marginRight: 4 }}>Load Preset:</span>
                 <button
                   onClick={() => {
                     setApiUrl('https://api.ipify.org?format=json');
                     setApiMethod('GET');
                     setApiHeaders('{\n  "Accept": "application/json"\n}');
                   }}
                   style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, padding: '4px 8px', color: '#CAFF00', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}
                 >
                   GET Public IP
                 </button>
                 <button
                   onClick={() => {
                     setApiUrl('https://httpbin.org/post');
                     setApiMethod('POST');
                     setApiHeaders('{\n  "Content-Type": "application/json"\n}');
                     setApiBody('{\n  "username": "admin",\n  "action": "test"\n}');
                   }}
                   style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, padding: '4px 8px', color: '#CAFF00', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}
                 >
                   POST Echo HTTPBin
                 </button>
                 <button
                   onClick={() => {
                     setApiUrl('https://api.github.com/users/octocat');
                     setApiMethod('GET');
                     setApiHeaders('{\n  "User-Agent": "PulseGuard"\n}');
                   }}
                   style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, padding: '4px 8px', color: '#CAFF00', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}
                 >
                   GET GitHub User
                 </button>
               </div>
              
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <select
                  value={apiMethod}
                  onChange={(e) => setApiMethod(e.target.value)}
                  style={{
                    background: '#000',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F0F0F0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    padding: '0 12px',
                    borderRadius: 3,
                    height: 40
                  }}
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/endpoint"
                  style={{
                    flex: 1,
                    background: '#000',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F0F0F0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    padding: '0 12px',
                    borderRadius: 3,
                    height: 40
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 8 }}>
                  Request Headers (JSON)
                </label>
                <textarea
                  value={apiHeaders}
                  onChange={(e) => setApiHeaders(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    background: '#000',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F0F0F0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    padding: 12,
                    borderRadius: 3,
                    resize: 'vertical'
                  }}
                />
              </div>

              {apiMethod !== 'GET' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 8 }}>
                    Request Body (JSON)
                  </label>
                  <textarea
                    value={apiBody}
                    onChange={(e) => setApiBody(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      background: '#000',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#F0F0F0',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      padding: 12,
                      borderRadius: 3,
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {apiError && (
                <div style={{ background: 'rgba(255,23,68,0.08)', border: '1px solid #FF1744', borderRadius: 3, color: '#FF1744', padding: 12, fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
                  Error: {apiError}
                </div>
              )}

              <button
                onClick={handleRunApi}
                disabled={apiRunning}
                className="btn-strict-primary"
                style={{ width: '100%', height: 42, fontSize: 13 }}
              >
                {apiRunning ? 'Running Audit Request...' : 'Send Request & Audit'}
              </button>
            </div>

            {/* Results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {apiResult ? (
                <>
                  {/* AI Report Card */}
                  <div style={{ background: '#080808', border: `1px solid ${getSeverityColor(apiResult.audit.overallRisk)}`, borderRadius: 3, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#000',
                        background: getSeverityColor(apiResult.audit.overallRisk),
                        padding: '2px 8px',
                        borderRadius: 2
                      }}>
                        {apiResult.audit.overallRisk.toUpperCase()} RISK
                      </span>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#F0F0F0', margin: 0 }}>Gemini AI API Audit</h4>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', textTransform: 'uppercase', margin: '0 0 6px' }}>Vulnerabilities & Findings</p>
                      {apiResult.audit.findings && apiResult.audit.findings.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18, color: '#D4D4D4', fontSize: 13, fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                          {apiResult.audit.findings.map((f: string, i: number) => (
                            <li key={i} style={{ marginBottom: 6 }}>{f}</li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: '#00E676', fontSize: 13, margin: 0 }}>No security flaws identified in the response headers or content.</p>
                      )}
                    </div>

                    <div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', textTransform: 'uppercase', margin: '0 0 6px' }}>Mitigation Advice</p>
                      <p style={{ margin: 0, color: '#888', fontSize: 12, lineHeight: 1.5, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
                        {apiResult.audit.recommendation}
                      </p>
                    </div>
                  </div>

                  {/* Network stats */}
                  <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center', marginBottom: 20 }}>
                      <div style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: apiResult.status >= 200 && apiResult.status < 300 ? '#00E676' : '#FF1744', fontWeight: 'bold' }}>
                          {apiResult.status}
                        </div>
                        <div style={{ fontSize: 9, color: '#4A4A4A', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginTop: 4 }}>Status</div>
                      </div>
                      <div style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: '#CAFF00', fontWeight: 'bold' }}>
                          {apiResult.latencyMs}ms
                        </div>
                        <div style={{ fontSize: 9, color: '#4A4A4A', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginTop: 4 }}>Latency</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: '#F0F0F0', fontWeight: 'bold' }}>
                          {JSON.stringify(apiResult.responseBody).length} B
                        </div>
                        <div style={{ fontSize: 9, color: '#4A4A4A', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginTop: 4 }}>Size</div>
                      </div>
                    </div>

                    <details style={{ marginBottom: 12 }}>
                      <summary style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#F0F0F0', cursor: 'pointer', outline: 'none', padding: '6px 0' }}>
                        Response Headers ({Object.keys(apiResult.responseHeaders).length})
                      </summary>
                      <pre style={{ margin: '8px 0 0', padding: 12, background: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#D4D4D4', overflowX: 'auto' }}>
                        {JSON.stringify(apiResult.responseHeaders, null, 2)}
                      </pre>
                    </details>

                    <details>
                      <summary style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#F0F0F0', cursor: 'pointer', outline: 'none', padding: '6px 0' }}>
                        Response Body Snippet
                      </summary>
                      <pre style={{ margin: '8px 0 0', padding: 12, background: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#D4D4D4', overflowX: 'auto', maxHeight: 200, overflowY: 'auto' }}>
                        {typeof apiResult.responseBody === 'object' ? JSON.stringify(apiResult.responseBody, null, 2) : String(apiResult.responseBody)}
                      </pre>
                    </details>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: '#4A4A4A' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, margin: 0 }}>Results will appear here after sending a request.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 2: Code Auditor ── */}
        {activeTab === 'code' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }} className="playground-grid">
            {/* Editor */}
            <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#F0F0F0', margin: '0 0 16px' }}>Audit Code Snippet</h3>

               <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                 <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', textTransform: 'uppercase', marginRight: 4 }}>Load Preset:</span>
                 <button
                   onClick={() => {
                     setCodeLanguage('dockerfile');
                     setCodeSnippet('FROM ubuntu:latest\nRUN apt-get update && apt-get install -y curl\n# BAD PRACTICE: running container as root user\nUSER root\nCMD ["bash"]');
                   }}
                   style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, padding: '4px 8px', color: '#CAFF00', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}
                 >
                   Insecure Dockerfile
                 </button>
                 <button
                   onClick={() => {
                     setCodeLanguage('javascript');
                     setCodeSnippet('const express = require("express");\nconst app = express();\nconst pg = require("pg");\nconst client = new pg.Client();\n\napp.get("/users", (req, res) => {\n  // VULNERABLE: Direct SQL injection concatenation\n  const sql = "SELECT * FROM users WHERE name = \'" + req.query.name + "\'";\n  client.query(sql, (err, result) => {\n    res.json(result.rows);\n  });\n});');
                   }}
                   style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, padding: '4px 8px', color: '#CAFF00', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}
                 >
                   SQL Injection Code
                 </button>
                 <button
                   onClick={() => {
                     setCodeLanguage('dependencies');
                     setCodeSnippet('{\n  "name": "vulnerable-app",\n  "dependencies": {\n    "express": "^4.16.0",\n    "lodash": "4.17.4",\n    "mongoose": "5.7.5"\n  }\n}');
                   }}
                   style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, padding: '4px 8px', color: '#CAFF00', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}
                 >
                   Vulnerable Dependencies
                 </button>
               </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 8 }}>
                  Snippet Context / Type
                </label>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#000',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F0F0F0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    padding: '0 12px',
                    borderRadius: 3,
                    height: 40
                  }}
                >
                  <option value="javascript">JavaScript / TypeScript</option>
                  <option value="dockerfile">Dockerfile</option>
                  <option value="dependencies">Dependency File (package.json, requirements.txt, go.mod)</option>
                  <option value="yaml">Config Files (Kubernetes YAML, docker-compose.yml)</option>
                  <option value="shell">Shell script (.sh)</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 8 }}>
                  Paste Code
                </label>
                <textarea
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  rows={10}
                  style={{
                    width: '100%',
                    background: '#000',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F0F0F0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    padding: 12,
                    borderRadius: 3,
                    resize: 'vertical'
                  }}
                />
              </div>

              {codeError && (
                <div style={{ background: 'rgba(255,23,68,0.08)', border: '1px solid #FF1744', borderRadius: 3, color: '#FF1744', padding: 12, fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
                  Error: {codeError}
                </div>
              )}

              <button
                onClick={handleRunCodeAudit}
                disabled={codeRunning}
                className="btn-strict-primary"
                style={{ width: '100%', height: 42, fontSize: 13 }}
              >
                {codeRunning ? 'Auditing Code Snippet...' : 'Audit Code'}
              </button>
            </div>

            {/* AI Results */}
            <div>
              {codeResult ? (
                <div style={{ background: '#080808', border: `1px solid ${getSeverityColor(codeResult.severity)}`, borderRadius: 3, padding: 24, height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#000',
                      background: getSeverityColor(codeResult.severity),
                      padding: '2px 8px',
                      borderRadius: 2
                    }}>
                      {codeResult.severity.toUpperCase()} RISK
                    </span>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#F0F0F0', margin: 0 }}>Static Code Security Audit</h4>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', textTransform: 'uppercase', margin: '0 0 8px' }}>Security Findings</p>
                    {codeResult.findings && codeResult.findings.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 18, color: '#D4D4D4', fontSize: 13, fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                        {codeResult.findings.map((f: string, i: number) => (
                          <li key={i} style={{ marginBottom: 8 }}>{f}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: '#00E676', fontSize: 13, margin: 0 }}>No issues found. Code seems safe!</p>
                    )}
                  </div>

                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', textTransform: 'uppercase', margin: '0 0 8px' }}>Actionable Recommendations</p>
                    <pre style={{ margin: 0, padding: 12, background: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#888', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {codeResult.recommendations}
                    </pre>
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: '#4A4A4A', height: '100%' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1M18 8h4M18 12h4"/>
                  </svg>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, margin: 0 }}>Results will appear here after starting static code auditing.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 3: SSL & DNS Inspector ── */}
        {activeTab === 'dns' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }} className="playground-grid">
            {/* Input form */}
            <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#F0F0F0', margin: '0 0 16px' }}>SSL & DNS Health Inspector</h3>
               
               <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                 <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4A4A4A', textTransform: 'uppercase', marginRight: 4 }}>Load Preset:</span>
                 <button
                   onClick={() => setDomainInput('github.com')}
                   style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, padding: '4px 8px', color: '#CAFF00', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}
                 >
                   github.com
                 </button>
                 <button
                   onClick={() => setDomainInput('google.com')}
                   style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, padding: '4px 8px', color: '#CAFF00', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}
                 >
                   google.com
                 </button>
                 <button
                   onClick={() => setDomainInput('vercel.com')}
                   style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, padding: '4px 8px', color: '#CAFF00', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}
                 >
                   vercel.com
                 </button>
               </div>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 8 }}>
                  Domain name
                </label>
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="domain.com"
                  style={{
                    width: '100%',
                    background: '#000',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F0F0F0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    padding: '0 12px',
                    borderRadius: 3,
                    height: 40
                  }}
                />
              </div>

              {dnsError && (
                <div style={{ background: 'rgba(255,23,68,0.08)', border: '1px solid #FF1744', borderRadius: 3, color: '#FF1744', padding: 12, fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
                  Error: {dnsError}
                </div>
              )}

              <button
                onClick={handleRunDns}
                disabled={dnsRunning}
                className="btn-strict-primary"
                style={{ width: '100%', height: 42, fontSize: 13 }}
              >
                {dnsRunning ? 'Querying Domain Services...' : 'Inspect DNS & SSL'}
              </button>
            </div>

            {/* Audit Results */}
            <div>
              {dnsResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Score & AI recommendation */}
                  <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#F0F0F0', margin: 0 }}>Network Posture Audit</h4>
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: 'rgba(202,255,0,0.1)',
                        border: '2px solid #CAFF00',
                        color: '#CAFF00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 18,
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {dnsResult.audit.securityScore}
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#4A4A4A', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>SSL Findings</span>
                      {dnsResult.audit.sslFindings && dnsResult.audit.sslFindings.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 16, color: '#D4D4D4', fontSize: 12, lineHeight: 1.4 }}>
                          {dnsResult.audit.sslFindings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                        </ul>
                      ) : <span style={{ color: '#00E676', fontSize: 12 }}>SSL certificate setup looks healthy.</span>}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#4A4A4A', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>DNS Safety Findings</span>
                      {dnsResult.audit.dnsFindings && dnsResult.audit.dnsFindings.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 16, color: '#D4D4D4', fontSize: 12, lineHeight: 1.4 }}>
                          {dnsResult.audit.dnsFindings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                        </ul>
                      ) : <span style={{ color: '#00E676', fontSize: 12 }}>Email anti-spoofing and security records present.</span>}
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#4A4A4A', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>AI Advice</span>
                      <p style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#888', lineHeight: 1.4 }}>
                        {dnsResult.audit.advice}
                      </p>
                    </div>
                  </div>

                  {/* Raw properties */}
                  <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: 20 }}>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: '#F0F0F0', margin: '0 0 12px' }}>DNS & TLS Details</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                        <span style={{ color: '#4A4A4A' }}>SPF Record</span>
                        <span style={{ color: '#F0F0F0', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 200, whiteSpace: 'nowrap' }} title={dnsResult.dnsInfo.spf}>
                          {dnsResult.dnsInfo.spf}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                        <span style={{ color: '#4A4A4A' }}>DMARC Record</span>
                        <span style={{ color: '#F0F0F0', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 200, whiteSpace: 'nowrap' }} title={dnsResult.dnsInfo.dmarc}>
                          {dnsResult.dnsInfo.dmarc}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                        <span style={{ color: '#4A4A4A' }}>TLS Certificate Status</span>
                        <span style={{ color: dnsResult.sslInfo.status === 'Valid' ? '#00E676' : '#FF1744' }}>{dnsResult.sslInfo.status}</span>
                      </div>
                      {dnsResult.sslInfo.status === 'Valid' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                            <span style={{ color: '#4A4A4A' }}>Issuer</span>
                            <span style={{ color: '#F0F0F0' }}>{dnsResult.sslInfo.issuer}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#4A4A4A' }}>Expires On</span>
                            <span style={{ color: '#F0F0F0' }}>{new Date(dnsResult.sslInfo.validTo).toLocaleDateString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: '#4A4A4A', height: '100%' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01"/>
                  </svg>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, margin: 0 }}>Results will appear here after requesting lookup.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 4: Hacking Simulator ── */}
        {activeTab === 'hacking' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }} className="playground-grid">
            {/* Controls */}
            <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#F0F0F0', margin: '0 0 20px' }}>Hacking & Safety Simulator</h3>

              {/* Target Selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 8 }}>
                  Simulation Target
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button
                    onClick={() => setHackTargetMode('custom')}
                    style={{
                      flex: 1,
                      height: 34,
                      background: hackTargetMode === 'custom' ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: hackTargetMode === 'custom' ? '#F0F0F0' : '#4A4A4A',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      borderRadius: 3,
                      cursor: 'pointer'
                    }}
                  >
                    Custom URL
                  </button>
                  <button
                    onClick={() => {
                      setHackTargetMode('monitor');
                      if (monitors.length > 0 && !selectedMonitorId) {
                        setSelectedMonitorId(monitors[0].id);
                      }
                    }}
                    style={{
                      flex: 1,
                      height: 34,
                      background: hackTargetMode === 'monitor' ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: hackTargetMode === 'monitor' ? '#F0F0F0' : '#4A4A4A',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      borderRadius: 3,
                      cursor: 'pointer'
                    }}
                  >
                    My Projects
                  </button>
                </div>

                {hackTargetMode === 'custom' ? (
                  <input
                    type="text"
                    value={customHackUrl}
                    onChange={(e) => setCustomHackUrl(e.target.value)}
                    placeholder="https://api.domain.com/auth"
                    style={{
                      width: '100%',
                      background: '#000',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#F0F0F0',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      padding: '0 12px',
                      borderRadius: 3,
                      height: 40
                    }}
                  />
                ) : (
                  <select
                    value={selectedMonitorId}
                    onChange={(e) => setSelectedMonitorId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#000',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#F0F0F0',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      padding: '0 12px',
                      borderRadius: 3,
                      height: 40
                    }}
                  >
                    {loadingMonitors ? (
                      <option>Loading monitors...</option>
                    ) : monitors.length === 0 ? (
                      <option>No monitors available</option>
                    ) : (
                      monitors.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.url})</option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Vector Selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 8 }}>
                  Attack Vector (Simulation Type)
                </label>
                <select
                  value={attackVector}
                  onChange={(e) => setAttackVector(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#000',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F0F0F0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    padding: '0 12px',
                    borderRadius: 3,
                    height: 40
                  }}
                >
                  <option value="sqli">SQL Injection Probe</option>
                  <option value="xss">Reflected XSS Probe</option>
                  <option value="rate-limit">Rate Limiting Stress Test (DOS)</option>
                  <option value="sensitive-path">Sensitive Path Traversal (expose .env)</option>
                </select>
              </div>

              {hackError && (
                <div style={{ background: 'rgba(255,23,68,0.08)', border: '1px solid #FF1744', borderRadius: 3, color: '#FF1744', padding: 12, fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
                  Error: {hackError}
                </div>
              )}

              <button
                onClick={handleRunHacking}
                disabled={hackRunning}
                className="btn-strict-primary"
                style={{ width: '100%', height: 42, fontSize: 13, background: '#FF1744', border: '1px solid #FF1744', color: '#000', fontWeight: 'bold' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FF5252'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FF1744'; }}
              >
                {hackRunning ? 'Simulating Attack Vector...' : '⚡ Launch Simulation'}
              </button>
            </div>

            {/* Console log & AI diagnostic */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Terminal Logs */}
              <div style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: 16, height: 180, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#4A4A4A', textTransform: 'uppercase' }}>Simulation Console Logs</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: hackRunning ? '#FF1744' : '#00E676', display: 'inline-block', animation: hackRunning ? 'pg-pulse 1s infinite' : 'none' }}></span>
                </div>
                {hackLogs.length === 0 ? (
                  <p style={{ color: '#4A4A4A', fontFamily: 'var(--font-mono)', fontSize: 11, margin: 0 }}>Console idle. Launch an attack vector to begin probing.</p>
                ) : (
                  hackLogs.map((log, idx) => (
                    <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: log.includes('[ERROR]') ? '#FF1744' : '#D4D4D4', lineHeight: 1.4 }}>
                      {log}
                    </div>
                  ))
                )}
              </div>

              {/* AI diagnostic report */}
              {hackResult ? (
                (() => {
                  const uiStyle = getStatusStyle(hackResult.analysis.isVulnerable);
                  return (
                    <div style={{ background: '#080808', border: `1px solid ${uiStyle.border}`, borderRadius: 3, padding: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'start', gap: 12, marginBottom: 16 }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#000',
                          background: uiStyle.color,
                          padding: '3px 8px',
                          borderRadius: 2
                        }}>
                          {uiStyle.label}
                        </span>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#F0F0F0', margin: 0 }}>Gemini AI Diagnostics</h4>
                      </div>

                      <div style={{ marginBottom: 12, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: '#4A4A4A', display: 'block', textTransform: 'uppercase', fontSize: 9, marginBottom: 4 }}>Server Diagnosis</span>
                        <p style={{ margin: 0, color: '#F0F0F0', lineHeight: 1.4 }}>
                          {hackResult.analysis.diagnosis}
                        </p>
                      </div>

                      <div>
                        <span style={{ color: '#4A4A4A', display: 'block', textTransform: 'uppercase', fontSize: 9, marginBottom: 4 }}>Actionable Mitigations</span>
                        <p style={{ margin: 0, color: '#888', fontSize: 12, lineHeight: 1.4, fontFamily: 'var(--font-mono)' }}>
                          {hackResult.analysis.mitigation}
                        </p>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div style={{ flex: 1, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center', color: '#4A4A4A' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 10 }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, margin: 0 }}>Diagnostic report will display here after simulation completes.</p>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
