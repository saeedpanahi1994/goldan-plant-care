import { query, withTransaction } from '../config/database';

// Initialize all database tables
export const initializeDatabase = async (): Promise<void> => {
  console.log('🔧 شروع ایجاد جداول دیتابیس...');

  try {
    // ===================================
    // 1. Users Table - کاربران
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(11) UNIQUE NOT NULL,
        name VARCHAR(100),
        avatar_url TEXT,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✅ جدول users ایجاد شد');

    // ===================================
    // 2. OTP Codes Table - کدهای تایید
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(11) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول otp_codes ایجاد شد');

    // ===================================
    // 3. Auth Tokens Table - توکن‌های احراز هویت
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS auth_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(64) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        device_info TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول auth_tokens ایجاد شد');

    // ===================================
    // 4. Rate Limits Table - محدودیت درخواست
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(11) NOT NULL,
        request_count INTEGER DEFAULT 1,
        window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول rate_limits ایجاد شد');

    // ===================================
    // 5. Gardens Table - باغچه‌ها
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS gardens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL DEFAULT 'باغچه من',
        description TEXT,
        location VARCHAR(200),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول gardens ایجاد شد');

    // ===================================
    // 6. Plant Categories Table - دسته‌بندی گیاهان
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS plant_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        name_fa VARCHAR(100) NOT NULL,
        icon VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول plant_categories ایجاد شد');

    // ===================================
    // 7. Plants Catalog Table - کاتالوگ گیاهان (اطلاعات مشترک)
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS plants (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES plant_categories(id) ON DELETE SET NULL,
        
        -- اطلاعات پایه
        name VARCHAR(100) NOT NULL,
        name_fa VARCHAR(100) NOT NULL,
        scientific_name VARCHAR(150),
        description TEXT,
        description_fa TEXT,
        
        -- تصاویر
        main_image_url TEXT,
        
        -- شرایط نگهداری استاندارد - آبیاری
        watering_interval_days INTEGER DEFAULT 7,
        watering_amount VARCHAR(50),
        watering_tips TEXT,
        
        -- شرایط نگهداری - نور
        light_requirement VARCHAR(50) CHECK (light_requirement IN ('direct', 'indirect', 'behind_curtain', 'low_light', 'no_light')),
        light_description TEXT,
        
        -- شرایط نگهداری - دما
        min_temperature INTEGER,
        max_temperature INTEGER,
        ideal_temperature INTEGER,
        temperature_tips TEXT,
        
        -- شرایط نگهداری - رطوبت
        needs_humidifier BOOLEAN DEFAULT false,
        humidity_level VARCHAR(50) CHECK (humidity_level IN ('low', 'medium', 'high')),
        humidity_tips TEXT,
        
        -- کوددهی
        fertilizer_interval_days INTEGER DEFAULT 30,
        fertilizer_type VARCHAR(100),
        fertilizer_tips TEXT,
        
        -- سایر اطلاعات
        difficulty_level VARCHAR(50) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
        is_toxic_to_pets BOOLEAN DEFAULT false,
        is_air_purifying BOOLEAN DEFAULT false,
        
        -- متادیتا
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول plants (catalog) ایجاد شد');

    // ===================================
    // 8. User Plants Table - گیاهان کاربران (نمونه‌های شخصی)
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS user_plants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        garden_id INTEGER REFERENCES gardens(id) ON DELETE CASCADE,
        plant_id INTEGER REFERENCES plants(id) ON DELETE CASCADE,
        
        -- اطلاعات شخصی‌سازی شده
        nickname VARCHAR(100),
        custom_watering_interval INTEGER,
        custom_fertilizer_interval INTEGER,
        notes TEXT,
        
        -- وضعیت
        health_status VARCHAR(50) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'needs_attention', 'sick', 'recovering')),
        acquired_date DATE,
        
        -- تاریخچه مراقبت
        last_watered_at TIMESTAMP WITH TIME ZONE,
        next_watering_at TIMESTAMP WITH TIME ZONE,
        last_fertilized_at TIMESTAMP WITH TIME ZONE,
        next_fertilizing_at TIMESTAMP WITH TIME ZONE,
        
        -- متادیتا
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول user_plants ایجاد شد');

    // ===================================
    // 9. Plant Images Table - تصاویر گیاهان (برای catalog)
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS plant_images (
        id SERIAL PRIMARY KEY,
        plant_id INTEGER REFERENCES plants(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        caption VARCHAR(200),
        is_main BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول plant_images ایجاد شد');

    // ===================================
    // 10. User Plant Images Table - تصاویر گیاهان کاربران
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS user_plant_images (
        id SERIAL PRIMARY KEY,
        user_plant_id INTEGER REFERENCES user_plants(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        caption VARCHAR(200),
        taken_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول user_plant_images ایجاد شد');

    // ===================================
    // 11. Care Activities Table - فعالیت‌های مراقبتی
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS care_activities (
        id SERIAL PRIMARY KEY,
        user_plant_id INTEGER REFERENCES user_plants(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('watering', 'fertilizing', 'pruning', 'repotting', 'pest_treatment', 'other')),
        notes TEXT,
        performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول care_activities ایجاد شد');

    // ===================================
    // 12. Notifications Table - نوتیفیکیشن‌ها
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_plant_id INTEGER REFERENCES user_plants(id) ON DELETE CASCADE,
        
        type VARCHAR(50) NOT NULL CHECK (type IN ('watering', 'fertilizing', 'health_check', 'custom')),
        title VARCHAR(200) NOT NULL,
        message TEXT,
        
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE,
        read_at TIMESTAMP WITH TIME ZONE,
        
        is_sent BOOLEAN DEFAULT false,
        is_read BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول notifications ایجاد شد');

    // ===================================
    // 13. Notification Settings Table - تنظیمات نوتیفیکیشن
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        
        watering_enabled BOOLEAN DEFAULT true,
        watering_time TIME DEFAULT '09:00:00',
        watering_days_before INTEGER DEFAULT 0,
        
        fertilizing_enabled BOOLEAN DEFAULT true,
        fertilizing_time TIME DEFAULT '09:00:00',
        fertilizing_days_before INTEGER DEFAULT 1,
        
        push_enabled BOOLEAN DEFAULT true,
        sms_enabled BOOLEAN DEFAULT false,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول notification_settings ایجاد شد');

    // ===================================
    // Create Indexes for Performance
    // ===================================
    await query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tokens_token ON auth_tokens(token);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tokens_user ON auth_tokens(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gardens_user ON gardens(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_user_plants_user ON user_plants(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_user_plants_garden ON user_plants(garden_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_user_plants_plant ON user_plants(plant_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_user_plants_watering ON user_plants(next_watering_at);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_user_plants_fertilizing ON user_plants(next_fertilizing_at);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_at);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_care_activities_user_plant ON care_activities(user_plant_id);`);
    console.log('✅ ایندکس‌ها ایجاد شدند');

    // ===================================
    // 14. Plant Chat History Table - تاریخچه چت گیاه
    // ===================================
    await query(`
      CREATE TABLE IF NOT EXISTS plant_chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plant_id INTEGER, -- Optional: link to generic plant or user plant if needed
        plant_name VARCHAR(200),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ جدول plant_chat_history ایجاد شد');
    await query(`CREATE INDEX IF NOT EXISTS idx_plant_chat_user ON plant_chat_history(user_id);`);

    // ===================================
    // Insert Default Plant Categories
    // ===================================
    await query(`
      INSERT INTO plant_categories (name, name_fa, icon, description)
      VALUES 
        ('indoor', 'گیاهان آپارتمانی', '🏠', 'گیاهان مناسب برای نگهداری در داخل منزل'),
        ('outdoor', 'گیاهان فضای باز', '🌳', 'گیاهان مناسب برای باغچه و فضای باز'),
        ('succulent', 'ساکولنت و کاکتوس', '🌵', 'گیاهان آبدوست با نیاز آبی کم'),
        ('flowering', 'گیاهان گلدار', '🌸', 'گیاهان با گل‌های زیبا'),
        ('herb', 'گیاهان دارویی', '🌿', 'گیاهان با خواص دارویی و معطر'),
        ('vegetable', 'سبزیجات', '🥬', 'سبزیجات و گیاهان خوراکی'),
        ('fruit', 'میوه‌ها', '🍎', 'درختان و گیاهان میوه‌دار'),
        ('bonsai', 'بونسای', '🌲', 'درختچه‌های مینیاتوری')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ دسته‌بندی‌های پیش‌فرض اضافه شدند');

    console.log('');
    console.log('🎉 تمام جداول دیتابیس با موفقیت ایجاد شدند!');
    console.log('');

  } catch (error) {
    console.error('❌ خطا در ایجاد جداول:', error);
    throw error;
  }
};

// Drop all tables (for development only)
export const dropAllTables = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Drop tables only allowed in development mode');
  }

  const tables = [
    'notifications',
    'notification_settings',
    'care_activities',
    'user_plant_images',
    'user_plants',
    'plant_images',
    'plants',
    'plant_categories',
    'gardens',
    'rate_limits',
    'auth_tokens',
    'otp_codes',
    'users'
  ];

  for (const table of tables) {
    await query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    console.log(`🗑️ جدول ${table} حذف شد`);
  }
};

export default initializeDatabase;
