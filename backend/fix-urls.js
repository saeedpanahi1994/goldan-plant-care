const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'gooldoon',
  user: 'postgres',
  password: '12345678'
});

async function fixUrls() {
  try {
    // Update plants main_image_url - change from planta.vsrv.ir back to our server
    const result1 = await pool.query(`
      UPDATE plants 
      SET main_image_url = REPLACE(main_image_url, 'https://planta.vsrv.ir/storage/plant/', 'http://130.185.76.46:4380/storage/plant/')
      WHERE main_image_url LIKE 'https://planta.vsrv.ir%'
    `);
    console.log('Plants updated:', result1.rowCount);

    // Update plant_images
    const result2 = await pool.query(`
      UPDATE plant_images 
      SET image_url = REPLACE(image_url, 'https://planta.vsrv.ir/storage/plant/', 'http://130.185.76.46:4380/storage/plant/')
      WHERE image_url LIKE 'https://planta.vsrv.ir%'
    `);
    console.log('Plant images updated:', result2.rowCount);

    // Verify
    const check = await pool.query('SELECT main_image_url FROM plants LIMIT 3');
    console.log('Sample URLs after fix:', check.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixUrls();
