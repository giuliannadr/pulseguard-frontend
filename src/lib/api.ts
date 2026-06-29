// Include /api in the env var: e.g. http://localhost:3001/api or https://xxx.railway.app/api
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const FETCH_TIMEOUT_MS = 15_000;

export type MonitorStatus = 'up' | 'down' | 'degraded' | 'unknown';

export interface Monitor {
  id: string;
  userId: string;
  name: string;
  url: string | null;
  expectedStatus: number;
  expectedText?: string | null;
  intervalMinutes: number;
  isActive: boolean;
  githubRepoUrl?: string | null;
  githubWebhookId?: string | null;
  notificationWebhookUrl?: string | null;
  notificationEmail?: string | null;
  maintenanceWindows?: MaintenanceWindow[] | null;
  securityGrade?: string | null;
  securityHeaders?: any | null;
  createdAt: string;
  updatedAt: string;
  checks?: Check[];
}

export interface MaintenanceWindow {
  days: number[]; // 0=Sun..6=Sat
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
}

export interface DowntimeWindow {
  start: string;
  end: string | null;
  durationMs: number;
}

export interface Check {
  id: string;
  monitorId: string;
  status: MonitorStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  sslDaysLeft: number | null;
  errorMessage: string | null;
  securityGrade?: string | null;
  securityHeaders?: any | null;
  checkedAt: string;
}

export interface SecurityIncident {
  id: string;
  monitorId: string;
  commitHash: string;
  commitAuthor: string | null;
  riskType: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'None';
  description: string;
  recommendation: string;
  resolved: boolean;
  createdAt: string;
}

export interface Metrics {
  uptime: number | null;
  avgResponseMs: number | null;
  totalChecks: number;
}

export interface CreateMonitorPayload {
  name: string;
  url?: string;
  expectedStatus?: number;
  expectedText?: string;
  intervalMinutes?: number;
  notificationWebhookUrl?: string;
  notificationEmail?: string;
  maintenanceWindows?: MaintenanceWindow[];
}

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// GitHub token helpers — stored with a 7-day TTL so stale tokens are auto-cleared
const GH_TOKEN_KEY = 'gh_provider_token';
const GH_TOKEN_TS_KEY = 'gh_provider_token_ts';
const GH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const githubToken = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    const ts = Number(localStorage.getItem(GH_TOKEN_TS_KEY) ?? 0);
    if (Date.now() - ts > GH_TOKEN_TTL_MS) {
      localStorage.removeItem(GH_TOKEN_KEY);
      localStorage.removeItem(GH_TOKEN_TS_KEY);
      return null;
    }
    return localStorage.getItem(GH_TOKEN_KEY);
  },
  set(token: string) {
    localStorage.setItem(GH_TOKEN_KEY, token);
    localStorage.setItem(GH_TOKEN_TS_KEY, String(Date.now()));
  },
  clear() {
    localStorage.removeItem(GH_TOKEN_KEY);
    localStorage.removeItem(GH_TOKEN_TS_KEY);
  },
};

export const api = {
  monitors: {
    list:    (token: string) => apiFetch<Monitor[]>('/monitors', token),
    get:     (id: string, token: string) => apiFetch<Monitor>(`/monitors/${id}`, token),
    create:  (payload: CreateMonitorPayload, token: string) =>
               apiFetch<Monitor>('/monitors', token, { method: 'POST', body: JSON.stringify(payload) }),
    update:  (id: string, payload: Partial<CreateMonitorPayload & { isActive: boolean; notificationWebhookUrl?: string }>, token: string) =>
               apiFetch<Monitor>(`/monitors/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) }),
    delete:  (id: string, token: string) => apiFetch<void>(`/monitors/${id}`, token, { method: 'DELETE' }),
    checks:  (id: string, token: string, limit = 100) =>
               apiFetch<Check[]>(`/monitors/${id}/checks?limit=${limit}`, token),
    metrics: (id: string, token: string) => apiFetch<Metrics>(`/monitors/${id}/metrics`, token),
    securityIncidents: (id: string, token: string) => apiFetch<SecurityIncident[]>(`/monitors/${id}/security-incidents`, token),
    checkNow:(id: string, token: string) =>
               apiFetch<Check>(`/monitors/${id}/check-now`, token, { method: 'POST' }),
    scanRepo: (id: string, token: string, ghToken: string, force = false) =>
               apiFetch<any>(`/monitors/${id}/scan-repo${force ? '?force=true' : ''}`, token, { method: 'POST', headers: { 'x-github-token': ghToken } }),
    downtime: (id: string, token: string) => apiFetch<DowntimeWindow[]>(`/monitors/${id}/downtime`, token),
  },
  github: {
    repos: (token: string, ghToken: string) =>
      apiFetch<any[]>('/github/repos', token, { headers: { 'x-github-token': ghToken } }),
    connect: (monitorId: string, owner: string, repo: string, token: string, ghToken: string) =>
      apiFetch<any>(`/github/connect/${monitorId}`, token, {
        method: 'POST',
        body: JSON.stringify({ owner, repo }),
        headers: { 'x-github-token': ghToken },
      }),
  },
  securityIncidents: {
    listAll: (token: string) => apiFetch<SecurityIncident[]>('/security-incidents', token),
    resolve: (id: string, token: string) => apiFetch<void>(`/security-incidents/${id}/resolve`, token, { method: 'PATCH' }),
  },
  playground: {
    testEndpoint: (payload: { url: string; method: string; headers?: Record<string, string>; body?: any }, token: string) =>
      apiFetch<any>('/playground/test-endpoint', token, { method: 'POST', body: JSON.stringify(payload) }),
    auditCode: (payload: { code: string; language: string }, token: string) =>
      apiFetch<any>('/playground/audit-code', token, { method: 'POST', body: JSON.stringify(payload) }),
    inspectDomain: (payload: { domain: string }, token: string) =>
      apiFetch<any>('/playground/inspect-domain', token, { method: 'POST', body: JSON.stringify(payload) }),
    simulateAttack: (payload: { url: string; attackType: string }, token: string) =>
      apiFetch<any>('/playground/simulate-attack', token, { method: 'POST', body: JSON.stringify(payload) }),
    generatePatch: (payload: { code: string; findings: string; language?: string }, token: string) =>
      apiFetch<any>('/playground/generate-patch', token, { method: 'POST', body: JSON.stringify(payload) }),
    networkDiagnostics: (payload: { url: string }, token: string) =>
      apiFetch<any>('/playground/network-diagnostic', token, { method: 'POST', body: JSON.stringify(payload) }),
  },
};
