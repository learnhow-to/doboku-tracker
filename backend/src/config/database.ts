import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { config } from './env.js';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DatabaseClient {
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
  exec: (sql: string) => Promise<void>;
  close: () => Promise<void>;
  isPGlite: boolean;
}

let dbInstance: DatabaseClient | null = null;

export async function getDatabase(): Promise<DatabaseClient> {
  if (dbInstance) return dbInstance;

  const url = config.databaseUrl;
  const isPostgresUrl = url && (url.startsWith('postgres://') || url.startsWith('postgresql://'));

  if (isPostgresUrl) {
    console.log(`[DATABASE] Connecting to PostgreSQL at ${url.replace(/:[^:@]+@/, ':***@')}`);
    const pool = new pg.Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    dbInstance = {
      isPGlite: false,
      query: async <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
        const res = await pool.query(text, params);
        return {
          rows: res.rows as T[],
          rowCount: res.rowCount ?? res.rows.length,
        };
      },
      exec: async (sql: string): Promise<void> => {
        await pool.query(sql);
      },
      close: async () => {
        await pool.end();
        dbInstance = null;
      },
    };
  } else {
    console.warn('\n================================================================================');
    console.warn('[DEVELOPMENT/TEST NOTICE] Running embedded PGlite (WebAssembly PostgreSQL).');
    console.warn('Opsi database alternatif untuk tes/dev cepat ini diberi label jelas dan');
    console.warn('TIDAK dianggap setara dengan pengujian PostgreSQL produksi.');
    console.warn('================================================================================\n');

    const pglite = new PGlite();

    dbInstance = {
      isPGlite: true,
      query: async <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
        const res = await pglite.query(text, params);
        return {
          rows: (res.rows || []) as T[],
          rowCount: res.rows ? res.rows.length : 0,
        };
      },
      exec: async (sql: string): Promise<void> => {
        await pglite.exec(sql);
      },
      close: async () => {
        await pglite.close();
        dbInstance = null;
      },
    };
  }

  return dbInstance;
}

export async function exec(sql: string): Promise<void> {
  const db = await getDatabase();
  return db.exec(sql);
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const db = await getDatabase();
  return db.query<T>(text, params);
}
