import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gooldoon',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,
  // Keep-alive برای جلوگیری از قطع اتصال توسط سرور
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Export pool for health checks
export { pool };

// Test connection
pool.on('connect', () => {
  console.log('📦 اتصال به دیتابیس PostgreSQL برقرار شد');
});

// هندل خطای pool بدون کرش کردن اپ
pool.on('error', (err) => {
  console.error('❌ خطای غیرمنتظره دیتابیس:', err.message);
  console.error('🔄 Pool به صورت خودکار اتصال جدید ایجاد می‌کند...');
  // فقط لاگ بزن — pool خودش client خراب رو حذف و جایگزین می‌کنه
});

// Query helper function with auto-retry
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const maxRetries = 2;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const start = Date.now();
    let client;
    
    try {
      client = await pool.connect();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Query executed in ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const dbError = error as any;
      const isConnectionError = 
        dbError.code === 'ECONNREFUSED' ||
        dbError.code === 'ENOTFOUND' ||
        dbError.code === 'ETIMEDOUT' ||
        dbError.code === 'ECONNRESET' ||
        dbError.code === '57P01' || // admin shutdown
        dbError.message?.includes('Connection terminated') ||
        dbError.message?.includes('connection reset');
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`⚠️ اتصال دیتابیس قطع شد (تلاش ${attempt}/${maxRetries})، تلاش مجدد...`);
        // کمی صبر قبل از retry
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      console.error('❌ Query error:', error);
      if (dbError.code === 'ECONNREFUSED') {
        console.error('🔌 Database connection refused - is PostgreSQL running?');
      } else if (dbError.code === 'ENOTFOUND') {
        console.error('🔍 Database host not found');
      } else if (dbError.code === 'ETIMEDOUT') {
        console.error('⏰ Database connection timed out');
      }
      
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  // TypeScript safety — should never reach here
  throw new Error('Unexpected: query retry loop exhausted');
};

// Get a client for transactions
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

// Transaction helper
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Close pool
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('📦 اتصال دیتابیس بسته شد');
};

export default pool;
