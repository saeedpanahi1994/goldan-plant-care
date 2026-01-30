import { Router, Request, Response, NextFunction } from 'express';
import userService from '../services/userService';
import * as plantService from '../services/plantService';
import notificationService from '../services/notificationService';
import smsService from '../services/smsService';

const router = Router();

// ===================================
// Middleware - Auth Check
// ===================================
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'توکن احراز هویت ارائه نشده'
    });
  }

  const user = await userService.verifyAuthToken(token);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'توکن نامعتبر یا منقضی شده'
    });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
};

// ===================================
// POST /api/auth/send-otp
// ===================================
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    // Validate phone
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'شماره تلفن الزامی است'
      });
    }

    // Normalize phone number
    const normalizedPhone = smsService.normalizeMobileNumber(phone);

    // Validate Iranian mobile format
    if (!smsService.isValidIranianMobile(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'شماره تلفن نامعتبر است. شماره باید با 09 شروع شود و 11 رقم باشد.'
      });
    }

    // Check rate limit
    const rateLimit = await userService.checkRateLimit(normalizedPhone);
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ${resetMinutes} دقیقه دیگر تلاش کنید.`,
        resetAt: rateLimit.resetAt
      });
    }

    // Generate OTP
    const code = await userService.createOTP(normalizedPhone);

    // Send SMS via SMS.ir
    const smsResult = await smsService.sendVerificationCode(normalizedPhone, code);

    if (!smsResult.success) {
      console.error('خطا در ارسال SMS:', smsResult.error);
      // حتی اگر SMS ارسال نشد، کد را در کنسول نمایش بده (برای development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 [FALLBACK] کد تایید برای ${normalizedPhone}: ${code}`);
      }
    }

    res.json({
      success: true,
      message: smsResult.success 
        ? 'کد تایید با موفقیت ارسال شد' 
        : 'کد تایید ایجاد شد (خطا در ارسال پیامک)',
      remaining: rateLimit.remaining,
      smsStatus: smsResult.success ? 'sent' : 'failed',
      // Only in development - show code
      ...(process.env.NODE_ENV === 'development' && { code })
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ارسال کد تایید'
    });
  }
});

// ===================================
// POST /api/auth/verify-otp
// ===================================
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;

    // Validate inputs
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: 'شماره تلفن و کد تایید الزامی است'
      });
    }

    // Normalize phone number
    const normalizedPhone = smsService.normalizeMobileNumber(phone);

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'کد تایید باید 6 رقم باشد'
      });
    }

    // Verify OTP
    const isValid = await userService.verifyOTP(normalizedPhone, code);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'کد تایید نامعتبر یا منقضی شده است'
      });
    }

    // Create or get user
    const user = await userService.createUser(normalizedPhone);
    
    // Update last login
    await userService.updateLastLogin(user.id);

    // Create auth token
    const token = await userService.createAuthToken(user.id, req.headers['user-agent']);

    // Create default garden and settings for new users
    await plantService.createGarden(user.id, 'باغچه من', 'باغچه پیش‌فرض شما');
    await notificationService.createDefaultSettings(user.id);

    res.json({
      success: true,
      message: 'ورود با موفقیت انجام شد',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatar_url: user.avatar_url,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تایید کد'
    });
  }
});

// ===================================
// POST /api/auth/verify-token
// ===================================
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'توکن ارائه نشده'
      });
    }

    const user = await userService.verifyAuthToken(token);

    if (!user) {
      return res.json({
        success: true,
        valid: false,
        message: 'توکن نامعتبر یا منقضی شده'
      });
    }

    res.json({
      success: true,
      valid: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatar_url: user.avatar_url,
        isVerified: user.is_verified
      }
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در بررسی توکن'
    });
  }
});

// ===================================
// POST /api/auth/logout
// ===================================
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (token) {
      await userService.revokeToken(token);
    }

    res.json({
      success: true,
      message: 'خروج با موفقیت انجام شد'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در خروج از سیستم'
    });
  }
});

// ===================================
// GET /api/auth/me (Protected)
// ===================================
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const stats = await plantService.getUserStats(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatar_url: user.avatar_url,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      stats
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت اطلاعات کاربر'
    });
  }
});

// ===================================
// PUT /api/auth/profile (Protected)
// ===================================
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, avatar_url } = req.body;

    const updatedUser = await userService.updateUser(user.id, { name, avatar_url });

    res.json({
      success: true,
      message: 'پروفایل با موفقیت به‌روزرسانی شد',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در به‌روزرسانی پروفایل'
    });
  }
});

// ===================================
// GET /api/auth/sms-status - چک کردن وضعیت SMS (Development only)
// ===================================
router.get('/sms-status', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'این endpoint فقط در محیط development فعال است'
      });
    }

    const creditResult = await smsService.checkAccountCredit();

    res.json({
      success: true,
      sms_service: {
        api_key_set: !!process.env.SMSIR_API_KEY,
        template_id: process.env.SMSIR_TEMPLATE_ID,
        credit: creditResult.success ? creditResult.credit : 'خطا در دریافت اعتبار',
        error: creditResult.error
      }
    });

  } catch (error) {
    console.error('SMS status check error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در چک کردن وضعیت SMS'
    });
  }
});

export default router;
