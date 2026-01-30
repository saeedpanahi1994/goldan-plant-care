const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gooldoon',
  user: 'postgres',
  password: '12345678',
});

async function testData() {
  try {
    // تعداد کل
    const countResult = await pool.query('SELECT COUNT(*) as total FROM plants');
    console.log('تعداد کل گیاهان:', countResult.rows[0].total);
    
    // نمونه گیاهان
    const sampleResult = await pool.query(`
      SELECT id, name_fa, scientific_name, main_image_url 
      FROM plants 
      ORDER BY id 
      LIMIT 5
    `);
    
    console.log('\nنمونه گیاهان:');
    sampleResult.rows.forEach(plant => {
      console.log(`  ${plant.id}. ${plant.name_fa} (${plant.scientific_name})`);
      console.log(`     تصویر: ${plant.main_image_url}\n`);
    });
    
    // تعداد تصاویر
    const imagesResult = await pool.query('SELECT COUNT(*) as total FROM plant_images');
    console.log('تعداد تصاویر اضافی:', imagesResult.rows[0].total);
    
  } catch (error) {
    console.error('خطا:', error);
  } finally {
    await pool.end();
  }
}

testData();
