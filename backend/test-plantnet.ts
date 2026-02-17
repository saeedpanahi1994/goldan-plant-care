import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function testPlantNet() {
  const apiKey = process.env.PLANTNET_API_KEY || '2b10wy00YCmcPSfAMT3NgY1u';
  
  console.log('🔍 تست PlantNet API...');
  console.log(`API Key: ${apiKey.substring(0, 8)}...`);
  
  // پیدا کردن یک تصویر تست
  const uploadsDir = path.join(__dirname, './uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.error('❌ فولدر uploads وجود ندارد');
    return;
  }
  
  const files = fs.readdirSync(uploadsDir).filter(f => 
    f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')
  );
  
  if (files.length === 0) {
    console.error('❌ هیچ تصویر تستی در uploads وجود ندارد');
    console.log('💡 لطفاً یک عکس گیاه در پوشه uploads قرار دهید');
    return;
  }
  
  // استفاده از تصویر واقعی از آپلودهای کاربران
  const preferredFile = files.find(f => f === '1769883015182-24453d4da18aa1b4.jpg') || files[0];
  const testImage = path.join(uploadsDir, preferredFile);
  console.log(`📷 استفاده از تصویر: ${preferredFile}`);
  
  const stats = fs.statSync(testImage);
  console.log(`📏 حجم فایل: ${(stats.size / 1024).toFixed(2)} KB`);
  
  try {
    const form = new FormData();
    form.append('organs', 'leaf');
    form.append('images', fs.createReadStream(testImage));
    
    const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(apiKey)}`;
    
    console.log('🚀 ارسال درخواست به PlantNet...');
    console.log(`URL: ${url.replace(apiKey, '***')}`);
    console.log('⏱️  Timeout: 60 ثانیه');
    
    const startTime = Date.now();
    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  زمان پاسخ: ${duration} ثانیه`);
    
    console.log('\n✅ پاسخ دریافت شد:');
    console.log('Status:', response.status);
    console.log('Data keys:', Object.keys(response.data));
    
    if (response.data.results && response.data.results.length > 0) {
      console.log('\n🌿 نتایج شناسایی:');
      response.data.results.slice(0, 3).forEach((result: any, index: number) => {
        const species = result.species;
        const score = (result.score * 100).toFixed(2);
        console.log(`\n${index + 1}. ${species.scientificName} (${score}%)`);
        console.log(`   نام‌های رایج: ${species.commonNames?.join(', ') || 'ندارد'}`);
        console.log(`   خانواده: ${species.family?.scientificName || 'نامشخص'}`);
      });
      
      const top = response.data.results[0];
      console.log('\n📋 نتیجه نهایی برای استفاده:');
      console.log({
        scientificName: top.species.scientificNameWithoutAuthor || top.species.scientificName,
        commonName: top.species.commonNames?.[0],
        confidence: top.score
      });
      
      console.log('\n✅ PlantNet API به‌درستی کار می‌کند!');
    } else {
      console.log('⚠️ هیچ نتیجه‌ای یافت نشد');
    }
    
  } catch (error: any) {
    console.error('\n❌ خطا در تست PlantNet:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.error('🔑 مشکل: API Key نامعتبر است');
      } else if (error.response.status === 429) {
        console.error('⚠️ مشکل: محدودیت تعداد درخواست (Rate Limit)');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Timeout: درخواست بیش از حد طول کشید');
      console.error('💡 احتمالاً فایل خیلی بزرگ است یا اتصال اینترنت کند است');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 مشکل: نمی‌توان به سرور PlantNet متصل شد');
    } else {
      console.error(error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testPlantNet().catch(console.error);
