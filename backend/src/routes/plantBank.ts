import { Router, Request, Response } from 'express';
import { query } from '../config/database';

const router = Router();

// دریافت لیست گیاهان با pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // دریافت تعداد کل
    const countResult = await query('SELECT COUNT(*) as total FROM plants');
    const total = parseInt(countResult.rows[0].total);
    
    // دریافت گیاهان
    const plantsResult = await query(
      `SELECT 
        id,
        name_fa,
        name,
        scientific_name,
        main_image_url,
        difficulty_level,
        light_requirement,
        watering_interval_days
      FROM plants
      ORDER BY id
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.json({
      success: true,
      data: {
        plants: plantsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + limit < total
        }
      }
    });
    
  } catch (error) {
    console.error('خطا در دریافت لیست گیاهان:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت لیست گیاهان'
    });
  }
});

// جستجو در گیاهان
router.get('/search', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.q as string || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    const searchPattern = `%${searchTerm}%`;
    
    // تعداد کل نتایج جستجو
    const countResult = await query(
      `SELECT COUNT(*) as total FROM plants 
       WHERE name_fa ILIKE $1 OR scientific_name ILIKE $1`,
      [searchPattern]
    );
    const total = parseInt(countResult.rows[0].total);
    
    // نتایج جستجو
    const plantsResult = await query(
      `SELECT 
        id,
        name_fa,
        name,
        scientific_name,
        main_image_url,
        difficulty_level,
        light_requirement,
        watering_interval_days
      FROM plants
      WHERE name_fa ILIKE $1 OR scientific_name ILIKE $1
      ORDER BY name_fa
      LIMIT $2 OFFSET $3`,
      [searchPattern, limit, offset]
    );
    
    res.json({
      success: true,
      data: {
        plants: plantsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + limit < total
        }
      }
    });
    
  } catch (error) {
    console.error('خطا در جستجوی گیاهان:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در جستجوی گیاهان'
    });
  }
});

// دریافت جزئیات یک گیاه
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const plantId = parseInt(req.params.id);
    
    // دریافت اطلاعات گیاه
    const plantResult = await query(
      `SELECT * FROM plants WHERE id = $1`,
      [plantId]
    );
    
    if (plantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'گیاه یافت نشد'
      });
    }
    
    // دریافت تصاویر اضافی
    const imagesResult = await query(
      `SELECT image_url FROM plant_images WHERE plant_id = $1`,
      [plantId]
    );
    
    const plant = plantResult.rows[0];
    plant.additional_images = imagesResult.rows.map(row => row.image_url);
    
    res.json({
      success: true,
      data: plant
    });
    
  } catch (error) {
    console.error('خطا در دریافت جزئیات گیاه:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت جزئیات گیاه'
    });
  }
});

export default router;
