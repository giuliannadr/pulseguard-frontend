const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

export interface Metrics {
  uptime: number | null;
  avgResponseMs: number | null;
  totalChecks: number;
}

export interface CreateMonitorPayload {
  name: string;
  url: string;
  expectedStatus?: number;
  expectedText?: string;
  intervalMinutes?: number;
}

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
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
    checkNow:(id: string, token: string) =>
               apiFetch<Check>(`/monitors/${id}/check-now`, token, { method: 'POST' }),
  },
};
