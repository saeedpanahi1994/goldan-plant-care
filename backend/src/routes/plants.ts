import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import * as plantService from '../services/plantService';
import { getUserTier, getUserPlantCount, PLAN_LIMITS } from './subscription';
import { query } from '../config/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = Router();

// Helper to safely get param as string
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

// ===================================
// GET /api/plants - Get all user plants
// ===================================
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const plants = await plantService.getAllUserPlants(user.id);

    res.json({
      success: true,
      plants
    });
  } catch (error) {
    console.error('Get plants error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت لیست گیاهان'
    });
  }
});

// ===================================
// GET /api/plants/catalog - Get plant catalog
// ===================================
router.get('/catalog', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.search as string;
    
    let plants;
    if (searchTerm) {
      plants = await plantService.searchPlantsInCatalog(searchTerm);
    } else {
      plants = await plantService.getAllPlantsFromCatalog();
    }

    res.json({
      success: true,
      plants
    });
  } catch (error) {
    console.error('Get catalog error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت کاتالوگ گیاهان'
    });
  }
});

// ===================================
// GET /api/plants/categories - Get plant categories
// ===================================
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await plantService.getAllCategories();

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت دسته‌بندی‌ها'
    });
  }
});

// ===================================
// GET /api/plants/needs-water - Plants needing water
// ===================================
router.get('/needs-water', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const plants = await plantService.getPlantsNeedingWater(user.id);

    res.json({
      success: true,
      plants,
      count: plants.length
    });
  } catch (error) {
    console.error('Get plants needing water error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت گیاهان نیازمند آبیاری'
    });
  }
});

// ===================================
// GET /api/plants/stats - Get user stats
// ===================================
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const stats = await plantService.getUserStats(user.id);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت آمار'
    });
  }
});

// ===================================
// GET /api/plants/:id - Get single user plant
// ===================================
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));

    const plant = await plantService.getUserPlantById(userPlantId, user.id);

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'گیاه یافت نشد'
      });
    }

    // Get recent care activities
    const activities = await plantService.getCareActivities(userPlantId, user.id);

    res.json({
      success: true,
      plant,
      activities
    });
  } catch (error) {
    console.error('Get plant error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت اطلاعات گیاه'
    });
  }
});

// ===================================
// POST /api/plants - Add plant to garden from catalog
// ===================================
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { garden_id, plant_id, nickname, custom_watering_interval, custom_fertilizer_interval, acquired_date, notes } = req.body;

    // بررسی محدودیت تعداد گیاه
    const tier = await getUserTier(user.id);
    const limits = PLAN_LIMITS[tier];
    const currentCount = await getUserPlantCount(user.id);
    if (currentCount >= limits.max_plants) {
      return res.status(403).json({
        success: false,
        message: `شما به حداکثر تعداد گیاه (${limits.max_plants} گیاه) رسیده‌اید. ${tier === 'free' ? 'برای افزودن گیاه بیشتر، اشتراک تهیه کنید.' : ''}`,
        upgradeRequired: tier === 'free',
        currentCount,
        maxPlants: limits.max_plants,
      });
    }

    // Validate required fields
    if (!plant_id) {
      return res.status(400).json({
        success: false,
        message: 'شناسه گیاه از کاتالوگ الزامی است'
      });
    }

    if (!garden_id) {
      return res.status(400).json({
        success: false,
        message: 'شناسه باغچه الزامی است'
      });
    }

    const userPlant = await plantService.createPlant(user.id, garden_id, plant_id, {
      nickname,
      custom_watering_interval,
      custom_fertilizer_interval,
      acquired_date,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'گیاه با موفقیت به باغچه اضافه شد',
      plant: userPlant
    });
  } catch (error) {
    console.error('Add plant error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در افزودن گیاه'
    });
  }
});

// ===================================
// PUT /api/plants/:id - Update user plant
// ===================================
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));
    const updates = req.body;

    const plant = await plantService.updatePlant(userPlantId, user.id, updates);

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'گیاه یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'گیاه با موفقیت به‌روزرسانی شد',
      plant
    });
  } catch (error) {
    console.error('Update plant error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در به‌روزرسانی گیاه'
    });
  }
});

// ===================================
// DELETE /api/plants/:id - Delete user plant
// ===================================
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));

    const deleted = await plantService.deletePlant(userPlantId, user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'گیاه یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'گیاه با موفقیت حذف شد'
    });
  } catch (error) {
    console.error('Delete plant error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در حذف گیاه'
    });
  }
});

// ===================================
// POST /api/plants/:id/water - Record watering
// ===================================
router.post('/:id/water', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));
    const { notes } = req.body;

    const activity = await plantService.recordCareActivity(userPlantId, user.id, 'watering', notes);

    res.json({
      success: true,
      message: 'آبیاری با موفقیت ثبت شد',
      activity
    });
  } catch (error) {
    console.error('Record watering error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ثبت آبیاری'
    });
  }
});

// ===================================
// POST /api/plants/:id/fertilize - Record fertilizing
// ===================================
router.post('/:id/fertilize', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));
    const { notes } = req.body;

    const activity = await plantService.recordCareActivity(userPlantId, user.id, 'fertilizing', notes);

    res.json({
      success: true,
      message: 'کوددهی با موفقیت ثبت شد',
      activity
    });
  } catch (error) {
    console.error('Record fertilizing error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ثبت کوددهی'
    });
  }
});

// ===================================
// POST /api/plants/:id/care - Record any care activity
// ===================================
router.post('/:id/care', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));
    const { activity_type, notes } = req.body;

    if (!activity_type) {
      return res.status(400).json({
        success: false,
        message: 'نوع فعالیت مراقبتی الزامی است'
      });
    }

    const activity = await plantService.recordCareActivity(userPlantId, user.id, activity_type, notes);

    res.json({
      success: true,
      message: 'فعالیت مراقبتی با موفقیت ثبت شد',
      activity
    });
  } catch (error) {
    console.error('Record care activity error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ثبت فعالیت مراقبتی'
    });
  }
});

// ===================================
// GET /api/plants/:id/activities - Get care activities
// ===================================
router.get('/:id/activities', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));

    const activities = await plantService.getCareActivities(userPlantId, user.id);

    res.json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت فعالیت‌های مراقبتی'
    });
  }
});

// ===================================
// PUT /api/plants/:id/favorite - Toggle favorite
// ===================================
router.put('/:id/favorite', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));
    const { is_favorite } = req.body;

    const plant = await plantService.updatePlant(userPlantId, user.id, { is_favorite });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'گیاه یافت نشد'
      });
    }

    res.json({
      success: true,
      message: is_favorite ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد',
      plant
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تغییر وضعیت علاقه‌مندی'
    });
  }
});

// ===================================
// PUT /api/plants/:id/reminder - Set reminder for plant
// ===================================
router.put('/:id/reminder', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));
    const { reminder_type, interval_days, fertilizer_type } = req.body;

    if (!reminder_type || !interval_days) {
      return res.status(400).json({
        success: false,
        message: 'نوع یادآور و بازه زمانی الزامی است'
      });
    }

    const now = new Date();
    const nextDate = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000);

    let updates: any = {};
    
    if (reminder_type === 'watering') {
      updates = {
        custom_watering_interval: interval_days,
        last_watered_at: now.toISOString(),
        next_watering_at: nextDate.toISOString()
      };
    } else if (reminder_type === 'fertilizing') {
      updates = {
        custom_fertilizer_interval: interval_days,
        last_fertilized_at: now.toISOString(),
        next_fertilizing_at: nextDate.toISOString(),
        notes: fertilizer_type ? `کود استفاده شده: ${fertilizer_type}` : undefined
      };
    }

    const plant = await plantService.updatePlant(userPlantId, user.id, updates);

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'گیاه یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'یادآور با موفقیت تنظیم شد',
      plant,
      next_date: nextDate.toISOString()
    });
  } catch (error) {
    console.error('Set reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تنظیم یادآور'
    });
  }
});

// ===================================
// PLANT HEALTH RECORDS - پرونده سلامت گیاه
// ===================================

// Multer setup for health images
const healthUploadsDir = path.join(__dirname, '../../uploads/health');
if (!fs.existsSync(healthUploadsDir)) {
  fs.mkdirSync(healthUploadsDir, { recursive: true });
}

const healthStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, healthUploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const healthUpload = multer({ storage: healthStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// ===================================
// GET /api/plants/:id/health - دریافت پرونده سلامت گیاه
// ===================================
router.get('/:id/health', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));

    // بررسی مالکیت گیاه
    const plant = await plantService.getUserPlantById(userPlantId, user.id);
    if (!plant) {
      return res.status(404).json({ success: false, message: 'گیاه یافت نشد' });
    }

    const result = await query(`
      SELECT * FROM plant_health_records
      WHERE user_plant_id = $1 AND user_id = $2
      ORDER BY diagnosed_at DESC
    `, [userPlantId, user.id]);

    res.json({
      success: true,
      healthStatus: (plant as any).health_status || 'healthy',
      records: result.rows
    });
  } catch (error) {
    console.error('Get health records error:', error);
    res.status(500).json({ success: false, message: 'خطا در دریافت پرونده سلامت' });
  }
});

// ===================================
// POST /api/plants/:id/health/diagnose - ثبت تشخیص بیماری (Base64)
// ===================================
router.post('/:id/health/diagnose', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));

    // بررسی مالکیت گیاه
    const plant = await plantService.getUserPlantById(userPlantId, user.id);
    if (!plant) {
      return res.status(404).json({ success: false, message: 'گیاه یافت نشد' });
    }

    const { diagnosisResult, imageBase64 } = req.body;

    if (!diagnosisResult) {
      return res.status(400).json({ success: false, message: 'نتیجه تشخیص الزامی است' });
    }

    // ذخیره تصویر بیماری
    let imageUrl = null;
    if (imageBase64) {
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.jpg`;
      const imagePath = path.join(healthUploadsDir, filename);
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(imagePath, imageBuffer);
      imageUrl = `/uploads/health/${filename}`;
    }

    // تعیین health_status بر اساس نتیجه تشخیص
    let healthStatus = 'healthy';
    const disease = diagnosisResult.disease || '';
    const healthStatusText = diagnosisResult.healthStatus || '';

    if (disease && disease !== 'ندارد' && disease !== 'بدون بیماری') {
      healthStatus = 'sick';
    } else if (healthStatusText.includes('نیاز به توجه') || healthStatusText.includes('توجه')) {
      healthStatus = 'needs_attention';
    } else if (healthStatusText.includes('بیمار')) {
      healthStatus = 'sick';
    }

    // ذخیره اطلاعات تخصصی بیماری در notes به صورت JSON
    const extraData = JSON.stringify({
      disease_type: diagnosisResult.disease_type || null,
      severity: diagnosisResult.severity || null,
      is_contagious: diagnosisResult.is_contagious || false,
      symptoms: diagnosisResult.symptoms || [],
      cause: diagnosisResult.cause || null,
      treatment_steps: diagnosisResult.treatment_steps || [],
      prevention: diagnosisResult.prevention || [],
      recovery_time: diagnosisResult.recovery_time || null
    });

    // ذخیره رکورد سلامت
    const record = await query(`
      INSERT INTO plant_health_records (
        user_plant_id, user_id, disease_name, disease_name_en,
        health_status, description, treatment, care_tips,
        confidence, image_url, notes, diagnosed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `, [
      userPlantId,
      user.id,
      diagnosisResult.disease || 'ندارد',
      diagnosisResult.disease_en || null,
      healthStatus,
      diagnosisResult.description || healthStatusText,
      diagnosisResult.treatment || null,
      diagnosisResult.careTips || [],
      diagnosisResult.confidence || 0,
      imageUrl,
      extraData
    ]);

    // بروزرسانی وضعیت سلامت در user_plants
    await query(`
      UPDATE user_plants SET health_status = $1 WHERE id = $2 AND user_id = $3
    `, [healthStatus, userPlantId, user.id]);

    console.log(`🏥 [Health] رکورد سلامت ثبت شد | گیاه: ${userPlantId} | وضعیت: ${healthStatus} | بیماری: ${diagnosisResult.disease || 'ندارد'}`);

    res.json({
      success: true,
      message: 'پرونده سلامت با موفقیت ثبت شد',
      record: record.rows[0],
      healthStatus
    });
  } catch (error) {
    console.error('Diagnose health error:', error);
    res.status(500).json({ success: false, message: 'خطا در ثبت تشخیص' });
  }
});

// ===================================
// PUT /api/plants/:id/health/:recordId/resolve - رفع بیماری
// ===================================
router.put('/:id/health/:recordId/resolve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userPlantId = parseInt(getParam(req.params.id));
    const recordId = parseInt(req.params.recordId);
    const { notes } = req.body;

    // بررسی مالکیت
    const plant = await plantService.getUserPlantById(userPlantId, user.id);
    if (!plant) {
      return res.status(404).json({ success: false, message: 'گیاه یافت نشد' });
    }

    // بروزرسانی رکورد
    const result = await query(`
      UPDATE plant_health_records 
      SET is_resolved = true, resolved_at = NOW(), notes = COALESCE($1, notes)
      WHERE id = $2 AND user_plant_id = $3 AND user_id = $4
      RETURNING *
    `, [notes, recordId, userPlantId, user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'رکورد سلامت یافت نشد' });
    }

    // بررسی آیا هنوز بیماری فعال وجود دارد
    const activeIssues = await query(`
      SELECT COUNT(*) as count FROM plant_health_records
      WHERE user_plant_id = $1 AND user_id = $2 
        AND is_resolved = false AND health_status IN ('sick', 'needs_attention')
    `, [userPlantId, user.id]);

    const newHealthStatus = parseInt(activeIssues.rows[0].count) > 0 ? 'recovering' : 'healthy';

    // بروزرسانی وضعیت گیاه
    await query(`
      UPDATE user_plants SET health_status = $1 WHERE id = $2 AND user_id = $3
    `, [newHealthStatus, userPlantId, user.id]);

    console.log(`✅ [Health] بیماری رفع شد | گیاه: ${userPlantId} | وضعیت جدید: ${newHealthStatus}`);

    res.json({
      success: true,
      message: 'بیماری با موفقیت رفع شد',
      record: result.rows[0],
      healthStatus: newHealthStatus
    });
  } catch (error) {
    console.error('Resolve health error:', error);
    res.status(500).json({ success: false, message: 'خطا در رفع بیماری' });
  }
});

export default router;


