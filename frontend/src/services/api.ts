import { enqueueSyncOperation, getPendingSyncOperations, removeSyncOperation } from './db.js';

let authToken: string | null = localStorage.getItem('doboku_token');
let currentUserId: string | null = localStorage.getItem('doboku_user_id');

export function setAuthSession(token: string | null, userId: string | null) {
  authToken = token;
  currentUserId = userId;
  if (token) {
    localStorage.setItem('doboku_token', token);
    localStorage.setItem('doboku_user_id', userId || '');
  } else {
    localStorage.removeItem('doboku_token');
    localStorage.removeItem('doboku_user_id');
  }
}

export function getAuthToken() {
  return authToken;
}

export function getCurrentUserId() {
  return currentUserId;
}

export interface ApiRequestOptions extends RequestInit {
  idempotencyKey?: string;
  skipQueue?: boolean;
}

export async function apiRequest<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  if (options.idempotencyKey) {
    headers.set('X-Idempotency-Key', options.idempotencyKey);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 409) {
      const errorData = await res.json();
      const conflictError: any = new Error(errorData.error || 'Conflict');
      conflictError.status = 409;
      conflictError.currentServerData = errorData.currentServerData;
      throw conflictError;
    }

    if (!res.ok) {
      let msg = `HTTP error ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error) msg = errJson.error;
      } catch (_) {}
      const error: any = new Error(msg);
      error.status = res.status;
      throw error;
    }

    // Check if HTML or JSON response
    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      return (await res.text()) as unknown as T;
    }

    return await res.json();
  } catch (err: any) {
    // Check if network offline or fetch failed
    const isNetworkError = !navigator.onLine || err.name === 'TypeError' || err.message.includes('Failed to fetch');

    if (isNetworkError && !options.skipQueue && (options.method === 'POST' || options.method === 'PUT') && currentUserId) {
      console.warn('[OFFLINE SYNC] Network error detected. Enqueueing mutation to IndexedDB...');
      const idemKey = options.idempotencyKey || crypto.randomUUID();
      await enqueueSyncOperation({
        idempotencyKey: idemKey,
        userId: currentUserId,
        organizationId: '',
        url,
        method: options.method as 'POST' | 'PUT',
        payload: options.body ? JSON.parse(options.body as string) : null,
        createdAt: Date.now(),
        retryCount: 0,
        lastError: err.message,
      });

      const queuedError: any = new Error('オフラインです。データは端末（IndexedDB）に安全に保存され、通信復帰時に送信されます。');
      queuedError.isOfflineQueued = true;
      throw queuedError;
    }

    throw err;
  }
}

export async function processSyncQueue(userId: string, onProgress?: (msg: string) => void): Promise<{ processed: number; errors: number }> {
  const pending = await getPendingSyncOperations(userId);
  let processed = 0;
  let errors = 0;

  for (const op of pending) {
    try {
      if (onProgress) onProgress(`同期中: ${op.url}`);
      await apiRequest(op.url, {
        method: op.method,
        idempotencyKey: op.idempotencyKey,
        body: op.payload ? JSON.stringify(op.payload) : undefined,
        skipQueue: true,
      });
      await removeSyncOperation(op.idempotencyKey);
      processed++;
    } catch (err: any) {
      console.error('[SYNC QUEUE ERROR]', err);
      errors++;
      if (err.status === 409) {
        // Stop queue on conflict until user resolves
        break;
      }
    }
  }

  return { processed, errors };
}

// Master Data API Helpers
export async function getMasterWorkers(includeInactive = false) {
  return apiRequest(`/api/master/workers?includeInactive=${includeInactive}`);
}

export async function createMasterWorker(data: any) {
  return apiRequest('/api/master/workers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMasterWorker(id: string, data: any) {
  return apiRequest(`/api/master/workers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMasterWorker(id: string) {
  return apiRequest(`/api/master/workers/${id}`, {
    method: 'DELETE',
  });
}

export async function getMasterEquipment(includeInactive = false) {
  return apiRequest(`/api/master/equipment?includeInactive=${includeInactive}`);
}

export async function createMasterEquipment(data: any) {
  return apiRequest('/api/master/equipment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMasterEquipment(id: string, data: any) {
  return apiRequest(`/api/master/equipment/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMasterEquipment(id: string) {
  return apiRequest(`/api/master/equipment/${id}`, {
    method: 'DELETE',
  });
}

export async function createProject(data: any) {
  return apiRequest('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string, data: any) {
  return apiRequest(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Analytics & Export API Helpers
export async function getAnalyticsSummary(params: { projectId?: string; startDate?: string; endDate?: string } = {}) {
  const query = new URLSearchParams();
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  return apiRequest(`/api/reports/analytics/summary?${query.toString()}`);
}

export async function getWorkforceSummary(params: { projectId?: string; startDate?: string; endDate?: string } = {}) {
  const query = new URLSearchParams();
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  return apiRequest(`/api/reports/export/summary/workforce?${query.toString()}`);
}

export async function getEquipmentSummary(params: { projectId?: string; startDate?: string; endDate?: string } = {}) {
  const query = new URLSearchParams();
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  return apiRequest(`/api/reports/export/summary/equipment?${query.toString()}`);
}

export async function getWorkItemsSummary(params: { projectId?: string; startDate?: string; endDate?: string } = {}) {
  const query = new URLSearchParams();
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  return apiRequest(`/api/reports/export/summary/work-items?${query.toString()}`);
}

export function getCsvDownloadUrl(type: 'workforce' | 'equipment' | 'work-items', params: { projectId?: string; startDate?: string; endDate?: string } = {}) {
  const query = new URLSearchParams();
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  const token = getAuthToken();
  if (token) query.set('token', token);
  return `/api/reports/export/csv/${type}?${query.toString()}`;
}

export function getExcelDownloadUrl(type: 'workforce' | 'equipment' | 'work-items', params: { projectId?: string; startDate?: string; endDate?: string } = {}) {
  const query = new URLSearchParams();
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  const token = getAuthToken();
  if (token) query.set('token', token);
  return `/api/reports/export/excel/${type}?${query.toString()}`;
}

export async function getLatestPreviousReport(projectId: string, beforeDate?: string) {
  const query = new URLSearchParams();
  if (beforeDate) query.set('beforeDate', beforeDate);
  return apiRequest(`/api/reports/project/${projectId}/latest-previous?${query.toString()}`);
}

export async function getMonthlyMatrix(projectId: string, yearMonth: string) {
  const query = new URLSearchParams();
  if (yearMonth) query.set('yearMonth', yearMonth);
  return apiRequest(`/api/reports/project/${projectId}/monthly-matrix?${query.toString()}`);
}

export async function batchApproveReports(reportIds: string[]) {
  return apiRequest('/api/reports/batch-approve', {
    method: 'POST',
    body: JSON.stringify({ reportIds }),
  });
}


