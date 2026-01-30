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
  max: 10, // Maximum connections in pool (کاهش یافت)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // افزایش timeout
  allowExitOnIdle: false, // جلوگیری از خاموش شدن pool
});

// Export pool for health checks
export { pool };

// Test connection
pool.on('connect', () => {
  console.log('📦 اتصال به دیتابیس PostgreSQL برقرار شد');
});

pool.on('error', (err) => {
  console.error('❌ خطای دیتابیس:', err.message);
});

// Query helper function
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
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
    console.error('❌ Query error:', error);
    
    // Log additional info for debugging
    const dbError = error as any;
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
