const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gooldoon',
  user: 'postgres',
  password: '12345678',
});

// تابع برای تبدیل URL تصاویر
function transformImageUrl(originalUrl) {
  if (!originalUrl) return null;
  
  // مثال: https://planta.vsrv.ir/storage/plant/August2022/hbcbD19uCTbqBcTqmCQD.jpg
  // به: http://130.185.76.46:4380/storage/plant/hbcbD19uCTbqBcTqmCQD.jpg
  
  const urlPattern = /https:\/\/planta\.vsrv\.ir\/storage\/plant\/[^\/]+\/(.+)/;
  const match = originalUrl.match(urlPattern);
  
  if (match && match[1]) {
    return `http://130.185.76.46:4380/storage/plant/${match[1]}`;
  }
  
  return originalUrl;
}

// تابع برای تعیین سطح نور
function determineLightRequirement(lightMin, lightMax) {
  if (lightMax < 500) return 'no_light';
  if (lightMax < 2000) return 'low_light';
  if (lightMax < 10000) return 'behind_curtain';
  if (lightMax < 15000) return 'indirect';
  return 'direct';
}

// تابع برای تعیین سطح رطوبت
function determineHumidityLevel(humidityMin, humidityMax) {
  const avgHumidity = (humidityMin + humidityMax) / 2;
  if (avgHumidity < 40) return 'low';
  if (avgHumidity < 70) return 'medium';
  return 'high';
}

// تابع برای تعیین سطح سختی
function determineDifficultyLevel(difficulty) {
  if (difficulty === 1) return 'easy';
  if (difficulty === 2) return 'medium';
  return 'hard';
}

// تابع برای import یک گیاه
async function importPlant(plantData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // تبدیل URL تصویر اصلی
    const mainImageUrl = transformImageUrl(plantData.mainPic);
    
    // Insert به جدول plants
    const insertQuery = `
      INSERT INTO plants (
        name_fa,
        name,
        scientific_name,
        description_fa,
        main_image_url,
        watering_interval_days,
        watering_tips,
        light_requirement,
        light_description,
        min_temperature,
        max_temperature,
        humidity_level,
        needs_humidifier,
        humidity_tips,
        difficulty_level,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING id;
    `;
    
    const wateringInterval = plantData.waterMin && plantData.waterMax 
      ? Math.round((plantData.waterMin + plantData.waterMax) / 2)
      : 7;
    
    const lightRequirement = determineLightRequirement(plantData.lightMin, plantData.lightMax);
    const humidityLevel = determineHumidityLevel(plantData.humidityMin, plantData.humidityMax);
    const difficultyLevel = determineDifficultyLevel(plantData.difficulty);
    const needsHumidifier = humidityLevel === 'high';
    
    const values = [
      plantData.name,                    // name_fa
      plantData.name,                    // name (فعلا همان نام فارسی)
      plantData.sciName,                 // scientific_name
      plantData.description,             // description_fa
      mainImageUrl,                      // main_image_url
      wateringInterval,                  // watering_interval_days
      plantData.howToWater,              // watering_tips
      lightRequirement,                  // light_requirement
      plantData.howToLight,              // light_description
      plantData.tempMin,                 // min_temperature
      plantData.tempMax,                 // max_temperature
      humidityLevel,                     // humidity_level
      needsHumidifier,                   // needs_humidifier
      plantData.howToSoil,               // humidity_tips (استفاده از howToSoil)
      difficultyLevel                    // difficulty_level
    ];
    
    const result = await client.query(insertQuery, values);
    const plantId = result.rows[0].id;
    
    // Insert تصاویر اضافی
    if (plantData.pics && Array.isArray(plantData.pics)) {
      for (const pic of plantData.pics) {
        const transformedPicUrl = transformImageUrl(pic);
        if (transformedPicUrl) {
          await client.query(
            `INSERT INTO plant_images (plant_id, image_url, is_main, created_at) 
             VALUES ($1, $2, false, NOW())`,
            [plantId, transformedPicUrl]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    console.log(`✅ گیاه "${plantData.name}" با موفقیت import شد (ID: ${plantId})`);
    return plantId;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ خطا در import گیاه "${plantData.name}":`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

// تابع اصلی
async function main() {
  console.log('🌱 شروع import داده‌های گیاهان...\n');
  
  try {
    // تست اتصال به دیتابیس
    await pool.query('SELECT NOW()');
    console.log('✅ اتصال به دیتابیس برقرار است\n');
    
    // خواندن تمام فایل‌های JSON
    const dataDir = path.join(__dirname, 'gol_gadering', 'plant_data');
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    
    console.log(`📁 تعداد ${files.length} فایل پیدا شد\n`);
    
    let totalPlants = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // پردازش هر فایل
    for (const file of files) {
      console.log(`📄 در حال پردازش ${file}...`);
      
      const filePath = path.join(dataDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      
      if (jsonData.data && Array.isArray(jsonData.data)) {
        totalPlants += jsonData.data.length;
        
        for (const plant of jsonData.data) {
          try {
            await importPlant(plant);
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      }
      
      console.log('');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 خلاصه نتایج:');
    console.log(`   کل گیاهان: ${totalPlants}`);
    console.log(`   موفق: ${successCount}`);
    console.log(`   خطا: ${errorCount}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ خطای کلی:', error);
  } finally {
    await pool.end();
    console.log('\n✅ اتصال به دیتابیس بسته شد');
  }
}

// اجرای برنامه
main().catch(console.error);
