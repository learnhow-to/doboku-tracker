import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'memory',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    jwtSecret: process.env.SUPABASE_JWT_SECRET || 'doboku_dev_jwt_secret_change_in_production',
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local') as 'local' | 'supabase',
    localDir: process.env.STORAGE_LOCAL_DIR || './uploads/photos',
    bucketName: process.env.STORAGE_BUCKET_NAME || 'project-photos',
  },
  demoModeAllowed: process.env.DEMO_MODE_ALLOWED === 'true',
};

if (config.nodeEnv === 'production') {
  if (config.demoModeAllowed) {
    throw new Error('FATAL SECURITY POLICY: Demo mode is strictly forbidden in production!');
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'memory') {
    throw new Error('FATAL: Production requires a valid managed PostgreSQL connection string in DATABASE_URL.');
  }
}
