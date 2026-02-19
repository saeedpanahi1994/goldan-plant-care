import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import { query } from '../config/database';

const router = Router();

// ===================================
// ثابت‌های پلن‌ها و محدودیت‌ها
// ===================================
export const PLAN_LIMITS = {
  free: {
    max_plants: 6,
    weekly_identify: 5,
    weekly_identify_pro: 0,
    disease_limit: 1,       // هفتگی
    disease_period: 'weekly' as const,
    daily_chat: 5,
    has_smart_watering: false,
  },
  subscriber: {
    max_plants: 100,
    weekly_identify: 40,
    weekly_identify_pro: 10,
    disease_limit: 30,      // ماهانه
    disease_period: 'monthly' as const,
    daily_chat: 20,
    has_smart_watering: false,
  }
};

export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'monthly',
    name: 'اشتراک ماهانه',
    price: 69000, // تومان
    duration_days: 30,
  },
  yearly: {
    id: 'yearly',
    name: 'اشتراک سالیانه',
    price: 499000, // تومان
    duration_days: 365,
  }
};

export const SCAN_PACKAGES = {
  '5_scans': {
    id: '5_scans',
    name: '۵ تشخیص بیماری',
    scans: 5,
    price: 30000, // تومان
  },
  '10_scans': {
    id: '10_scans',
    name: '۱۰ تشخیص بیماری',
    scans: 10,
    price: 50000, // تومان
  }
};

// ===================================
// Helper Functions
// ===================================

/**
 * بررسی اینکه کاربر اشتراک فعال دارد
 */
export const getUserSubscription = async (userId: number) => {
  const result = await query(`
    SELECT * FROM user_subscriptions 
    WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
    ORDER BY expires_at DESC 
    LIMIT 1
  `, [userId]);
  return result.rows[0] || null;
};

/**
 * دریافت سطح دسترسی کاربر (free یا subscriber)
 */
export const getUserTier = async (userId: number): Promise<'free' | 'subscriber'> => {
  const sub = await getUserSubscription(userId);
  return sub ? 'subscriber' : 'free';
};

/**
 * شمارش استفاده از یک اکشن در بازه زمانی مشخص
 */
export const getUsageCount = async (
  userId: number, 
  actionType: string, 
  periodType: 'daily' | 'weekly' | 'monthly'
): Promise<number> => {
  let interval: string;
  switch (periodType) {
    case 'daily':
      interval = '1 day';
      break;
    case 'weekly':
      interval = '7 days';
      break;
    case 'monthly':
      interval = '30 days';
      break;
  }
  
  const result = await query(`
    SELECT COUNT(*)::integer as count 
    FROM usage_tracking 
    WHERE user_id = $1 AND action_type = $2 AND created_at > NOW() - INTERVAL '${interval}'
  `, [userId, actionType]);
  
  return result.rows[0]?.count || 0;
};

/**
 * ثبت استفاده از یک اکشن
 */
export const trackUsage = async (userId: number, actionType: string): Promise<void> => {
  await query(`
    INSERT INTO usage_tracking (user_id, action_type) VALUES ($1, $2)
  `, [userId, actionType]);
};

/**
 * تعداد اسکن بیماری باقیمانده از پکیج‌های خریداری شده
 */
export const getRemainingPurchasedScans = async (userId: number): Promise<number> => {
  const result = await query(`
    SELECT COALESCE(SUM(total_scans - used_scans), 0)::integer as remaining
    FROM user_scan_purchases 
    WHERE user_id = $1 AND used_scans < total_scans
  `, [userId]);
  return result.rows[0]?.remaining || 0;
};

/**
 * مصرف یک اسکن از پکیج خریداری شده
 */
export const consumePurchasedScan = async (userId: number): Promise<boolean> => {
  const result = await query(`
    UPDATE user_scan_purchases 
    SET used_scans = used_scans + 1 
    WHERE id = (
      SELECT id FROM user_scan_purchases 
      WHERE user_id = $1 AND used_scans < total_scans 
      ORDER BY purchased_at ASC 
      LIMIT 1
    )
    RETURNING id
  `, [userId]);
  return result.rows.length > 0;
};

/**
 * تعداد گیاهان فعلی کاربر
 */
export const getUserPlantCount = async (userId: number): Promise<number> => {
  const result = await query(`
    SELECT COUNT(*)::integer as count FROM user_plants WHERE user_id = $1
  `, [userId]);
  return result.rows[0]?.count || 0;
};

/**
 * بررسی محدودیت و برگرداندن وضعیت کامل مصرف
 */
export const checkUsageLimit = async (
  userId: number,
  actionType: 'identify' | 'identify_pro' | 'disease' | 'chat'
): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  period: string;
  remaining: number;
  tier: string;
  purchasedScansRemaining?: number;
}> => {
  const tier = await getUserTier(userId);
  const limits = PLAN_LIMITS[tier];
  
  let used: number;
  let limit: number;
  let period: string;
  let purchasedScansRemaining: number | undefined;

  switch (actionType) {
    case 'identify':
      used = await getUsageCount(userId, 'identify', 'weekly');
      limit = limits.weekly_identify;
      period = 'هفتگی';
      break;
    case 'identify_pro':
      used = await getUsageCount(userId, 'identify_pro', 'weekly');
      limit = tier === 'subscriber' ? limits.weekly_identify_pro : 0;
      period = 'هفتگی';
      break;
    case 'disease':
      used = await getUsageCount(userId, 'disease', limits.disease_period);
      limit = limits.disease_limit;
      period = limits.disease_period === 'monthly' ? 'ماهانه' : 'هفتگی';
      // بررسی اسکن‌های خریداری شده
      purchasedScansRemaining = await getRemainingPurchasedScans(userId);
      break;
    case 'chat':
      used = await getUsageCount(userId, 'chat', 'daily');
      limit = limits.daily_chat;
      period = 'روزانه';
      break;
    default:
      return { allowed: false, used: 0, limit: 0, period: '', remaining: 0, tier };
  }

  const remaining = Math.max(0, limit - used);
  
  // برای بیماری: اگر سهمیه تمام شده ولی اسکن خریداری شده دارد
  let allowed = used < limit;
  if (actionType === 'disease' && !allowed && purchasedScansRemaining && purchasedScansRemaining > 0) {
    allowed = true;
  }

  return { 
    allowed, 
    used, 
    limit, 
    period, 
    remaining, 
    tier,
    purchasedScansRemaining
  };
};

// ===================================
// GET /api/subscription/status - وضعیت اشتراک و مصرف کاربر
// ===================================
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    const subscription = await getUserSubscription(user.id);
    const tier = subscription ? 'subscriber' : 'free';
    const limits = PLAN_LIMITS[tier];
    
    // مصرف‌های فعلی
    const identifyUsed = await getUsageCount(user.id, 'identify', 'weekly');
    const identifyProUsed = await getUsageCount(user.id, 'identify_pro', 'weekly');
    const diseaseUsed = await getUsageCount(user.id, 'disease', limits.disease_period);
    const chatUsed = await getUsageCount(user.id, 'chat', 'daily');
    const plantCount = await getUserPlantCount(user.id);
    const purchasedScans = await getRemainingPurchasedScans(user.id);

    res.json({
      success: true,
      subscription: {
        tier,
        plan: subscription ? {
          type: subscription.plan_type,
          expiresAt: subscription.expires_at,
          startedAt: subscription.started_at,
        } : null,
      },
      usage: {
        plants: { used: plantCount, limit: limits.max_plants },
        identify: { used: identifyUsed, limit: limits.weekly_identify, period: 'weekly' },
        identifyPro: { used: identifyProUsed, limit: tier === 'subscriber' ? limits.weekly_identify_pro : 0, period: 'weekly' },
        disease: { 
          used: diseaseUsed, 
          limit: limits.disease_limit,
          period: limits.disease_period,
          purchasedRemaining: purchasedScans,
        },
        chat: { used: chatUsed, limit: limits.daily_chat, period: 'daily' },
      },
      limits: {
        ...limits,
        tier,
      }
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ success: false, message: 'خطا در دریافت وضعیت اشتراک' });
  }
});

// ===================================
// GET /api/subscription/plans - لیست پلن‌ها و پکیج‌ها
// ===================================
router.get('/plans', async (req: Request, res: Response) => {
  res.json({
    success: true,
    subscriptionPlans: SUBSCRIPTION_PLANS,
    scanPackages: SCAN_PACKAGES,
    freeLimits: PLAN_LIMITS.free,
    subscriberLimits: PLAN_LIMITS.subscriber,
  });
});

// ===================================
// POST /api/subscription/subscribe - خرید اشتراک
// ===================================
router.post('/subscribe', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { plan_type, payment_ref } = req.body;

    if (!plan_type || !['monthly', 'yearly'].includes(plan_type)) {
      return res.status(400).json({
        success: false,
        message: 'نوع اشتراک نامعتبر است'
      });
    }

    const plan = SUBSCRIPTION_PLANS[plan_type as keyof typeof SUBSCRIPTION_PLANS];
    
    // بررسی اشتراک فعال موجود
    const existing = await getUserSubscription(user.id);
    
    let expiresAt: Date;
    if (existing) {
      // تمدید: از تاریخ انقضای فعلی اضافه کن
      expiresAt = new Date(existing.expires_at);
      expiresAt.setDate(expiresAt.getDate() + plan.duration_days);
    } else {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.duration_days);
    }

    // اگر اشتراک قبلی هست، غیرفعال کن
    if (existing) {
      await query(`
        UPDATE user_subscriptions SET status = 'expired' 
        WHERE id = $1
      `, [existing.id]);
    }

    // ایجاد اشتراک جدید
    const result = await query(`
      INSERT INTO user_subscriptions (user_id, plan_type, status, expires_at, payment_amount, payment_ref)
      VALUES ($1, $2, 'active', $3, $4, $5)
      RETURNING *
    `, [user.id, plan_type, expiresAt.toISOString(), plan.price, payment_ref || null]);

    res.json({
      success: true,
      message: 'اشتراک با موفقیت فعال شد',
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ success: false, message: 'خطا در فعال‌سازی اشتراک' });
  }
});

// ===================================
// POST /api/subscription/purchase-scans - خرید پکیج اسکن بیماری
// ===================================
router.post('/purchase-scans', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { package_type, payment_ref } = req.body;

    if (!package_type || !['5_scans', '10_scans'].includes(package_type)) {
      return res.status(400).json({
        success: false,
        message: 'نوع پکیج نامعتبر است'
      });
    }

    const pkg = SCAN_PACKAGES[package_type as keyof typeof SCAN_PACKAGES];

    const result = await query(`
      INSERT INTO user_scan_purchases (user_id, package_type, total_scans, payment_amount, payment_ref)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [user.id, package_type, pkg.scans, pkg.price, payment_ref || null]);

    res.json({
      success: true,
      message: `پکیج ${pkg.name} با موفقیت خریداری شد`,
      purchase: result.rows[0]
    });
  } catch (error) {
    console.error('Purchase scans error:', error);
    res.status(500).json({ success: false, message: 'خطا در خرید پکیج' });
  }
});

// ===================================
// GET /api/subscription/check/:action - بررسی سریع محدودیت
// ===================================
router.get('/check/:action', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const action = req.params.action as 'identify' | 'identify_pro' | 'disease' | 'chat';

    if (!['identify', 'identify_pro', 'disease', 'chat'].includes(action)) {
      return res.status(400).json({ success: false, message: 'نوع اکشن نامعتبر' });
    }

    const result = await checkUsageLimit(user.id, action);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Check limit error:', error);
    res.status(500).json({ success: false, message: 'خطا در بررسی محدودیت' });
  }
});

// ===================================
// GET /api/subscription/history - تاریخچه خریدها
// ===================================
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const subscriptions = await query(`
      SELECT id, plan_type, status, started_at, expires_at, payment_amount 
      FROM user_subscriptions 
      WHERE user_id = $1 
      ORDER BY created_at DESC LIMIT 20
    `, [user.id]);

    const purchases = await query(`
      SELECT id, package_type, total_scans, used_scans, payment_amount, purchased_at 
      FROM user_scan_purchases 
      WHERE user_id = $1 
      ORDER BY purchased_at DESC LIMIT 20
    `, [user.id]);

    res.json({
      success: true,
      subscriptions: subscriptions.rows,
      scanPurchases: purchases.rows,
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, message: 'خطا در دریافت تاریخچه' });
  }
});

export default router;
