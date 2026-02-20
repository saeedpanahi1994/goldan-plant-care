import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authMiddleware } from './auth';
import { query } from '../config/database';
import { SUBSCRIPTION_PLANS, SCAN_PACKAGES, getUserSubscription } from './subscription';

const router = Router();

// ===================================
// تنظیمات زرین‌پال
// ===================================
const ZARINPAL_MERCHANT_ID = '79aaf477-417a-4e03-be88-0a741d8f1e19';
const ZARINPAL_REQUEST_URL = 'https://api.zarinpal.com/pg/v4/payment/request.json';
const ZARINPAL_VERIFY_URL = 'https://api.zarinpal.com/pg/v4/payment/verify.json';
const ZARINPAL_STARTPAY_URL = 'https://www.zarinpal.com/pg/StartPay';
const PAYMENT_CALLBACK_URL = 'https://gooldoon.ir/payment/result';

// ===================================
// POST /api/payment/request - ایجاد درخواست پرداخت
// ===================================
router.post('/request', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { payment_type, plan_type, package_type } = req.body;

    // اعتبارسنجی ورودی
    if (!payment_type || !['subscription', 'scan_package'].includes(payment_type)) {
      return res.status(400).json({
        success: false,
        message: 'نوع پرداخت نامعتبر است'
      });
    }

    let amount: number; // تومان
    let description: string;

    if (payment_type === 'subscription') {
      if (!plan_type || !['monthly', 'yearly'].includes(plan_type)) {
        return res.status(400).json({
          success: false,
          message: 'نوع اشتراک نامعتبر است'
        });
      }
      const plan = SUBSCRIPTION_PLANS[plan_type as keyof typeof SUBSCRIPTION_PLANS];
      amount = plan.price;
      description = `خرید ${plan.name} گل‌دان`;
    } else {
      if (!package_type || !['5_scans', '10_scans'].includes(package_type)) {
        return res.status(400).json({
          success: false,
          message: 'نوع پکیج نامعتبر است'
        });
      }
      const pkg = SCAN_PACKAGES[package_type as keyof typeof SCAN_PACKAGES];
      amount = pkg.price;
      description = `خرید ${pkg.name} گل‌دان`;
    }

    // مبلغ به ریال (زرین‌پال ریال می‌خواهد)
    const amountRial = amount * 10;

    // درخواست به زرین‌پال
    console.log('🔄 درخواست پرداخت به زرین‌پال:', {
      amount,
      amountRial,
      description,
      payment_type,
      plan_type,
      package_type,
      user_id: user.id
    });

    const zarinpalResponse = await axios.post(ZARINPAL_REQUEST_URL, {
      merchant_id: ZARINPAL_MERCHANT_ID,
      amount: amountRial,
      description,
      callback_url: PAYMENT_CALLBACK_URL,
      metadata: {
        mobile: user.phone || undefined,
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    console.log('📥 پاسخ زرین‌پال:', JSON.stringify(zarinpalResponse.data));

    const { data } = zarinpalResponse.data;

    if (!data || !data.authority || zarinpalResponse.data.data?.code !== 100) {
      console.error('❌ خطا از زرین‌پال:', zarinpalResponse.data);
      return res.status(502).json({
        success: false,
        message: 'خطا در ارتباط با درگاه پرداخت. لطفاً دوباره تلاش کنید.',
        error: zarinpalResponse.data?.errors || null
      });
    }

    const authority = data.authority;

    // ذخیره در دیتابیس
    await query(`
      INSERT INTO pending_payments (user_id, authority, amount, amount_rial, payment_type, plan_type, package_type, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      user.id,
      authority,
      amount,
      amountRial,
      payment_type,
      plan_type || null,
      package_type || null,
      description
    ]);

    // URL پرداخت
    const paymentUrl = `${ZARINPAL_STARTPAY_URL}/${authority}`;

    console.log('✅ لینک پرداخت ایجاد شد:', paymentUrl);

    res.json({
      success: true,
      payment_url: paymentUrl,
      authority,
    });
  } catch (error: any) {
    console.error('❌ خطا در ایجاد درخواست پرداخت:', error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'خطا در ایجاد درخواست پرداخت. لطفاً دوباره تلاش کنید.'
    });
  }
});

// ===================================
// POST /api/payment/verify - وریفای پرداخت (فراخوانی از فرانت‌اند)
// ===================================
router.post('/verify', async (req: Request, res: Response) => {
  const { authority, status } = req.body;

  console.log('🔄 درخواست وریفای از فرانت‌اند:', { authority, status });

  if (!authority) {
    return res.status(400).json({ success: false, message: 'اطلاعات پرداخت ناقص است' });
  }

  // اگر کاربر لغو کرد
  if (status !== 'OK') {
    await query(`
      UPDATE pending_payments SET status = 'failed' WHERE authority = $1 AND status = 'pending'
    `, [authority]);
    return res.json({
      success: false,
      message: 'پرداخت توسط شما لغو شد یا با خطا مواجه شد.'
    });
  }

  try {
    // پیدا کردن پرداخت معلق
    const paymentResult = await query(`
      SELECT * FROM pending_payments WHERE authority = $1 AND status = 'pending'
    `, [authority]);

    if (paymentResult.rows.length === 0) {
      // شاید قبلاً وریفای شده
      const verifiedPayment = await query(`
        SELECT * FROM pending_payments WHERE authority = $1 AND status = 'verified'
      `, [authority]);

      if (verifiedPayment.rows.length > 0) {
        return res.json({
          success: true,
          message: 'این پرداخت قبلاً با موفقیت انجام شده است.',
          ref_id: verifiedPayment.rows[0].ref_id,
          payment_type: verifiedPayment.rows[0].payment_type,
          already_verified: true
        });
      }

      return res.status(404).json({
        success: false,
        message: 'اطلاعات پرداخت یافت نشد. لطفاً با پشتیبانی تماس بگیرید.'
      });
    }

    const payment = paymentResult.rows[0];

    // وریفای با زرین‌پال
    const verifyResponse = await axios.post(ZARINPAL_VERIFY_URL, {
      merchant_id: ZARINPAL_MERCHANT_ID,
      amount: payment.amount_rial,
      authority: authority,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    console.log('📥 پاسخ وریفای زرین‌پال:', JSON.stringify(verifyResponse.data));

    const verifyData = verifyResponse.data?.data;
    const verifyCode = verifyData?.code;

    // کد 100: موفق | کد 101: قبلاً وریفای شده
    if (verifyCode === 100 || verifyCode === 101) {
      const refId = verifyData.ref_id?.toString() || '';
      const cardPan = verifyData.card_pan || '';

      // آپدیت وضعیت پرداخت
      await query(`
        UPDATE pending_payments 
        SET status = 'verified', ref_id = $1, card_pan = $2, verified_at = NOW()
        WHERE id = $3
      `, [refId, cardPan, payment.id]);

      // فعال‌سازی اشتراک یا پکیج اسکن
      if (payment.payment_type === 'subscription') {
        await activateSubscription(payment.user_id, payment.plan_type, payment.amount, refId);
      } else if (payment.payment_type === 'scan_package') {
        await activateScanPackage(payment.user_id, payment.package_type, payment.amount, refId);
      }

      console.log(`✅ پرداخت موفق: user_id=${payment.user_id}, ref_id=${refId}, type=${payment.payment_type}`);

      const typeLabel = payment.payment_type === 'subscription' ? 'اشتراک فعال' : 'پکیج خریداری';

      return res.json({
        success: true,
        message: `پرداخت شما با موفقیت انجام شد و ${typeLabel} شد.`,
        ref_id: refId,
        card_pan: cardPan,
        payment_type: payment.payment_type,
        plan_type: payment.plan_type,
        package_type: payment.package_type
      });
    } else {
      // پرداخت ناموفق
      await query(`
        UPDATE pending_payments SET status = 'failed' WHERE id = $1
      `, [payment.id]);

      console.error('❌ وریفای ناموفق:', verifyResponse.data);

      return res.json({
        success: false,
        message: 'پرداخت تایید نشد. در صورت کسر مبلغ از حساب شما، ظرف ۷۲ ساعت به حسابتان برگشت داده می‌شود.'
      });
    }
  } catch (error: any) {
    console.error('❌ خطا در وریفای پرداخت:', error?.response?.data || error.message);

    await query(`
      UPDATE pending_payments SET status = 'failed' WHERE authority = $1 AND status = 'pending'
    `, [authority]);

    return res.status(500).json({
      success: false,
      message: 'خطایی در بررسی وضعیت پرداخت رخ داد. لطفاً با پشتیبانی تماس بگیرید.'
    });
  }
});

// ===================================
// GET /api/payment/check/:authority - بررسی وضعیت پرداخت (برای فرانت‌اند)
// اگر پرداخت هنوز pending باشد، خودکار وریفای را انجام می‌دهد
// ===================================
router.get('/check/:authority', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { authority } = req.params;

    const result = await query(`
      SELECT id, authority, amount, amount_rial, payment_type, plan_type, package_type, status, ref_id, created_at, verified_at
      FROM pending_payments 
      WHERE authority = $1 AND user_id = $2
    `, [authority, user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پرداخت یافت نشد'
      });
    }

    let payment = result.rows[0];

    // اگر هنوز pending هست، سعی کن خودکار وریفای کنی
    if (payment.status === 'pending') {
      console.log('🔄 وریفای خودکار برای پرداخت pending:', authority);

      try {
        const verifyResponse = await axios.post(ZARINPAL_VERIFY_URL, {
          merchant_id: ZARINPAL_MERCHANT_ID,
          amount: payment.amount_rial,
          authority: authority,
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 15000
        });

        console.log('📥 پاسخ وریفای خودکار:', JSON.stringify(verifyResponse.data));

        const verifyData = verifyResponse.data?.data;
        const verifyCode = verifyData?.code;

        if (verifyCode === 100 || verifyCode === 101) {
          const refId = verifyData.ref_id?.toString() || '';
          const cardPan = verifyData.card_pan || '';

          // آپدیت وضعیت پرداخت
          await query(`
            UPDATE pending_payments 
            SET status = 'verified', ref_id = $1, card_pan = $2, verified_at = NOW()
            WHERE id = $3
          `, [refId, cardPan, payment.id]);

          // فعال‌سازی اشتراک یا پکیج اسکن
          if (payment.payment_type === 'subscription') {
            await activateSubscription(user.id, payment.plan_type, payment.amount, refId);
          } else if (payment.payment_type === 'scan_package') {
            await activateScanPackage(user.id, payment.package_type, payment.amount, refId);
          }

          console.log(`✅ وریفای خودکار موفق: user_id=${user.id}, ref_id=${refId}`);

          // بازخوانی اطلاعات آپدیت شده
          payment = { ...payment, status: 'verified', ref_id: refId, card_pan: cardPan };
        } else {
          // زرین‌پال تایید نکرد - پرداخت ناموفق
          await query(`
            UPDATE pending_payments SET status = 'failed' WHERE id = $1
          `, [payment.id]);
          payment = { ...payment, status: 'failed' };
          console.log('❌ وریفای خودکار: زرین‌پال تایید نکرد', verifyResponse.data);
        }
      } catch (verifyError: any) {
        console.error('⚠️ خطا در وریفای خودکار (ادامه با وضعیت pending):', verifyError?.response?.data || verifyError.message);
        // در صورت خطا، وضعیت pending را نگه‌دار تا دوباره تلاش شود
      }
    }

    res.json({
      success: true,
      payment: {
        id: payment.id,
        authority: payment.authority,
        amount: payment.amount,
        payment_type: payment.payment_type,
        plan_type: payment.plan_type,
        package_type: payment.package_type,
        status: payment.status,
        ref_id: payment.ref_id,
        created_at: payment.created_at,
        verified_at: payment.verified_at
      }
    });
  } catch (error) {
    console.error('Check payment error:', error);
    res.status(500).json({ success: false, message: 'خطا در بررسی وضعیت پرداخت' });
  }
});

// ===================================
// فعال‌سازی اشتراک بعد از پرداخت موفق
// ===================================
async function activateSubscription(userId: number, planType: string, amount: number, refId: string) {
  const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
  if (!plan) return;

  // بررسی اشتراک فعال موجود
  const existing = await getUserSubscription(userId);

  let expiresAt: Date;
  if (existing) {
    // تمدید: از تاریخ انقضای فعلی اضافه کن
    expiresAt = new Date(existing.expires_at);
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);
    
    // غیرفعال کردن اشتراک قبلی
    await query(`
      UPDATE user_subscriptions SET status = 'expired' WHERE id = $1
    `, [existing.id]);
  } else {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);
  }

  // ایجاد اشتراک جدید
  await query(`
    INSERT INTO user_subscriptions (user_id, plan_type, status, expires_at, payment_amount, payment_ref)
    VALUES ($1, $2, 'active', $3, $4, $5)
  `, [userId, planType, expiresAt.toISOString(), amount, refId]);

  console.log(`✅ اشتراک ${planType} فعال شد برای کاربر ${userId}`);
}

// ===================================
// فعال‌سازی پکیج اسکن بعد از پرداخت موفق
// ===================================
async function activateScanPackage(userId: number, packageType: string, amount: number, refId: string) {
  const pkg = SCAN_PACKAGES[packageType as keyof typeof SCAN_PACKAGES];
  if (!pkg) return;

  await query(`
    INSERT INTO user_scan_purchases (user_id, package_type, total_scans, payment_amount, payment_ref)
    VALUES ($1, $2, $3, $4, $5)
  `, [userId, packageType, pkg.scans, amount, refId]);

  console.log(`✅ پکیج ${packageType} فعال شد برای کاربر ${userId}`);
}

export default router;
