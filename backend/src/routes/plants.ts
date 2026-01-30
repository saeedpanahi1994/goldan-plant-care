import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import * as plantService from '../services/plantService';

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

export default router;


