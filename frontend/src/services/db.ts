import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface QueuedOperation {
  idempotencyKey: string;
  userId: string;
  organizationId: string;
  url: string;
  method: 'POST' | 'PUT';
  payload: any;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface LocalReportDraft {
  localId: string;
  serverId?: string;
  userId: string;
  organizationId: string;
  projectId: string;
  data: any;
  version: number;
  lastSavedAt: number;
  syncStatus: 'saved_locally' | 'syncing' | 'synced' | 'conflict' | 'failed';
  conflictServerData?: any;
}

interface DobokuDB extends DBSchema {
  drafts: {
    key: string; // localId
    value: LocalReportDraft;
    indexes: { 'by-user': string; 'by-project': string };
  };
  sync_queue: {
    key: string; // idempotencyKey
    value: QueuedOperation;
    indexes: { 'by-user': string };
  };
}

let dbPromise: Promise<IDBPDatabase<DobokuDB>> | null = null;

export function getLocalDB() {
  if (!dbPromise) {
    dbPromise = openDB<DobokuDB>('doboku_tracker_offline_v1', 1, {
      upgrade(db) {
        const draftStore = db.createObjectStore('drafts', { keyPath: 'localId' });
        draftStore.createIndex('by-user', 'userId');
        draftStore.createIndex('by-project', 'projectId');

        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'idempotencyKey' });
        queueStore.createIndex('by-user', 'userId');
      },
    });
  }
  return dbPromise;
}

export async function saveLocalDraft(draft: LocalReportDraft): Promise<void> {
  const db = await getLocalDB();
  await db.put('drafts', draft);
}

export async function getLocalDraft(localId: string): Promise<LocalReportDraft | undefined> {
  const db = await getLocalDB();
  return db.get('drafts', localId);
}

export async function getDraftsForUser(userId: string): Promise<LocalReportDraft[]> {
  const db = await getLocalDB();
  return db.getAllFromIndex('drafts', 'by-user', userId);
}

export async function enqueueSyncOperation(op: QueuedOperation): Promise<void> {
  const db = await getLocalDB();
  await db.put('sync_queue', op);
}

export async function getPendingSyncOperations(userId: string): Promise<QueuedOperation[]> {
  const db = await getLocalDB();
  return db.getAllFromIndex('sync_queue', 'by-user', userId);
}

export async function removeSyncOperation(idempotencyKey: string): Promise<void> {
  const db = await getLocalDB();
  await db.delete('sync_queue', idempotencyKey);
}

export async function getPendingQueueCount(userId: string): Promise<number> {
  const pending = await getPendingSyncOperations(userId);
  return pending.length;
}
