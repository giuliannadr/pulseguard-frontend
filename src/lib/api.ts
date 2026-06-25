// Include /api in the env var: e.g. http://localhost:3001/api or https://xxx.railway.app/api
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type MonitorStatus = 'up' | 'down' | 'degraded' | 'unknown';

export interface Monitor {
  id: string;
  userId: string;
  name: string;
  url: string;
  expectedStatus: number;
  expectedText?: string | null;
  intervalMinutes: number;
  isActive: boolean;
  githubRepoUrl?: string | null;
  githubWebhookId?: string | null;
  createdAt: string;
  updatedAt: string;
  checks?: Check[];
}

export interface Check {
  id: string;
  monitorId: string;
  status: MonitorStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  sslDaysLeft: number | null;
  errorMessage: string | null;
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
}

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
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
}

export const api = {
  monitors: {
    list:    (token: string) => apiFetch<Monitor[]>('/monitors', token),
    get:     (id: string, token: string) => apiFetch<Monitor>(`/monitors/${id}`, token),
    create:  (payload: CreateMonitorPayload, token: string) =>
               apiFetch<Monitor>('/monitors', token, { method: 'POST', body: JSON.stringify(payload) }),
    update:  (id: string, payload: Partial<CreateMonitorPayload & { isActive: boolean }>, token: string) =>
               apiFetch<Monitor>(`/monitors/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) }),
    delete:  (id: string, token: string) => apiFetch<void>(`/monitors/${id}`, token, { method: 'DELETE' }),
    checks:  (id: string, token: string, limit = 100) =>
               apiFetch<Check[]>(`/monitors/${id}/checks?limit=${limit}`, token),
    metrics: (id: string, token: string) => apiFetch<Metrics>(`/monitors/${id}/metrics`, token),
    securityIncidents: (id: string, token: string) => apiFetch<SecurityIncident[]>(`/monitors/${id}/security-incidents`, token),
    checkNow:(id: string, token: string) =>
               apiFetch<Check>(`/monitors/${id}/check-now`, token, { method: 'POST' }),
    scanRepo: (id: string, token: string, githubToken: string) =>
               apiFetch<any>(`/monitors/${id}/scan-repo`, token, { method: 'POST', headers: { 'x-github-token': githubToken } }),
  },
  github: {
    repos: (token: string, githubToken: string) => 
      apiFetch<any[]>('/github/repos', token, { headers: { 'x-github-token': githubToken } }),
    connect: (monitorId: string, owner: string, repo: string, token: string, githubToken: string) =>
      apiFetch<any>(`/github/connect/${monitorId}`, token, { 
        method: 'POST', 
        body: JSON.stringify({ owner, repo }),
        headers: { 'x-github-token': githubToken } 
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
  }
};
