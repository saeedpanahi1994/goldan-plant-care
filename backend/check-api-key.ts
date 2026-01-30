import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";

async function checkApiKeyStatus() {
  console.log('🔑 بررسی وضعیت API Key...\n');
  console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 5)}\n`);

  try {
    // 1. دریافت لیست مدل‌های در دسترس
    console.log('📋 در حال دریافت لیست مدل‌های در دسترس...\n');
    const modelsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`
    );

    if (!modelsResponse.ok) {
      throw new Error(`خطا: ${modelsResponse.status} ${modelsResponse.statusText}`);
    }

    const modelsData = await modelsResponse.json();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ API Key معتبر است و کار می‌کند!\n');
    
    console.log('📊 تعداد مدل‌های در دسترس:', modelsData.models.length);
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('🤖 مدل‌های موجود:\n');
    
    let visionModels: any[] = [];
    let textModels: any[] = [];
    let embeddingModels: any[] = [];
    
    modelsData.models.forEach((model: any, index: number) => {
      const supportedMethods = model.supportedGenerationMethods || [];
      
      // دسته‌بندی مدل‌ها
      if (supportedMethods.includes('generateContent')) {
        if (model.name.includes('vision') || model.name.includes('flash') || model.name.includes('pro')) {
          visionModels.push(model);
        } else {
          textModels.push(model);
        }
      } else if (supportedMethods.includes('embedContent')) {
        embeddingModels.push(model);
      }
    });

    // نمایش مدل‌های Vision/Multimodal (برای تصویر)
    if (visionModels.length > 0) {
      console.log('🖼️  مدل‌های تشخیص تصویر (Vision/Multimodal):');
      console.log('═══════════════════════════════════════════════════════════════');
      visionModels.forEach((model: any) => {
        console.log(`\n   ✓ ${model.name}`);
        console.log(`     نام نمایشی: ${model.displayName}`);
        if (model.description) {
          console.log(`     توضیحات: ${model.description.substring(0, 100)}...`);
        }
        console.log(`     متدهای پشتیبانی شده: ${model.supportedGenerationMethods.join(', ')}`);
        if (model.inputTokenLimit) {
          console.log(`     محدودیت ورودی: ${model.inputTokenLimit.toLocaleString()} توکن`);
        }
        if (model.outputTokenLimit) {
          console.log(`     محدودیت خروجی: ${model.outputTokenLimit.toLocaleString()} توکن`);
        }
      });
      console.log('\n');
    }

    // نمایش مدل‌های متنی
    if (textModels.length > 0) {
      console.log('📝 مدل‌های متنی:');
      console.log('═══════════════════════════════════════════════════════════════');
      textModels.forEach((model: any) => {
        console.log(`\n   ✓ ${model.name}`);
        console.log(`     نام نمایشی: ${model.displayName}`);
        if (model.inputTokenLimit) {
          console.log(`     محدودیت ورودی: ${model.inputTokenLimit.toLocaleString()} توکن`);
        }
      });
      console.log('\n');
    }

    // نمایش مدل‌های Embedding
    if (embeddingModels.length > 0) {
      console.log('🔢 مدل‌های Embedding:');
      console.log('═══════════════════════════════════════════════════════════════');
      embeddingModels.forEach((model: any) => {
        console.log(`\n   ✓ ${model.name}`);
        console.log(`     نام نمایشی: ${model.displayName}`);
      });
      console.log('\n');
    }

    // اطلاعات محدودیت‌ها
    console.log('📊 محدودیت‌های API (پلن رایگان):');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   • درخواست در دقیقه (RPM): 15 درخواست');
    console.log('   • درخواست در روز (RPD): 1,500 درخواست');
    console.log('   • توکن در دقیقه (TPM): 1,000,000 توکن');
    console.log('   • توکن در روز (TPD): محدودیت ندارد\n');

    console.log('💡 توصیه‌ها:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   ✓ برای شناسایی گیاه از مدل gemini-2.5-flash استفاده کنید');
    console.log('   ✓ برای محدود نشدن، بین درخواست‌ها 4 ثانیه فاصله بگذارید');
    console.log('   ✓ برای دقت بیشتر، تصاویر با کیفیت بالا و واضح ارسال کنید');
    console.log('   ✓ حداکثر اندازه تصویر: 4MB (توصیه می‌شود کمتر از 1MB باشد)\n');

    console.log('🔒 امنیت:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   ⚠️  API Key را هرگز در کد Frontend قرار ندهید');
    console.log('   ✓ همیشه از طریق Backend به API دسترسی داشته باشید');
    console.log('   ✓ API Key را در فایل .env نگهداری کنید');
    console.log('   ✓ فایل .env را به .gitignore اضافه کنید\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ خطا در بررسی API Key:\n');
    
    if (error.message.includes('401')) {
      console.error('   🔴 API Key نامعتبر است!');
      console.error('   → لطفاً API Key خود را از https://aistudio.google.com بررسی کنید\n');
    } else if (error.message.includes('403')) {
      console.error('   🔴 دسترسی رد شد! API Key ممکن است منقضی شده باشد.');
      console.error('   → یک API Key جدید از Google AI Studio بگیرید\n');
    } else if (error.message.includes('429')) {
      console.error('   🔴 محدودیت تعداد درخواست!');
      console.error('   → لطفاً چند دقیقه صبر کنید و دوباره تلاش کنید\n');
    } else {
      console.error('   خطا:', error.message, '\n');
    }
    
    process.exit(1);
  }
}

// تست ساده برای بررسی دسترسی
async function testSimpleRequest() {
  console.log('🧪 تست ساده (ارسال یک درخواست متنی)...\n');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'سلام! چطوری؟' }]
          }]
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('✅ تست موفق! API به درستی پاسخ می‌دهد.');
      console.log(`📨 پاسخ نمونه: ${data.candidates[0].content.parts[0].text.substring(0, 50)}...\n`);
    } else {
      console.log('⚠️  تست با خطا مواجه شد:', response.status, response.statusText, '\n');
    }
  } catch (error: any) {
    console.log('⚠️  تست با خطا مواجه شد:', error.message, '\n');
  }
}

// اجرا
(async () => {
  await checkApiKeyStatus();
  await testSimpleRequest();
})();
