const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gooldoon',
  user: 'postgres',
  password: '12345678',
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  try {
    console.log('🔄 در حال تست اتصال به دیتابیس...');
    const client = await pool.connect();
    console.log('✅ اتصال موفق!');
    
    const result = await client.query('SELECT NOW()');
    console.log('⏰ زمان سرور:', result.rows[0].now);
    
    client.release();
    
    // تست query ساده
    const testQuery = await pool.query('SELECT version()');
    console.log('🐘 نسخه PostgreSQL:', testQuery.rows[0].version.split(' ')[1]);
    
  } catch (error) {
    console.error('❌ خطا در اتصال:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 سرور PostgreSQL پیدا نشد');
    } else if (error.code === '3D000') {
      console.log('💡 دیتابیس "gooldoon" وجود ندارد');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 PostgreSQL در حال اجرا نیست یا پورت 5432 باز نیست');
    } else if (error.code === '28P01') {
      console.log('💡 اطلاعات کاربری (نام کاربری یا رمز عبور) اشتباه است');
    }
  } finally {
    pool.end();
  }
}

testConnection();