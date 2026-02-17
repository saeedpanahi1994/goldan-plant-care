import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as dotenv from 'dotenv';

dotenv.config();

async function testPlantNetWithResize() {
  const apiKey = process.env.PLANTNET_API_KEY || '2b10wy00YCmcPSfAMT3NgY1u';
  
  console.log('🔍 تست PlantNet API با Resize...');
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
    return;
  }
  
  // استفاده از یک تصویر واقعی
  const preferredFile = files.find(f => f === '1769883015182-24453d4da18aa1b4.jpg') || files[0];
  const originalImage = path.join(uploadsDir, preferredFile);
  console.log(`📷 تصویر اصلی: ${preferredFile}`);
  
  const originalStats = fs.statSync(originalImage);
  console.log(`📏 حجم اصلی: ${(originalStats.size / 1024).toFixed(2)} KB`);
  
  // Resize تصویر به 800px
  const resizedImage = path.join(__dirname, 'temp-resized.jpg');
  console.log('🔄 در حال resize تصویر به 800px...');
  
  await sharp(originalImage)
    .resize(800, 800, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 })
    .toFile(resizedImage);
  
  const resizedStats = fs.statSync(resizedImage);
  console.log(`✅ حجم بعد از resize: ${(resizedStats.size / 1024).toFixed(2)} KB`);
  
  try {
    const form = new FormData();
    form.append('organs', 'leaf');
    form.append('images', fs.createReadStream(resizedImage));
    
    const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(apiKey)}`;
    
    console.log('🚀 ارسال درخواست به PlantNet...');
    console.log('⏱️  Timeout: 60 ثانیه\n');
    
    const startTime = Date.now();
    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  مدت زمان: ${duration} ثانیه\n`);
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      console.log('✅ موفقیت! نتایج:');
      console.log('═══════════════════════════════════════\n');
      
      response.data.results.slice(0, 3).forEach((result: any, index: number) => {
        console.log(`${index + 1}. ${result.species.scientificNameWithoutAuthor}`);
        console.log(`   نام عمومی: ${result.species.commonNames?.join(', ') || 'ندارد'}`);
        console.log(`   اطمینان: ${(result.score * 100).toFixed(1)}%`);
        console.log();
      });
    } else {
      console.log('⚠️  پاسخ دریافت شد اما نتیجه‌ای یافت نشد');
      console.log('پاسخ کامل:', JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    console.log('❌ خطا در تست PlantNet:');
    
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️ Timeout: درخواست بیش از حد طول کشید');
    } else if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ENOTFOUND') {
      console.log('🌐 خطای اتصال: دامنه یافت نشد');
    } else {
      console.log('پیام:', error.message);
    }
  } finally {
    // پاک کردن فایل موقت
    if (fs.existsSync(resizedImage)) {
      fs.unlinkSync(resizedImage);
      console.log('\n🗑️  فایل موقت پاک شد');
    }
  }
}

testPlantNetWithResize();
