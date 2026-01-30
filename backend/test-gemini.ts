import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { identifyPlantFromImage } from './src/services/geminiService';

// بارگذاری متغیرهای محیطی
dotenv.config();

async function testGeminiIdentification() {
  console.log('🧪 شروع تست سرویس Gemini...\n');

  // مسیر عکس تست (باید یک عکس گیاه در پوشه uploads باشد)
  // شما می‌توانید مسیر عکس دلخواه خود را اینجا قرار دهید
  const imagePath = process.argv[2] || path.join(__dirname, 'uploads', 'test-plant.jpg');

  console.log(`📷 مسیر عکس: ${imagePath}`);

  // بررسی وجود فایل
  if (!fs.existsSync(imagePath)) {
    console.error('\n❌ خطا: فایل عکس پیدا نشد!');
    console.log('\n💡 راهنما:');
    console.log('   1. یک عکس گیاه را در پوشه uploads/ قرار دهید');
    console.log('   2. نام آن را test-plant.jpg بگذارید');
    console.log('   یا');
    console.log('   3. مسیر عکس خود را مشخص کنید:');
    console.log('      npm run test-gemini "مسیر\\عکس\\شما.jpg"\n');
    
    // نمایش فایل‌های موجود در uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
      if (files.length > 0) {
        console.log('📂 فایل‌های موجود در uploads/:');
        files.forEach(f => console.log(`   - ${f}`));
        console.log('\n💡 برای استفاده از یکی از فایل‌های بالا:');
        console.log(`   npm run test-gemini uploads/${files[0]}\n`);
      }
    }
    process.exit(1);
  }

  console.log('✓ فایل پیدا شد\n');

  try {
    console.log('⏳ در حال ارسال تصویر به Gemini...\n');
    
    const result = await identifyPlantFromImage(imagePath);

    console.log('✅ نتیجه شناسایی:\n');
    console.log('═══════════════════════════════════════════\n');
    console.log(`🌱 نام گیاه: ${result.name}`);
    console.log(`🔬 نام علمی: ${result.scientificName}`);
    console.log(`🌿 خانواده: ${result.family}`);
    console.log(`📝 توضیحات: ${result.description}\n`);
    
    console.log('🌤️ نیازهای گیاه:');
    console.log(`   ☀️ نور: ${result.needs.light}`);
    console.log(`   💧 آب: ${result.needs.water}`);
    console.log(`   🌡️ دما: ${result.needs.temperature}`);
    console.log(`   💨 رطوبت: ${result.needs.humidity}\n`);
    
    console.log(`💚 وضعیت سلامت: ${result.healthStatus}`);
    console.log(`🦠 بیماری: ${result.disease}`);
    console.log(`💊 درمان: ${result.treatment}\n`);
    
    console.log('💡 نکات مراقبتی:');
    result.careTips.forEach((tip, index) => {
      console.log(`   ${index + 1}. ${tip}`);
    });
    
    console.log(`\n🎯 میزان اطمینان: ${(result.confidence * 100).toFixed(1)}%\n`);
    console.log('═══════════════════════════════════════════\n');
    
  } catch (error: any) {
    console.error('❌ خطا در تست:', error.message);
    console.error('\nجزئیات خطا:', error);
    process.exit(1);
  }
}

// راهنما
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
استفاده:
  npm run test-gemini                    # استفاده از عکس پیش‌فرض
  npm run test-gemini path/to/image.jpg  # استفاده از عکس دلخواه

مثال:
  npm run test-gemini uploads/my-plant.jpg
  `);
  process.exit(0);
}

// اجرای تست
testGeminiIdentification();
