import { dropAllTables, initializeDatabase } from './src/config/schema';

async function reset() {
  try {
    console.log('🗑️ حذف تمام جداول...');
    await dropAllTables();
    console.log('✅ تمام جداول حذف شدند');
    
    console.log('');
    console.log('🔧 ایجاد جداول جدید...');
    await initializeDatabase();
    
    console.log('');
    console.log('🎉 دیتابیس با موفقیت ری‌ست شد!');
    process.exit(0);
  } catch (error) {
    console.error('❌ خطا:', error);
    process.exit(1);
  }
}

reset();
