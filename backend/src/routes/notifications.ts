import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import notificationService from '../services/notificationService';

const router = Router();

// Helper function to get param as string
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

// ===================================
// GET /api/notifications - Get user notifications
// ===================================
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const includeRead = req.query.includeRead === 'true';

    const notifications = await notificationService.getNotificationsByUser(user.id, includeRead);
    const unreadCount = await notificationService.getUnreadCount(user.id);

    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت نوتیفیکیشن‌ها'
    });
  }
});

// ===================================
// GET /api/notifications/unread-count - Get unread count
// ===================================
router.get('/unread-count', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const count = await notificationService.getUnreadCount(user.id);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت تعداد اعلان‌های خوانده نشده'
    });
  }
});

// ===================================
// PUT /api/notifications/:id/read - Mark as read
// ===================================
router.put('/:id/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const notificationId = parseInt(getParam(req.params.id));

    await notificationService.markNotificationAsRead(notificationId, user.id);

    res.json({
      success: true,
      message: 'اعلان خوانده شد'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در علامت‌گذاری اعلان'
    });
  }
});

// ===================================
// PUT /api/notifications/read-all - Mark all as read
// ===================================
router.put('/read-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const count = await notificationService.markAllNotificationsAsRead(user.id);

    res.json({
      success: true,
      message: `${count} اعلان خوانده شد`
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در علامت‌گذاری اعلان‌ها'
    });
  }
});

// ===================================
// DELETE /api/notifications/:id - Delete notification
// ===================================
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const notificationId = parseInt(getParam(req.params.id));

    const deleted = await notificationService.deleteNotification(notificationId, user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'اعلان یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'اعلان با موفقیت حذف شد'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در حذف اعلان'
    });
  }
});

// ===================================
// GET /api/notifications/settings - Get settings
// ===================================
router.get('/settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let settings = await notificationService.getNotificationSettings(user.id);

    if (!settings) {
      settings = await notificationService.createDefaultSettings(user.id);
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت تنظیمات اعلان‌ها'
    });
  }
});

// ===================================
// PUT /api/notifications/settings - Update settings
// ===================================
router.put('/settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const settingsData = req.body;

    const settings = await notificationService.updateNotificationSettings(user.id, settingsData);

    res.json({
      success: true,
      message: 'تنظیمات اعلان‌ها با موفقیت به‌روزرسانی شد',
      settings
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در به‌روزرسانی تنظیمات'
    });
  }
});

export default router;
