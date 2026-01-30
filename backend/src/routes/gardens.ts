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
// GARDENS ROUTES
// ===================================

// GET /api/gardens/default - Get or create default garden for user
router.get('/default', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const gardens = await plantService.getGardensByUser(user.id);

    let garden;
    if (gardens.length === 0) {
      // ایجاد باغچه پیش‌فرض برای کاربر جدید
      garden = await plantService.createGarden(user.id, 'باغچه من', 'باغچه پیش‌فرض');
    } else {
      garden = gardens[0]; // اولین باغچه به عنوان پیش‌فرض
    }

    res.json({
      success: true,
      garden
    });
  } catch (error) {
    console.error('Get default garden error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت باغچه پیش‌فرض'
    });
  }
});

// GET /api/gardens - Get all user gardens
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const gardens = await plantService.getGardensByUser(user.id);

    res.json({
      success: true,
      gardens
    });
  } catch (error) {
    console.error('Get gardens error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت لیست باغچه‌ها'
    });
  }
});

// GET /api/gardens/:id - Get single garden
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const gardenId = parseInt(getParam(req.params.id));

    const garden = await plantService.getGardenById(gardenId, user.id);

    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'باغچه یافت نشد'
      });
    }

    res.json({
      success: true,
      garden
    });
  } catch (error) {
    console.error('Get garden error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت اطلاعات باغچه'
    });
  }
});

// POST /api/gardens - Create garden
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, description, location } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'نام باغچه الزامی است'
      });
    }

    const garden = await plantService.createGarden(user.id, name, description, location);

    res.status(201).json({
      success: true,
      message: 'باغچه با موفقیت ایجاد شد',
      garden
    });
  } catch (error) {
    console.error('Create garden error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ایجاد باغچه'
    });
  }
});

// PUT /api/gardens/:id - Update garden
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const gardenId = parseInt(getParam(req.params.id));
    const { name, description, location } = req.body;

    const garden = await plantService.updateGarden(gardenId, user.id, { name, description, location });

    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'باغچه یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'باغچه با موفقیت به‌روزرسانی شد',
      garden
    });
  } catch (error) {
    console.error('Update garden error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در به‌روزرسانی باغچه'
    });
  }
});

// DELETE /api/gardens/:id - Delete garden
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const gardenId = parseInt(getParam(req.params.id));

    const deleted = await plantService.deleteGarden(gardenId, user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'باغچه یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'باغچه با موفقیت حذف شد'
    });
  } catch (error) {
    console.error('Delete garden error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در حذف باغچه'
    });
  }
});

// GET /api/gardens/:id/plants - Get plants in garden
router.get('/:id/plants', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const gardenId = parseInt(getParam(req.params.id));

    const plants = await plantService.getPlantsByGarden(gardenId, user.id);

    res.json({
      success: true,
      plants
    });
  } catch (error) {
    console.error('Get garden plants error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت گیاهان باغچه'
    });
  }
});

export default router;
