import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import FormData from 'form-data';
import axios from 'axios';
import sharp from 'sharp';
import { authMiddleware } from './auth';
import { query } from '../config/database';
import { checkUsageLimit, trackUsage, consumePurchasedScan } from './subscription';
import userService from '../services/userService';

const router = Router();

// تنظیمات Gemini AI
const getGeminiApiKeys = (): string[] => {
  const rawList = process.env.GEMINI_API_KEYS || '';
  const single = process.env.GEMINI_API_KEY || '';

  const keys = rawList
    .split(/[,;\s]+/)
    .map((k) => k.trim())
    .filter(Boolean);

  if (single && !keys.includes(single)) {
    keys.push(single);
  }

  return keys;
};

const isQuotaError = (error: any): boolean => {
  const status = error?.status || error?.response?.status;
  if (status === 429) return true;
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('too many requests') || message.includes('quota')) return true;
  const details = error?.errorDetails || [];
  return Array.isArray(details)
    && details.some((d: any) => String(d?.['@type'] || '').includes('QuotaFailure'));
};

const getAiType = (): string => {
  return (process.env.typeAi || process.env.TYPE_AI || 'gemini-2.5-flash').toLowerCase();
};

// تنظیمات برای انتخاب مدل text-to-text (اطلاعات گیاه)
const getIdentifyType = (): string => {
  return (process.env.typeIdentify || process.env.TYPE_IDENTIFY || 'gemini').toLowerCase();
};

const shouldUseOpenRouter = (): boolean => {
  const type = getIdentifyType();
  return type.includes('openrouter');
};

// دریافت لیست مدل‌های OpenRouter (چرخشی)
const getOpenRouterModels = (): string[] => {
  const models = process.env.OPENROUTER_MODELS || process.env.OPENROUTER_MODEL || 'stepfun/step-3.5-flash:free';
  return models.split(',').map(m => m.trim()).filter(Boolean);
};

const shouldUsePlantNet = (): boolean => {
  const type = getAiType();
  return type.includes('plantnet');
};

let plantNetBackoffUntil = 0;
let plantNetBackoffReason = '';

const getPlantNetBackoffMinutes = (): number => {
  const minutes = Number(process.env.PLANTNET_BACKOFF_MINUTES || 5);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 5;
};

const setPlantNetBackoff = (reason: string) => {
  const minutes = getPlantNetBackoffMinutes();
  plantNetBackoffUntil = Date.now() + minutes * 60 * 1000;
  plantNetBackoffReason = reason;
  console.warn(`⏸️ [PlantNet] Backoff فعال شد برای ${minutes} دقیقه. دلیل: ${reason}`);
};

const clearPlantNetBackoff = () => {
  if (plantNetBackoffUntil > 0) {
    console.log('✅ [PlantNet] Backoff برداشته شد');
  }
  plantNetBackoffUntil = 0;
  plantNetBackoffReason = '';
};

const isPlantNetAvailable = (): boolean => {
  const available = Date.now() >= plantNetBackoffUntil;
  if (!available) {
    const remainingMs = plantNetBackoffUntil - Date.now();
    const remainingSec = Math.ceil(remainingMs / 1000);
    console.log(`⏳ [PlantNet] هنوز در backoff است. ${remainingSec} ثانیه باقیمانده. دلیل: ${plantNetBackoffReason}`);
  }
  return available;
};

// شمارنده برای tracking استفاده از کلیدها
let geminiKeyUsageStats: { [key: string]: number } = {};

const generateGeminiContentWithRotation = async (
  prompt: string,
  image?: { mimeType: string; base64: string }
): Promise<any | null> => {
  const keys = getGeminiApiKeys();
  if (!keys.length) {
    console.error('⚠️ GEMINI_API_KEY/GEMINI_API_KEYS تنظیم نشده است');
    return null;
  }

  console.log(`🔑 تعداد کلیدهای Gemini موجود: ${keys.length}`);

  let result: any = null;
  let lastError: any = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const maskedKey = key.substring(0, 8) + '...' + key.substring(key.length - 4);
    
    try {
      console.log(`🔄 استفاده از کلید Gemini #${i + 1}/${keys.length}: ${maskedKey}`);
      const startTime = Date.now();
      
      const client = new GoogleGenerativeAI(key);
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const payload = image
        ? [
            prompt,
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.base64
              }
            }
          ]
        : prompt;

      result = await model.generateContent(payload as any);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Gemini API موفق با کلید #${i + 1} در ${elapsed}ms`);
      
      // ثبت آمار استفاده
      geminiKeyUsageStats[maskedKey] = (geminiKeyUsageStats[maskedKey] || 0) + 1;
      console.log(`📊 آمار استفاده از کلیدها:`, geminiKeyUsageStats);
      
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      const maskedKey = key.substring(0, 8) + '...' + key.substring(key.length - 4);
      if (isQuotaError(err)) {
        console.warn(`⚠️ سهمیه Gemini تمام شد برای کلید #${i + 1} (${maskedKey})، تلاش با کلید بعدی...`);
        continue;
      }
      throw err;
    }
  }

  if (!result) {
    console.error('خطا در شناسایی گیاه با Gemini:', lastError);
    return null;
  }

  return result;
};

// تابع فراخوانی OpenRouter API برای text-to-text با چرخش مدل‌ها
const generateOpenRouterContent = async (prompt: string): Promise<string | null> => {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey) {
    console.error('⚠️ OPENROUTER_API_KEY تنظیم نشده است');
    return null;
  }

  const models = getOpenRouterModels();
  const proxyUrl = process.env.OPENROUTER_PROXY || '';
  
  console.log(`🤖 [OpenRouter] تعداد مدل‌های موجود: ${models.length}`);
  if (proxyUrl) {
    console.log(`🔗 [OpenRouter] استفاده از پروکسی: ${proxyUrl}`);
  }
  
  // تنظیمات پروکسی
  const axiosConfig: any = {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
      'X-Title': 'گلدون'
    },
    timeout: 60000
  };
  
  // اگر پروکسی تنظیم شده باشد
  if (proxyUrl) {
    const proxyParts = proxyUrl.match(/^(https?):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/);
    if (proxyParts) {
      axiosConfig.proxy = {
        protocol: proxyParts[1],
        host: proxyParts[4],
        port: parseInt(proxyParts[5]),
        ...(proxyParts[2] && proxyParts[3] ? {
          auth: {
            username: proxyParts[2],
            password: proxyParts[3]
          }
        } : {})
      };
    }
  }
  
  // چرخش بین مدل‌ها
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    console.log(`🔄 [OpenRouter] تلاش ${i + 1}/${models.length} با مدل: ${model}`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        axiosConfig
      );

      const elapsed = Date.now() - startTime;
      console.log(`✅ [OpenRouter] پاسخ دریافت شد با مدل ${model} در ${elapsed}ms`);

      const text = response.data?.choices?.[0]?.message?.content;
      if (!text) {
        console.warn('⚠️ [OpenRouter] پاسخ خالی از مدل، تلاش با مدل بعدی...');
        continue;
      }

      return text;
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      const statusCode = error?.response?.status;
      const errorMsg = error?.response?.data?.error?.message || error?.message;
      
      // اگر rate limit یا 404 بود، به مدل بعدی برو
      if (statusCode === 429 || statusCode === 404) {
        console.warn(`⚠️ [OpenRouter] مدل ${model} - خطا ${statusCode}: ${errorMsg}`);
        console.warn(`🔄 [OpenRouter] تلاش با مدل بعدی...`);
        continue;
      }
      
      // خطاهای شبکه
      if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNREFUSED') {
        console.error(`⚠️ [OpenRouter] اتصال ممکن نیست (${error.code}) - نیاز به پروکسی دارید`);
        return null;
      }
      
      console.error(`⚠️ [OpenRouter] خطا بعد از ${elapsed}ms:`, errorMsg);
    }
  }
  
  console.error('⚠️ [OpenRouter] همه مدل‌ها خطا دادند');
  return null;
};

// تابع یکپارچه برای دریافت اطلاعات گیاه (Gemini یا OpenRouter)
const generatePlantInfoContent = async (prompt: string): Promise<string | null> => {
  if (shouldUseOpenRouter()) {
    console.log('🔄 [PlantInfo] استفاده از OpenRouter...');
    const result = await generateOpenRouterContent(prompt);
    if (result) return result;
    
    // Fallback به Gemini اگر OpenRouter خطا داد
    console.warn('⚠️ [PlantInfo] OpenRouter خطا داد، تلاش با Gemini...');
  }
  
  console.log('🔄 [PlantInfo] استفاده از Gemini...');
  const geminiResult = await generateGeminiContentWithRotation(prompt);
  if (!geminiResult) return null;
  
  return geminiResult.response.text();
};

// ایجاد فولدر uploads اگر وجود نداشت
const uploadsDir = path.join(__dirname, '../../uploads');
const identifiedImagesDir = path.join(__dirname, '../../uploads/identified');
const mainPicDir = path.join(__dirname, '../../gol_gadering/mainPic');
const picsDir = path.join(__dirname, '../../gol_gadering/pics');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(identifiedImagesDir)) {
  fs.mkdirSync(identifiedImagesDir, { recursive: true });
}

if (!fs.existsSync(mainPicDir)) {
  fs.mkdirSync(mainPicDir, { recursive: true });
}

if (!fs.existsSync(picsDir)) {
  fs.mkdirSync(picsDir, { recursive: true });
}

// تنظیمات multer برای آپلود فایل
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('فرمت فایل مجاز نیست. فقط تصاویر JPG، PNG، WebP و GIF قابل قبول هستند.'));
    }
  }
});

// اینترفیس نتیجه شناسایی
interface PlantIdentificationResult {
  name: string;
  name_fa: string;
  scientificName: string;
  family: string;
  description: string;
  needs: {
    light: string;
    water: string;
    temperature: string;
    humidity: string;
  };
  healthStatus: string;
  disease: string;
  treatment: string;
  careTips: string[];
  confidence: number;
  // فیلدهای اضافی برای ذخیره در دیتابیس
  watering_interval_days: number;
  watering_tips: string;
  light_requirement: string;
  light_description: string;
  min_temperature: number;
  max_temperature: number;
  ideal_temperature: number;
  temperature_tips: string;
  humidity_level: string;
  humidity_tips: string;
  fertilizer_interval_days: number;
  fertilizer_type: string;
  fertilizer_tips: string;
  soil_type: string;
  soil_tips: string;
  difficulty_level: string;
  is_toxic_to_pets: boolean;
  is_air_purifying: boolean;
  // تصاویر
  userImageUrl: string;
  wikipediaImageUrl: string | null;  // تصویر Wikipedia برای ذخیره در دیتابیس
  additionalImages: string[];
}

// پرامپت برای Gemini
const createPrompt = () => `
شما یک متخصص گیاه‌شناسی هستید. لطفاً این تصویر گیاه را تحلیل کنید و اطلاعات زیر را به صورت JSON برگردانید.

مهم: پاسخ باید فقط و فقط یک JSON معتبر باشد بدون هیچ متن اضافی.

{
  "name": "نام فارسی گیاه",
  "name_en": "نام انگلیسی گیاه",
  "scientificName": "نام علمی گیاه",
  "family": "خانواده گیاه به فارسی",
  "description": "توضیح کوتاه درباره گیاه به فارسی (2-3 جمله)",
  "needs": {
    "light": "نیاز نوری (مثل: نور غیرمستقیم زیاد، نور کم، نور مستقیم)",
    "water": "نیاز آبیاری (مثل: هر 3 روز، هفتگی، دو بار در هفته)",
    "temperature": "محدوده دمای مناسب (مثل: 18-25 درجه)",
    "humidity": "نیاز رطوبت (مثل: بالا، متوسط، کم)"
  },
  "healthStatus": "وضعیت سلامت گیاه (سالم، نیاز به توجه، بیمار)",
  "disease": "نام بیماری اگر وجود دارد یا 'ندارد'",
  "treatment": "راه درمان اگر بیماری دارد یا 'نیاز به درمان خاصی ندارد'",
  "careTips": ["نکته مراقبتی 1", "نکته مراقبتی 2", "نکته مراقبتی 3"],
  "confidence": 0.85,
  "watering_interval_days": 7,
  "watering_tips": "نحوه صحیح آبیاری این گیاه به فارسی (1-2 جمله خلاصه)",
  "light_requirement": "indirect",
  "light_description": "توضیح نیاز نوری گیاه به فارسی (1-2 جمله خلاصه)",
  "min_temperature": 15,
  "max_temperature": 28,
  "ideal_temperature": 22,
  "temperature_tips": "توضیح دمای مناسب به فارسی (1 جمله)",
  "humidity_level": "medium",
  "humidity_tips": "توضیح رطوبت مناسب به فارسی (1 جمله)",
  "fertilizer_interval_days": 30,
  "fertilizer_type": "نوع کود مناسب (مثل: کود مایع همه‌کاره)",
  "fertilizer_tips": "نحوه کوددهی به فارسی (1 جمله)",
  "soil_type": "نوع خاک مناسب (مثل: خاک غنی و زهکش‌دار)",
  "soil_tips": "توضیح خاک مناسب به فارسی (1-2 جمله)",
  "difficulty_level": "easy",
  "is_toxic_to_pets": false,
  "is_air_purifying": true
}

نکات مهم:
- light_requirement باید یکی از این مقادیر باشد: direct, indirect, behind_curtain, low_light
- humidity_level باید یکی از این مقادیر باشد: low, medium, high
- difficulty_level باید یکی از این مقادیر باشد: easy, medium, hard
- confidence عددی بین 0 تا 1 است که نشان‌دهنده اطمینان از شناسایی است
- watering_interval_days باید عدد صحیح باشد (تعداد روز بین آبیاری‌ها)
- fertilizer_interval_days باید عدد صحیح باشد (تعداد روز بین کوددهی‌ها)
- همه توضیحات و tips باید به فارسی و خلاصه باشند
`;

// پرامپت ویژه شناسایی بیماری
const createDiseasePrompt = () => `
شما یک متخصص تشخیص بیماری گیاهان هستید. لطفاً این تصویر را با تمرکز روی بیماری/مشکل گیاه تحلیل کنید.

مهم: پاسخ باید فقط و فقط یک JSON معتبر باشد بدون هیچ متن اضافی.

{
  "name": "نام فارسی گیاه",
  "name_en": "نام انگلیسی گیاه",
  "scientificName": "نام علمی گیاه",
  "family": "خانواده گیاه به فارسی",
  "description": "توضیح کوتاه درباره گیاه به فارسی (1-2 جمله)",
  "needs": {
    "light": "نیاز نوری",
    "water": "نیاز آبیاری",
    "temperature": "محدوده دمای مناسب",
    "humidity": "نیاز رطوبت"
  },
  "healthStatus": "وضعیت سلامت گیاه (سالم، نیاز به توجه، بیمار)",
  "disease": "نام بیماری اگر وجود دارد یا 'ندارد'",
  "treatment": "راه درمان مرحله‌به‌مرحله یا 'نیاز به درمان خاصی ندارد'",
  "careTips": ["نکته درمانی 1", "نکته درمانی 2", "نکته درمانی 3"],
  "confidence": 0.85,
  "watering_interval_days": 7,
  "watering_tips": "نحوه صحیح آبیاری این گیاه به فارسی (1-2 جمله خلاصه)",
  "light_requirement": "indirect",
  "light_description": "توضیح نیاز نوری گیاه به فارسی (1-2 جمله خلاصه)",
  "min_temperature": 15,
  "max_temperature": 28,
  "ideal_temperature": 22,
  "temperature_tips": "توضیح دمای مناسب به فارسی (1 جمله)",
  "humidity_level": "medium",
  "humidity_tips": "توضیح رطوبت مناسب به فارسی (1 جمله)",
  "fertilizer_interval_days": 30,
  "fertilizer_type": "نوع کود مناسب (مثل: کود مایع همه‌کاره)",
  "fertilizer_tips": "نحوه کوددهی به فارسی (1 جمله)",
  "soil_type": "نوع خاک مناسب (مثل: خاک غنی و زهکش‌دار)",
  "soil_tips": "توضیح خاک مناسب به فارسی (1-2 جمله)",
  "difficulty_level": "easy",
  "is_toxic_to_pets": false,
  "is_air_purifying": true
}

نکات مهم:
- تمرکز اصلی پاسخ روی بیماری و درمان است
- اگر بیماری مشخص نیست، 'ندارد' بنویسید و دلیل احتمالی (مثلاً کمبود نور/آبیاری) را در treatment توضیح دهید
- light_requirement باید یکی از این مقادیر باشد: direct, indirect, behind_curtain, low_light
- humidity_level باید یکی از این مقادیر باشد: low, medium, high
- difficulty_level باید یکی از این مقادیر باشد: easy, medium, hard
- confidence عددی بین 0 تا 1 است
- همه توضیحات و tips باید به فارسی و خلاصه باشند
`;

// پرامپت تخصصی تشخیص بیماری برای صفحه سلامت گیاه
const createHealthDiagnosisPrompt = () => `
شما یک دکتر متخصص بیماری‌های گیاهی هستید. لطفاً این تصویر را با دقت کامل بررسی کنید و فقط اطلاعات مربوط به بیماری و درمان گیاه را ارائه دهید.

مهم: پاسخ باید فقط و فقط یک JSON معتبر باشد بدون هیچ متن اضافی. اطلاعات کلی گیاه (مثل خانواده، نیاز نوری، خاک و...) نیاز نیست.

{
  "disease": "نام بیماری به فارسی (اگر سالم است بنویسید 'ندارد')",
  "disease_en": "Disease name in English",
  "disease_type": "نوع بیماری - یکی از: قارچی، باکتریایی، ویروسی، آفت حشرات، کمبود مواد غذایی، مشکل محیطی، ندارد",
  "healthStatus": "وضعیت سلامت - یکی از: سالم، نیاز به توجه، بیمار",
  "severity": "شدت بیماری - یکی از: خفیف، متوسط، شدید، ندارد",
  "is_contagious": false,
  "symptoms": ["علامت قابل مشاهده ۱", "علامت قابل مشاهده ۲", "علامت قابل مشاهده ۳"],
  "cause": "دلیل اصلی بروز این بیماری یا مشکل به فارسی (2-3 جمله کامل)",
  "description": "توضیح تخصصی درباره این بیماری، نحوه تأثیر آن بر بافت گیاه و روند پیشرفت بیماری (3-4 جمله)",
  "treatment": "درمان کلی به صورت خلاصه (1-2 جمله)",
  "treatment_steps": [
    "مرحله ۱: اقدام فوری اولیه",
    "مرحله ۲: درمان اصلی با جزئیات",
    "مرحله ۳: مراقبت‌های پس از درمان",
    "مرحله ۴: پیگیری و بررسی نتیجه"
  ],
  "prevention": [
    "راهکار پیشگیری ۱",
    "راهکار پیشگیری ۲",
    "راهکار پیشگیری ۳"
  ],
  "recovery_time": "زمان تقریبی بهبودی (مثلاً: ۱ تا ۲ هفته)",
  "careTips": ["نکته مراقبتی درمانی ۱", "نکته مراقبتی درمانی ۲", "نکته مراقبتی درمانی ۳"],
  "confidence": 0.85
}

نکات بسیار مهم:
- فقط روی بیماری، علائم، علت، درمان و پیشگیری تمرکز کنید
- اطلاعات عمومی گیاه (نام، خانواده، نیاز نوری، آبیاری و...) لازم نیست
- treatment_steps باید مراحل دقیق و عملی درمان باشد که کاربر بتواند مرحله به مرحله انجام دهد
- symptoms باید علائم قابل مشاهده‌ای باشد که در تصویر دیده می‌شود
- cause باید دلیل اصلی بیماری را توضیح دهد
- prevention نکات پیشگیری برای جلوگیری از تکرار بیماری
- اگر گیاه سالم است: disease='ندارد'، severity='ندارد'، symptoms=[]، treatment_steps=[]، prevention باید نکات حفظ سلامت باشد
- is_contagious مشخص کند آیا بیماری به گیاهان مجاور سرایت می‌کند
- recovery_time زمان تقریبی واقع‌بینانه بهبودی
- confidence عددی بین 0 تا 1 است
- همه متون باید به فارسی باشند
`;

const createPromptFromScientificName = (scientificName: string, commonName?: string) => `
شما یک متخصص گیاه‌شناسی هستید. لطفاً بر اساس اطلاعات زیر، مشخصات گیاه را به صورت JSON برگردانید.

نام علمی: ${scientificName}
نام رایج (در صورت وجود): ${commonName || 'نامشخص'}

مهم: پاسخ باید فقط و فقط یک JSON معتبر باشد بدون هیچ متن اضافی.

{
  "name": "نام فارسی گیاه",
  "name_en": "نام انگلیسی گیاه",
  "scientificName": "نام علمی گیاه",
  "family": "خانواده گیاه به فارسی",
  "description": "توضیح کوتاه درباره گیاه به فارسی (2-3 جمله)",
  "needs": {
    "light": "نیاز نوری (مثل: نور غیرمستقیم زیاد، نور کم، نور مستقیم)",
    "water": "نیاز آبیاری (مثل: هر 3 روز، هفتگی، دو بار در هفته)",
    "temperature": "محدوده دمای مناسب (مثل: 18-25 درجه)",
    "humidity": "نیاز رطوبت (مثل: بالا، متوسط، کم)"
  },
  "healthStatus": "وضعیت سلامت گیاه (سالم، نیاز به توجه، بیمار)",
  "disease": "نام بیماری اگر وجود دارد یا 'ندارد'",
  "treatment": "راه درمان اگر بیماری دارد یا 'نیاز به درمان خاصی ندارد'",
  "careTips": ["نکته مراقبتی 1", "نکته مراقبتی 2", "نکته مراقبتی 3"],
  "confidence": 0.85,
  "watering_interval_days": 7,
  "watering_tips": "نحوه صحیح آبیاری این گیاه به فارسی (1-2 جمله خلاصه)",
  "light_requirement": "indirect",
  "light_description": "توضیح نیاز نوری گیاه به فارسی (1-2 جمله خلاصه)",
  "min_temperature": 15,
  "max_temperature": 28,
  "ideal_temperature": 22,
  "temperature_tips": "توضیح دمای مناسب به فارسی (1 جمله)",
  "humidity_level": "medium",
  "humidity_tips": "توضیح رطوبت مناسب به فارسی (1 جمله)",
  "fertilizer_interval_days": 30,
  "fertilizer_type": "نوع کود مناسب (مثل: کود مایع همه‌کاره)",
  "fertilizer_tips": "نحوه کوددهی به فارسی (1 جمله)",
  "soil_type": "نوع خاک مناسب (مثل: خاک غنی و زهکش‌دار)",
  "soil_tips": "توضیح خاک مناسب به فارسی (1-2 جمله)",
  "difficulty_level": "easy",
  "is_toxic_to_pets": false,
  "is_air_purifying": true
}

نکات مهم:
- light_requirement باید یکی از این مقادیر باشد: direct, indirect, behind_curtain, low_light
- humidity_level باید یکی از این مقادیر باشد: low, medium, high
- difficulty_level باید یکی از این مقادیر باشد: easy, medium, hard
- confidence عددی بین 0 تا 1 است که نشان‌دهنده اطمینان از شناسایی است
- watering_interval_days باید عدد صحیح باشد (تعداد روز بین آبیاری‌ها)
- fertilizer_interval_days باید عدد صحیح باشد (تعداد روز بین کوددهی‌ها)
- همه توضیحات و tips باید به فارسی و خلاصه باشند
`;

// ===================================
// سیستم کش: جستجو و ذخیره گیاه در دیتابیس
// ===================================

// جستجوی گیاه در دیتابیس بر اساس نام علمی یا نام فارسی
const findPlantInDatabase = async (scientificName: string, nameFa?: string): Promise<PlantIdentificationResult | null> => {
  try {
    console.log(`🔍 [Cache] جستجوی گیاه در دیتابیس: scientific="${scientificName}" | fa="${nameFa || ''}"`);
    
    const result = await query(
      `SELECT p.*, 
        COALESCE(
          (SELECT json_agg(pi.image_url) FROM plant_images pi WHERE pi.plant_id = p.id),
          '[]'::json
        ) as extra_images
       FROM plants p 
       WHERE p.scientific_name ILIKE $1 
          OR ($2::text IS NOT NULL AND p.name_fa ILIKE $2::text)
       LIMIT 1`,
      [scientificName, nameFa || null]
    );

    if (result.rows.length === 0) {
      console.log('❌ [Cache] گیاه در دیتابیس یافت نشد');
      return null;
    }

    const plant = result.rows[0];
    console.log(`✅ [Cache] گیاه یافت شد در دیتابیس! ID: ${plant.id} | نام: ${plant.name_fa} (${plant.scientific_name})`);

    // ساخت additionalImages از تصاویر ذخیره شده
    const additionalImages: string[] = [];
    if (plant.extra_images && Array.isArray(plant.extra_images)) {
      plant.extra_images.forEach((img: string) => {
        if (img) {
          // تبدیل مسیر /storage/plant/ به /uploads/identified/ برای نمایش فوری
          const displayUrl = img.replace('/storage/plant/', '/uploads/identified/');
          additionalImages.push(displayUrl);
        }
      });
    }

    // تبدیل مقادیر انگلیسی دیتابیس به متن کوتاه فارسی برای نمایش در قسمت "نیازها"
    const lightRequirementMap: { [key: string]: string } = {
      'direct': 'نور مستقیم',
      'indirect': 'نور غیرمستقیم',
      'behind_curtain': 'نور پشت پرده',
      'low_light': 'نور کم',
      'no_light': 'بدون نور مستقیم'
    };
    const humidityLevelMap: { [key: string]: string } = {
      'low': 'رطوبت کم',
      'medium': 'رطوبت متوسط',
      'high': 'رطوبت زیاد'
    };

    const shortLight = lightRequirementMap[plant.light_requirement] || plant.light_requirement || '';
    const shortWater = plant.watering_interval_days ? `هر ${plant.watering_interval_days} روز یک‌بار` : '';
    const shortTemp = (plant.min_temperature && plant.max_temperature)
      ? `${plant.min_temperature}–${plant.max_temperature} درجه`
      : (plant.ideal_temperature ? `${plant.ideal_temperature} درجه` : '');
    const shortHumidity = humidityLevelMap[plant.humidity_level] || plant.humidity_level || '';

    // ساخت PlantIdentificationResult از اطلاعات دیتابیس
    return {
      name: plant.name_fa || plant.name,
      name_fa: plant.name_fa || plant.name,
      scientificName: plant.scientific_name || scientificName,
      family: '', // خانواده در جدول plants ذخیره نشده، مقدار خالی
      description: plant.description_fa || '',
      needs: {
        light: shortLight,
        water: shortWater,
        temperature: shortTemp,
        humidity: shortHumidity
      },
      healthStatus: 'سالم',
      disease: 'ندارد',
      treatment: 'نیاز به درمان خاصی ندارد',
      careTips: [],
      confidence: 0.95,
      watering_interval_days: plant.watering_interval_days || 7,
      watering_tips: plant.watering_tips || '',
      light_requirement: plant.light_requirement || 'indirect',
      light_description: plant.light_description || '',
      min_temperature: plant.min_temperature || 15,
      max_temperature: plant.max_temperature || 28,
      ideal_temperature: plant.ideal_temperature || 22,
      temperature_tips: plant.temperature_tips || '',
      humidity_level: plant.humidity_level || 'medium',
      humidity_tips: plant.humidity_tips || '',
      fertilizer_interval_days: plant.fertilizer_interval_days || 30,
      fertilizer_type: plant.fertilizer_type || 'کود مایع همه‌کاره',
      fertilizer_tips: plant.fertilizer_tips || '',
      soil_type: '', // در دیتابیس نیست
      soil_tips: '',
      difficulty_level: plant.difficulty_level || 'medium',
      is_toxic_to_pets: plant.is_toxic_to_pets || false,
      is_air_purifying: plant.is_air_purifying || false,
      userImageUrl: '',
      wikipediaImageUrl: plant.main_image_url || null,
      additionalImages
    };
  } catch (error) {
    console.error('❌ [Cache] خطا در جستجوی دیتابیس:', error);
    return null;
  }
};

// ذخیره گیاه جدید در دیتابیس (جدول plants)
const savePlantToDatabase = async (plantData: PlantIdentificationResult): Promise<number | null> => {
  try {
    // بررسی تکراری نبودن
    const existing = await query(
      'SELECT id FROM plants WHERE scientific_name = $1 OR name_fa = $2',
      [plantData.scientificName, plantData.name_fa]
    );

    if (existing.rows.length > 0) {
      console.log(`⚠️ [Cache] گیاه قبلاً در دیتابیس موجود بود. ID: ${existing.rows[0].id}`);
      return existing.rows[0].id;
    }

    const mainImageUrl = plantData.wikipediaImageUrl || plantData.userImageUrl || null;

    const newPlant = await query(`
      INSERT INTO plants (
        name, name_fa, scientific_name, description_fa,
        main_image_url, watering_interval_days, watering_tips,
        light_requirement, light_description,
        min_temperature, max_temperature, ideal_temperature, temperature_tips,
        humidity_level, humidity_tips,
        fertilizer_interval_days, fertilizer_type, fertilizer_tips,
        difficulty_level, is_toxic_to_pets, is_air_purifying
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id
    `, [
      plantData.name_fa,
      plantData.name_fa,
      plantData.scientificName,
      plantData.description,
      mainImageUrl,
      plantData.watering_interval_days,
      plantData.watering_tips,
      plantData.light_requirement,
      plantData.light_description,
      plantData.min_temperature,
      plantData.max_temperature,
      plantData.ideal_temperature,
      plantData.temperature_tips,
      plantData.humidity_level,
      plantData.humidity_tips,
      plantData.fertilizer_interval_days,
      plantData.fertilizer_type,
      plantData.fertilizer_tips,
      plantData.difficulty_level,
      plantData.is_toxic_to_pets,
      plantData.is_air_purifying
    ]);

    const plantId = newPlant.rows[0].id;
    console.log(`✅ [Cache] گیاه جدید در دیتابیس ذخیره شد! ID: ${plantId} | نام: ${plantData.name_fa} (${plantData.scientificName})`);

    // ذخیره تصاویر اضافی
    if (plantData.additionalImages && Array.isArray(plantData.additionalImages)) {
      for (const imgUrl of plantData.additionalImages) {
        const permanentUrl = imgUrl.replace('/uploads/identified/', '/storage/plant/');
        await query(
          'INSERT INTO plant_images (plant_id, image_url, is_main) VALUES ($1, $2, $3)',
          [plantId, permanentUrl, false]
        );
      }
    }

    return plantId;
  } catch (error) {
    console.error('❌ [Cache] خطا در ذخیره گیاه در دیتابیس:', error);
    return null;
  }
};

// پرامپت سریع فقط برای شناسایی نام گیاه (بدون اطلاعات کامل)
const createQuickIdentifyPrompt = () => `
شما یک متخصص گیاه‌شناسی هستید. لطفاً این تصویر گیاه را شناسایی کنید و فقط اطلاعات پایه آن را به صورت JSON برگردانید.

مهم: پاسخ باید فقط و فقط یک JSON معتبر باشد بدون هیچ متن اضافی.

{
  "name_fa": "نام فارسی گیاه",
  "name_en": "نام انگلیسی گیاه",
  "scientificName": "نام علمی گیاه",
  "confidence": 0.85
}

نکات:
- confidence عددی بین 0 تا 1 است
- نام علمی باید دقیق و صحیح باشد
`;

// تابع دانلود تصویر از Wikipedia و ذخیره در چند مسیر
const downloadPlantImageFromWikipedia = async (plantName: string, scientificName: string): Promise<{ mainImage: string | null; additionalImage: string | null }> => {
  const startTotal = Date.now();
  try {
    console.log('🔍 [Wikipedia] شروع جستجوی تصویر...');
    
    // اول با نام علمی جستجو می‌کنیم (دقیق‌تر است)
    const searchTerms = [scientificName, plantName].filter(Boolean);
    
    for (const searchTerm of searchTerms) {
      try {
        // جستجو در Wikipedia برای یافتن صفحه
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&srlimit=1`;
        
        const searchResponse = await axios.get(searchUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'GoldanPlantCareApp/1.0 (Plant identification app)'
          }
        });
        
        if (!searchResponse.data?.query?.search?.length) {
          continue;
        }
        
        const pageTitle = searchResponse.data.query.search[0].title;
        console.log(`📄 صفحه یافت شد: ${pageTitle}`);
        
        // دریافت تصاویر صفحه
        const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&format=json&pithumbsize=500`;
        
        const imageResponse = await axios.get(imageUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'GoldanPlantCareApp/1.0 (Plant identification app)'
          }
        });
        
        const pages = imageResponse.data?.query?.pages;
        if (!pages) continue;
        
        const pageId = Object.keys(pages)[0];
        const thumbnailUrl = pages[pageId]?.thumbnail?.source;
        
        if (!thumbnailUrl) {
          console.log('⚠️ تصویر در این صفحه یافت نشد');
          continue;
        }
        
        console.log(`📥 دانلود تصویر از Wikipedia...`);
        
        // دانلود تصویر
        const downloadResponse = await axios.get(thumbnailUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
          headers: {
            'User-Agent': 'GoldanPlantCareApp/1.0 (Plant identification app)'
          }
        });
        
        if (downloadResponse.status === 200 && downloadResponse.data) {
          const contentType = downloadResponse.headers['content-type'] || 'image/jpeg';
          let ext = '.jpg';
          if (contentType.includes('png')) ext = '.png';
          else if (contentType.includes('webp')) ext = '.webp';
          else if (contentType.includes('gif')) ext = '.gif';
          
          // ایجاد نام فایل یکتا
          const uniqueId = crypto.randomBytes(10).toString('base64url');
          const filename = `${uniqueId}${ext}`;
          
          // ذخیره در mainPic (برای main_image_url در دیتابیس)
          const mainPicPath = path.join(mainPicDir, filename);
          fs.writeFileSync(mainPicPath, downloadResponse.data);
          console.log(`✅ تصویر در mainPic ذخیره شد: ${filename}`);
          
          // ذخیره در pics (برای تصاویر اضافی)
          const picsPath = path.join(picsDir, filename);
          fs.writeFileSync(picsPath, downloadResponse.data);
          console.log(`✅ تصویر در pics ذخیره شد: ${filename}`);
          
          // ذخیره در identified هم (برای نمایش فوری بعد از شناسایی)
          const identifiedPath = path.join(identifiedImagesDir, filename);
          fs.writeFileSync(identifiedPath, downloadResponse.data);
          console.log(`✅ تصویر در identified ذخیره شد: ${filename}`);
          
          const totalElapsed = Date.now() - startTotal;
          console.log(`⏱️ [Wikipedia] کل عملیات دانلود تصویر: ${totalElapsed}ms`);
          
          return {
            mainImage: `/storage/plant/${filename}`,  // برای ذخیره در دیتابیس
            additionalImage: `/uploads/identified/${filename}`  // برای نمایش فوری
          };
        }
      } catch (searchErr: any) {
        console.log(`⚠️ خطا در جستجوی "${searchTerm}": ${searchErr.message}`);
        continue;
      }
    }
    
    console.log('⚠️ تصویری در Wikipedia یافت نشد');
    const totalElapsed = Date.now() - startTotal;
    console.log(`⏱️ [Wikipedia] کل عملیات (بدون نتیجه): ${totalElapsed}ms`);
    return { mainImage: null, additionalImage: null };
    
  } catch (error: any) {
    console.log('⚠️ خطا در دانلود از Wikipedia:', error.message);
    return { mainImage: null, additionalImage: null };
  }
};

const identifyScientificNameWithPlantNet = async (imagePath: string, mimeType: string) => {
  const startTotal = Date.now();
  const apiKey = process.env.PLANTNET_API_KEY || '';
  if (!apiKey) {
    console.error('⚠️ PLANTNET_API_KEY تنظیم نشده است');
    return null;
  }

  const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(apiKey)}`;
  const timeoutMs = Number(process.env.PLANTNET_TIMEOUT_MS || 45000);
  const maxRetries = Number(process.env.PLANTNET_RETRIES || 2);

  console.log(`🌱 [PlantNet] شروع شناسایی با timeout: ${timeoutMs}ms`);

  // Resize تصویر برای کاهش حجم و افزایش سرعت (فقط اگر بزرگتر از 400KB باشد)
  const resizedImagePath = imagePath.replace(/(\.\w+)$/, '-resized$1');
  const fileSizeBytes = fs.statSync(imagePath).size;
  const fileSizeKB = fileSizeBytes / 1024;
  const shouldResize = fileSizeKB >= 400;

  if (shouldResize) {
    const startResize = Date.now();
    try {
      await sharp(imagePath)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(resizedImagePath);
      
      const resizeElapsed = Date.now() - startResize;
      console.log(`✅ [PlantNet] تصویر resize شد در ${resizeElapsed}ms: ${path.basename(imagePath)} (${fileSizeKB.toFixed(1)} KB)`);
    } catch (resizeError) {
      const resizeElapsed = Date.now() - startResize;
      console.error(`⚠️ [PlantNet] خطا در resize تصویر بعد از ${resizeElapsed}ms، از اصلی استفاده می‌شود:`, resizeError);
    }
  } else {
    console.log(`⏭️ [PlantNet] تصویر کوچک است (${fileSizeKB.toFixed(1)} KB < 400 KB)، resize نمی‌شود`);
  }

  const imageToUpload = fs.existsSync(resizedImagePath) ? resizedImagePath : imagePath;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      console.log(`🌱 [PlantNet] تلاش ${attempt + 1}/${maxRetries + 1}...`);
      const startApi = Date.now();
      
      const form = new FormData();
      form.append('organs', 'leaf');
      form.append('images', fs.createReadStream(imageToUpload), {
        filename: path.basename(imagePath),
        contentType: mimeType
      });

      const response = await axios.post(url, form, {
        headers: {
          ...form.getHeaders()
        },
        timeout: timeoutMs
      });

      const apiElapsed = Date.now() - startApi;
      console.log(`✅ [PlantNet] پاسخ دریافت شد در ${apiElapsed}ms`);

      const top = response.data?.results?.[0];
      const scientificName = top?.species?.scientificNameWithoutAuthor || top?.species?.scientificName;
      const commonName = Array.isArray(top?.species?.commonNames)
        ? top.species.commonNames[0]
        : undefined;

      if (!scientificName) {
        // پاک کردن فایل resize شده
        if (fs.existsSync(resizedImagePath)) {
          fs.unlinkSync(resizedImagePath);
        }
        const totalElapsed = Date.now() - startTotal;
        console.log(`⏱️ [PlantNet] کل عملیات (بدون نتیجه): ${totalElapsed}ms`);
        return null;
      }

      // پاک کردن فایل resize شده
      if (fs.existsSync(resizedImagePath)) {
        fs.unlinkSync(resizedImagePath);
      }

      const totalElapsed = Date.now() - startTotal;
      console.log(`⏱️ [PlantNet] کل عملیات موفق: ${totalElapsed}ms - نام علمی: ${scientificName}`);

      // اگر PlantNet موفق بود، backoff را پاک کن (اگر قبلاً فعال بود)
      clearPlantNetBackoff();

      return {
        scientificName,
        commonName,
        confidence: top?.score ?? null
      };
    } catch (error: any) {
      lastError = error;
      const apiElapsed = Date.now() - startTotal;
      const isTimeout = error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout');
      console.warn(`⚠️ [PlantNet] خطا در تلاش ${attempt + 1} بعد از ${apiElapsed}ms: ${error?.message || error}`);
      if (attempt < maxRetries && isTimeout) {
        const delay = 500 * (attempt + 1);
        console.log(`🔄 [PlantNet] انتظار ${delay}ms قبل از تلاش مجدد...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }

  // پاک کردن فایل resize شده در صورت خطا
  if (fs.existsSync(resizedImagePath)) {
    fs.unlinkSync(resizedImagePath);
  }

  const totalElapsed = Date.now() - startTotal;
  
  // بررسی نوع خطا برای تصمیم‌گیری درباره backoff
  const isNetworkError = lastError?.code === 'ECONNABORTED' || 
                         lastError?.code === 'ENOTFOUND' ||
                         lastError?.code === 'ETIMEDOUT' ||
                         String(lastError?.message || '').includes('timeout') ||
                         String(lastError?.message || '').includes('network');
  
  if (isNetworkError) {
    setPlantNetBackoff(`خطای شبکه در PlantNet: ${lastError?.message || lastError}`);
  }
  
  console.error(`⚠️ [PlantNet] خطا در درخواست بعد از ${totalElapsed}ms:`, lastError?.message || lastError);
  return null;
};

// تابع شناسایی گیاه با Gemini
const identifyPlantWithGemini = async (
  imagePath: string,
  mimeType: string = 'image/jpeg',
  promptOverride?: string
): Promise<PlantIdentificationResult | null> => {
  const startTotal = Date.now();
  try {
    console.log('🤖 [Gemini] شروع شناسایی گیاه با تصویر...');
    
    // خواندن تصویر
    const startRead = Date.now();
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const readElapsed = Date.now() - startRead;
    console.log(`📖 [Gemini] تصویر خوانده شد در ${readElapsed}ms (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
    
    // اگر promptOverride داریم (مثل شناسایی بیماری)، مستقیم از AI استفاده کن
    if (promptOverride) {
      console.log('📋 [Gemini] حالت سفارشی (بیماری) - بدون کش');
      const result = await generateGeminiContentWithRotation(promptOverride, {
        mimeType,
        base64: base64Image
      });
      if (!result) return null;
      
      const response = result.response;
      const text = response.text();
      let jsonStr = text;
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      const plantData = JSON.parse(jsonStr);
      
      const wikipediaImages = await downloadPlantImageFromWikipedia(
        plantData.name_en || plantData.scientificName,
        plantData.scientificName
      );
      const additionalImages: string[] = [];
      if (wikipediaImages.additionalImage) additionalImages.push(wikipediaImages.additionalImage);
      const userImageUrl = `/uploads/${path.basename(imagePath)}`;
      
      return {
        name: plantData.name, name_fa: plantData.name,
        scientificName: plantData.scientificName, family: plantData.family,
        description: plantData.description, needs: plantData.needs,
        healthStatus: plantData.healthStatus, disease: plantData.disease,
        treatment: plantData.treatment, careTips: plantData.careTips,
        confidence: plantData.confidence || 0.8,
        watering_interval_days: plantData.watering_interval_days || 7,
        watering_tips: plantData.watering_tips || plantData.needs?.water || '',
        light_requirement: plantData.light_requirement || 'indirect',
        light_description: plantData.light_description || plantData.needs?.light || '',
        min_temperature: plantData.min_temperature || 15,
        max_temperature: plantData.max_temperature || 28,
        ideal_temperature: plantData.ideal_temperature || 22,
        temperature_tips: plantData.temperature_tips || plantData.needs?.temperature || '',
        humidity_level: plantData.humidity_level || 'medium',
        humidity_tips: plantData.humidity_tips || plantData.needs?.humidity || '',
        fertilizer_interval_days: plantData.fertilizer_interval_days || 30,
        fertilizer_type: plantData.fertilizer_type || 'کود مایع همه‌کاره',
        fertilizer_tips: plantData.fertilizer_tips || '',
        soil_type: plantData.soil_type || 'خاک غنی و زهکش‌دار',
        soil_tips: plantData.soil_tips || '',
        difficulty_level: plantData.difficulty_level || 'medium',
        is_toxic_to_pets: plantData.is_toxic_to_pets || false,
        is_air_purifying: plantData.is_air_purifying || false,
        userImageUrl,
        wikipediaImageUrl: wikipediaImages.mainImage || null,
        additionalImages
      };
    }

    // *** مرحله جدید: ابتدا فقط نام علمی را شناسایی کن ***
    console.log('🔍 [Gemini] مرحله 1: شناسایی سریع نام علمی...');
    const startQuick = Date.now();
    const quickResult = await generateGeminiContentWithRotation(createQuickIdentifyPrompt(), {
      mimeType,
      base64: base64Image
    });
    const quickElapsed = Date.now() - startQuick;
    
    let scientificName = '';
    let nameFa = '';
    
    if (quickResult) {
      try {
        const quickText = quickResult.response.text();
        let quickJson = quickText;
        const quickMatch = quickText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (quickMatch) quickJson = quickMatch[1].trim();
        const quickData = JSON.parse(quickJson);
        scientificName = quickData.scientificName || '';
        nameFa = quickData.name_fa || '';
        console.log(`✅ [Gemini] نام علمی شناسایی شد در ${quickElapsed}ms: ${scientificName} (${nameFa})`);
      } catch (parseErr) {
        console.warn(`⚠️ [Gemini] خطا در پارس نام علمی:`, parseErr);
      }
    }

    // *** مرحله 2: بررسی دیتابیس ***
    if (scientificName) {
      console.log('🗄️ [Gemini] مرحله 2: بررسی پایگاه داده...');
      const cachedPlant = await findPlantInDatabase(scientificName, nameFa);
      
      if (cachedPlant) {
        const totalElapsed = Date.now() - startTotal;
        console.log(`⚡ [Cache HIT] گیاه از دیتابیس برگردانده شد در ${totalElapsed}ms (بدون AI اضافی)`);
        
        // تصویر کاربر را اضافه کن
        cachedPlant.userImageUrl = `/uploads/${path.basename(imagePath)}`;
        return cachedPlant;
      }
    }

    // *** مرحله 3: گیاه در دیتابیس نیست - اطلاعات کامل از AI ***
    console.log('🤖 [Gemini] مرحله 3: دریافت اطلاعات کامل از AI (گیاه جدید)...');
    const prompt = createPrompt();

    const result = await generateGeminiContentWithRotation(prompt, {
      mimeType,
      base64: base64Image
    });

    if (!result) return null;
    
    const response = result.response;
    const text = response.text();
    
    // استخراج JSON از پاسخ
    let jsonStr = text;
    
    // حذف markdown code blocks اگر وجود دارد
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // پارس JSON
    const plantData = JSON.parse(jsonStr);
    
    // دانلود تصویر از Wikipedia
    const wikipediaImages = await downloadPlantImageFromWikipedia(
      plantData.name_en || plantData.scientificName,
      plantData.scientificName
    );
    
    // ساخت لیست تصاویر اضافی (برای نمایش فوری)
    const additionalImages: string[] = [];
    if (wikipediaImages.additionalImage) {
      additionalImages.push(wikipediaImages.additionalImage);
    }
    
    // ساخت URL تصویر کاربر
    const userImageUrl = `/uploads/${path.basename(imagePath)}`;
    
    // تصویر Wikipedia برای ذخیره در دیتابیس (مسیر /storage/plant/)
    const wikipediaImageUrl = wikipediaImages.mainImage || null;
    
    const identificationResult: PlantIdentificationResult = {
      name: plantData.name,
      name_fa: plantData.name,
      scientificName: plantData.scientificName,
      family: plantData.family,
      description: plantData.description,
      needs: plantData.needs,
      healthStatus: plantData.healthStatus,
      disease: plantData.disease,
      treatment: plantData.treatment,
      careTips: plantData.careTips,
      confidence: plantData.confidence || 0.8,
      watering_interval_days: plantData.watering_interval_days || 7,
      watering_tips: plantData.watering_tips || plantData.needs?.water || '',
      light_requirement: plantData.light_requirement || 'indirect',
      light_description: plantData.light_description || plantData.needs?.light || '',
      min_temperature: plantData.min_temperature || 15,
      max_temperature: plantData.max_temperature || 28,
      ideal_temperature: plantData.ideal_temperature || 22,
      temperature_tips: plantData.temperature_tips || plantData.needs?.temperature || '',
      humidity_level: plantData.humidity_level || 'medium',
      humidity_tips: plantData.humidity_tips || plantData.needs?.humidity || '',
      fertilizer_interval_days: plantData.fertilizer_interval_days || 30,
      fertilizer_type: plantData.fertilizer_type || 'کود مایع همه‌کاره',
      fertilizer_tips: plantData.fertilizer_tips || '',
      soil_type: plantData.soil_type || 'خاک غنی و زهکش‌دار',
      soil_tips: plantData.soil_tips || '',
      difficulty_level: plantData.difficulty_level || 'medium',
      is_toxic_to_pets: plantData.is_toxic_to_pets || false,
      is_air_purifying: plantData.is_air_purifying || false,
      userImageUrl,
      wikipediaImageUrl,
      additionalImages
    };

    // *** مرحله 4: ذخیره گیاه جدید در دیتابیس ***
    console.log('💾 [Cache] ذخیره گیاه جدید در پایگاه داده...');
    await savePlantToDatabase(identificationResult);

    const totalElapsed = Date.now() - startTotal;
    console.log(`✅ [Gemini] شناسایی کامل + ذخیره در ${totalElapsed}ms`);

    return identificationResult;
  } catch (error) {
    const totalElapsed = Date.now() - startTotal;
    console.error(`خطا در شناسایی گیاه با Gemini بعد از ${totalElapsed}ms:`, error);
    return null;
  }
};

const identifyPlantWithPlantNetAndGemini = async (
  imagePath: string,
  mimeType: string = 'image/jpeg'
): Promise<PlantIdentificationResult | null> => {
  const startTotal = Date.now();
  console.log('🌿 [PlantNet+Gemini] شروع شناسایی ترکیبی...');
  
  try {
    if (!isPlantNetAvailable()) {
      console.warn('⚠️ PlantNet موقتاً در دسترس نیست. ادامه با Gemini تصویر...');
      return await identifyPlantWithGemini(imagePath, mimeType);
    }

    console.log('🌱 [PlantNet+Gemini] مرحله 1: شناسایی نام علمی با PlantNet...');
    const startPlantNet = Date.now();
    const plantnet = await identifyScientificNameWithPlantNet(imagePath, mimeType);
    const plantNetElapsed = Date.now() - startPlantNet;
    console.log(`⏱️ [PlantNet+Gemini] مرحله 1 کامل شد در ${plantNetElapsed}ms`);
    if (!plantnet?.scientificName) {
      console.warn('⚠️ PlantNet نتوانست نام علمی برگرداند. تلاش با Gemini تصویر...');
      // اگر PlantNet گیاه را نشناسد، backoff نمی‌کنیم چون API کار می‌کند
      // فقط برای خطاهای شبکه/timeout باید backoff کنیم
      return await identifyPlantWithGemini(imagePath, mimeType);
    }

    // *** مرحله جدید: بررسی دیتابیس قبل از درخواست اطلاعات کامل ***
    console.log('🗄️ [PlantNet+AI] مرحله 1.5: بررسی پایگاه داده...');
    const cachedPlant = await findPlantInDatabase(plantnet.scientificName, plantnet.commonName);
    
    if (cachedPlant) {
      const totalElapsed = Date.now() - startTotal;
      console.log(`⚡ [Cache HIT] گیاه از دیتابیس برگردانده شد در ${totalElapsed}ms (بدون AI اضافی)`);
      cachedPlant.userImageUrl = `/uploads/${path.basename(imagePath)}`;
      cachedPlant.confidence = plantnet.confidence || cachedPlant.confidence;
      return cachedPlant;
    }
    console.log('🆕 [Cache MISS] گیاه جدید است - ادامه با AI...');

    console.log('🤖 [PlantNet+AI] مرحله 2: دریافت اطلاعات کامل...');
    const startAI = Date.now();
    const prompt = createPromptFromScientificName(plantnet.scientificName, plantnet.commonName);
    const text = await generatePlantInfoContent(prompt);
    const aiElapsed = Date.now() - startAI;
    console.log(`⏱️ [PlantNet+AI] مرحله 2 کامل شد در ${aiElapsed}ms`);
    
    if (!text) return null;

    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const plantData = JSON.parse(jsonStr);

    console.log('📥 [PlantNet+AI] مرحله 3: دانلود تصویر از Wikipedia...');
    const startWiki = Date.now();
    const wikipediaImages = await downloadPlantImageFromWikipedia(
      plantData.name_en || plantData.scientificName || plantnet.scientificName,
      plantData.scientificName || plantnet.scientificName
    );
    const wikiElapsed = Date.now() - startWiki;
    console.log(`⏱️ [PlantNet+AI] مرحله 3 کامل شد در ${wikiElapsed}ms`);

    const additionalImages: string[] = [];
    if (wikipediaImages.additionalImage) {
      additionalImages.push(wikipediaImages.additionalImage);
    }

    const userImageUrl = `/uploads/${path.basename(imagePath)}`;
    const wikipediaImageUrl = wikipediaImages.mainImage || null;

    const totalElapsed = Date.now() - startTotal;
    console.log(`✅ [PlantNet+AI] کل عملیات موفق در ${totalElapsed}ms`);
    console.log(`📊 [خلاصه زمان‌بندی] PlantNet: ${plantNetElapsed}ms | AI: ${aiElapsed}ms | Wikipedia: ${wikiElapsed}ms | کل: ${totalElapsed}ms`);

    const identificationResult: PlantIdentificationResult = {
      name: plantData.name,
      name_fa: plantData.name,
      scientificName: plantData.scientificName || plantnet.scientificName,
      family: plantData.family,
      description: plantData.description,
      needs: plantData.needs,
      healthStatus: plantData.healthStatus,
      disease: plantData.disease,
      treatment: plantData.treatment,
      careTips: plantData.careTips,
      confidence: plantData.confidence || plantnet.confidence || 0.8,
      watering_interval_days: plantData.watering_interval_days || 7,
      watering_tips: plantData.watering_tips || plantData.needs?.water || '',
      light_requirement: plantData.light_requirement || 'indirect',
      light_description: plantData.light_description || plantData.needs?.light || '',
      min_temperature: plantData.min_temperature || 15,
      max_temperature: plantData.max_temperature || 28,
      ideal_temperature: plantData.ideal_temperature || 22,
      temperature_tips: plantData.temperature_tips || plantData.needs?.temperature || '',
      humidity_level: plantData.humidity_level || 'medium',
      humidity_tips: plantData.humidity_tips || plantData.needs?.humidity || '',
      fertilizer_interval_days: plantData.fertilizer_interval_days || 30,
      fertilizer_type: plantData.fertilizer_type || 'کود مایع همه‌کاره',
      fertilizer_tips: plantData.fertilizer_tips || '',
      soil_type: plantData.soil_type || 'خاک غنی و زهکش‌دار',
      soil_tips: plantData.soil_tips || '',
      difficulty_level: plantData.difficulty_level || 'medium',
      is_toxic_to_pets: plantData.is_toxic_to_pets || false,
      is_air_purifying: plantData.is_air_purifying || false,
      userImageUrl,
      wikipediaImageUrl,
      additionalImages
    };

    // *** ذخیره گیاه جدید در دیتابیس ***
    console.log('💾 [Cache] ذخیره گیاه جدید در پایگاه داده...');
    await savePlantToDatabase(identificationResult);

    return identificationResult;
  } catch (error: any) {
    const totalElapsed = Date.now() - startTotal;
    console.error(`خطا در شناسایی گیاه با PlantNet + Gemini بعد از ${totalElapsed}ms:`, error);
    // فقط برای خطاهای شبکه/timeout backoff کن
    const isNetworkError = error?.code === 'ECONNABORTED' || 
                           error?.code === 'ENOTFOUND' ||
                           error?.code === 'ETIMEDOUT' ||
                           String(error?.message || '').includes('timeout') ||
                           String(error?.message || '').includes('network');
    if (isNetworkError) {
      setPlantNetBackoff(`خطای شبکه: ${error?.message || error}`);
    }
    return await identifyPlantWithGemini(imagePath, mimeType);
  }
};

// ===================================
// Middleware - Optional Auth (بدون بلاک کردن، فقط کاربر را attach می‌کند)
// ===================================
const optionalAuthMiddleware = async (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const user = await userService.verifyAuthToken(token);
      if (user) {
        (req as any).user = user;
      }
    } catch (e) {
      // نادیده بگیر
    }
  }
  next();
};

// ===================================
// حالت عادی: فقط PlantNet (بدون Gemini fallback)
// ===================================
const identifyPlantNormalMode = async (
  imagePath: string,
  mimeType: string = 'image/jpeg'
): Promise<{ result: PlantIdentificationResult | null; lowConfidence?: boolean; suggestPro?: string }> => {
  const startTotal = Date.now();
  console.log('🌿 [Normal Mode] شروع شناسایی فقط با PlantNet...');

  try {
    if (!isPlantNetAvailable()) {
      console.warn('⚠️ [Normal Mode] PlantNet موقتاً در دسترس نیست');
      return {
        result: null,
        suggestPro: 'سرویس شناسایی موقتاً در دسترس نیست. می‌توانید از مدل Pro استفاده کنید.'
      };
    }

    const plantnet = await identifyScientificNameWithPlantNet(imagePath, mimeType);

    if (!plantnet?.scientificName) {
      console.warn('⚠️ [Normal Mode] PlantNet نتوانست گیاه را شناسایی کند');
      return {
        result: null,
        suggestPro: 'متأسفانه این گیاه قابل شناسایی نیست. می‌توانید از مدل Pro برای شناسایی دقیق‌تر استفاده کنید.'
      };
    }

    const confidence = plantnet.confidence ?? 0;
    console.log(`📊 [Normal Mode] PlantNet confidence: ${(confidence * 100).toFixed(1)}%`);

    // بررسی دیتابیس
    const cachedPlant = await findPlantInDatabase(plantnet.scientificName, plantnet.commonName);
    if (cachedPlant) {
      cachedPlant.userImageUrl = `/uploads/${path.basename(imagePath)}`;
      cachedPlant.confidence = confidence;
      const totalElapsed = Date.now() - startTotal;
      console.log(`⚡ [Normal Mode] Cache HIT در ${totalElapsed}ms`);

      // اگر درصد اطمینان زیر 30% باشه، پیشنهاد Pro بده
      if (confidence < 0.3) {
        return {
          result: cachedPlant,
          lowConfidence: true,
          suggestPro: 'درصد اطمینان شناسایی گیاه پایین است. برای افزایش کیفیت، می‌توانید از مدل Pro استفاده کنید.'
        };
      }

      return { result: cachedPlant };
    }

    // گیاه جدید - اطلاعات کامل از AI (اما فقط text، بدون تصویر)
    console.log('🤖 [Normal Mode] دریافت اطلاعات کامل از AI...');
    const prompt = createPromptFromScientificName(plantnet.scientificName, plantnet.commonName);
    const text = await generatePlantInfoContent(prompt);

    if (!text) {
      return {
        result: null,
        suggestPro: 'خطا در دریافت اطلاعات گیاه. می‌توانید از مدل Pro استفاده کنید.'
      };
    }

    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const plantData = JSON.parse(jsonStr);

    // دانلود تصویر از Wikipedia
    const wikipediaImages = await downloadPlantImageFromWikipedia(
      plantData.name_en || plantData.scientificName || plantnet.scientificName,
      plantData.scientificName || plantnet.scientificName
    );

    const additionalImages: string[] = [];
    if (wikipediaImages.additionalImage) additionalImages.push(wikipediaImages.additionalImage);

    const userImageUrl = `/uploads/${path.basename(imagePath)}`;

    const identificationResult: PlantIdentificationResult = {
      name: plantData.name,
      name_fa: plantData.name,
      scientificName: plantData.scientificName || plantnet.scientificName,
      family: plantData.family,
      description: plantData.description,
      needs: plantData.needs,
      healthStatus: plantData.healthStatus,
      disease: plantData.disease,
      treatment: plantData.treatment,
      careTips: plantData.careTips,
      confidence: confidence,
      watering_interval_days: plantData.watering_interval_days || 7,
      watering_tips: plantData.watering_tips || plantData.needs?.water || '',
      light_requirement: plantData.light_requirement || 'indirect',
      light_description: plantData.light_description || plantData.needs?.light || '',
      min_temperature: plantData.min_temperature || 15,
      max_temperature: plantData.max_temperature || 28,
      ideal_temperature: plantData.ideal_temperature || 22,
      temperature_tips: plantData.temperature_tips || plantData.needs?.temperature || '',
      humidity_level: plantData.humidity_level || 'medium',
      humidity_tips: plantData.humidity_tips || plantData.needs?.humidity || '',
      fertilizer_interval_days: plantData.fertilizer_interval_days || 30,
      fertilizer_type: plantData.fertilizer_type || 'کود مایع همه‌کاره',
      fertilizer_tips: plantData.fertilizer_tips || '',
      soil_type: plantData.soil_type || 'خاک غنی و زهکش‌دار',
      soil_tips: plantData.soil_tips || '',
      difficulty_level: plantData.difficulty_level || 'medium',
      is_toxic_to_pets: plantData.is_toxic_to_pets || false,
      is_air_purifying: plantData.is_air_purifying || false,
      userImageUrl,
      wikipediaImageUrl: wikipediaImages.mainImage || null,
      additionalImages
    };

    // فقط اگر confidence >= 0.5 باشد در بانک ذخیره کن
    if (confidence >= 0.5) {
      console.log('💾 [Normal Mode] ذخیره گیاه در بانک (confidence >= 50%)...');
      await savePlantToDatabase(identificationResult);
    } else {
      console.log(`⚠️ [Normal Mode] عدم ذخیره در بانک (confidence ${(confidence * 100).toFixed(1)}% < 60%)`);
    }

    const totalElapsed = Date.now() - startTotal;
    console.log(`✅ [Normal Mode] شناسایی کامل در ${totalElapsed}ms`);

    // اگر درصد اطمینان زیر 30% باشه، پیشنهاد Pro بده
    if (confidence < 0.3) {
      return {
        result: identificationResult,
        lowConfidence: true,
        suggestPro: 'درصد اطمینان شناسایی گیاه پایین است. برای افزایش کیفیت، می‌توانید از مدل Pro استفاده کنید.'
      };
    }

    return { result: identificationResult };
  } catch (error: any) {
    console.error('❌ [Normal Mode] خطا:', error?.message || error);
    return {
      result: null,
      suggestPro: 'خطا در شناسایی گیاه. می‌توانید از مدل Pro استفاده کنید.'
    };
  }
};

// ===================================
// حالت Pro: PlantNet + Gemini fallback (اگر confidence < 60% یا خطا)
// ===================================
const identifyPlantProMode = async (
  imagePath: string,
  mimeType: string = 'image/jpeg'
): Promise<PlantIdentificationResult | null> => {
  const startTotal = Date.now();
  console.log('🚀 [Pro Mode] شروع شناسایی حرفه‌ای...');

  try {
    // ابتدا PlantNet
    let plantnetResult: any = null;
    if (isPlantNetAvailable()) {
      plantnetResult = await identifyScientificNameWithPlantNet(imagePath, mimeType);
    }

    if (plantnetResult?.scientificName) {
      const confidence = plantnetResult.confidence ?? 0;
      console.log(`📊 [Pro Mode] PlantNet confidence: ${(confidence * 100).toFixed(1)}%`);

      // اگر confidence بالا باشد (>= 60%)، از PlantNet استفاده کن
      if (confidence >= 0.6) {
        // بررسی دیتابیس
        const cachedPlant = await findPlantInDatabase(plantnetResult.scientificName, plantnetResult.commonName);
        if (cachedPlant) {
          cachedPlant.userImageUrl = `/uploads/${path.basename(imagePath)}`;
          cachedPlant.confidence = confidence;
          console.log(`⚡ [Pro Mode] Cache HIT با PlantNet confidence بالا`);
          return cachedPlant;
        }

        // اطلاعات کامل از AI
        const prompt = createPromptFromScientificName(plantnetResult.scientificName, plantnetResult.commonName);
        const text = await generatePlantInfoContent(prompt);

        if (text) {
          let jsonStr = text;
          const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) jsonStr = jsonMatch[1].trim();
          const plantData = JSON.parse(jsonStr);

          const wikipediaImages = await downloadPlantImageFromWikipedia(
            plantData.name_en || plantData.scientificName || plantnetResult.scientificName,
            plantData.scientificName || plantnetResult.scientificName
          );

          const additionalImages: string[] = [];
          if (wikipediaImages.additionalImage) additionalImages.push(wikipediaImages.additionalImage);

          const result: PlantIdentificationResult = {
            name: plantData.name,
            name_fa: plantData.name,
            scientificName: plantData.scientificName || plantnetResult.scientificName,
            family: plantData.family,
            description: plantData.description,
            needs: plantData.needs,
            healthStatus: plantData.healthStatus,
            disease: plantData.disease,
            treatment: plantData.treatment,
            careTips: plantData.careTips,
            confidence: confidence,
            watering_interval_days: plantData.watering_interval_days || 7,
            watering_tips: plantData.watering_tips || plantData.needs?.water || '',
            light_requirement: plantData.light_requirement || 'indirect',
            light_description: plantData.light_description || plantData.needs?.light || '',
            min_temperature: plantData.min_temperature || 15,
            max_temperature: plantData.max_temperature || 28,
            ideal_temperature: plantData.ideal_temperature || 22,
            temperature_tips: plantData.temperature_tips || plantData.needs?.temperature || '',
            humidity_level: plantData.humidity_level || 'medium',
            humidity_tips: plantData.humidity_tips || plantData.needs?.humidity || '',
            fertilizer_interval_days: plantData.fertilizer_interval_days || 30,
            fertilizer_type: plantData.fertilizer_type || 'کود مایع همه‌کاره',
            fertilizer_tips: plantData.fertilizer_tips || '',
            soil_type: plantData.soil_type || 'خاک غنی و زهکش‌دار',
            soil_tips: plantData.soil_tips || '',
            difficulty_level: plantData.difficulty_level || 'medium',
            is_toxic_to_pets: plantData.is_toxic_to_pets || false,
            is_air_purifying: plantData.is_air_purifying || false,
            userImageUrl: `/uploads/${path.basename(imagePath)}`,
            wikipediaImageUrl: wikipediaImages.mainImage || null,
            additionalImages
          };

          // ذخیره در بانک (confidence بالاست)
          console.log('💾 [Pro Mode] ذخیره گیاه در بانک...');
          await savePlantToDatabase(result);

          const totalElapsed = Date.now() - startTotal;
          console.log(`✅ [Pro Mode] شناسایی با PlantNet موفق در ${totalElapsed}ms`);
          return result;
        }
      }

      // PlantNet confidence پایین (< 60%)، ادامه با Gemini
      console.log('⚠️ [Pro Mode] PlantNet confidence پایین، ادامه با Gemini...');
    } else {
      console.log('⚠️ [Pro Mode] PlantNet ناموفق، ادامه با Gemini...');
    }

    // Fallback به Gemini (شناسایی با تصویر)
    console.log('🤖 [Pro Mode] شناسایی با Gemini...');
    const geminiResult = await identifyPlantWithGemini(imagePath, mimeType);

    if (geminiResult) {
      // فقط اگر confidence >= 0.6 در بانک ذخیره کن
      if (geminiResult.confidence >= 0.6) {
        console.log('💾 [Pro Mode] ذخیره گیاه Gemini در بانک (confidence >= 60%)...');
        await savePlantToDatabase(geminiResult);
      } else {
        console.log(`⚠️ [Pro Mode] عدم ذخیره Gemini در بانک (confidence ${(geminiResult.confidence * 100).toFixed(1)}% < 60%)`);
      }
    }

    const totalElapsed = Date.now() - startTotal;
    console.log(`${geminiResult ? '✅' : '❌'} [Pro Mode] شناسایی Gemini ${geminiResult ? 'موفق' : 'ناموفق'} در ${totalElapsed}ms`);
    return geminiResult;
  } catch (error: any) {
    console.error('❌ [Pro Mode] خطا:', error?.message || error);
    // در صورت خطا هم Gemini را امتحان کن
    return await identifyPlantWithGemini(imagePath, mimeType);
  }
};

// ===================================
// POST /api/diagnosis/identify - شناسایی گیاه از فایل آپلود شده
// ===================================
router.post('/identify', optionalAuthMiddleware, upload.single('image'), async (req: Request, res: Response) => {
  const requestStart = Date.now();
  console.log('════════════════════════════════════════════════════════════');
  console.log(`🚀 [API /identify] درخواست جدید در ${new Date().toISOString()}`);
  console.log(`📋 [API /identify] typeAi: ${getAiType()} | usePlantNet: ${shouldUsePlantNet()}`);
  
  try {
    // بررسی محدودیت مصرف
    const user = (req as any).user;
    const mode = (req.body?.mode || 'normal').toLowerCase();
    if (user) {
      const action = mode === 'pro' ? 'identify_pro' : 'identify';
      const usageCheck = await checkUsageLimit(user.id, action);
      if (!usageCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: mode === 'pro'
            ? `سهمیه ${usageCheck.period} شناسایی حرفه‌ای شما تمام شده (${usageCheck.limit} از ${usageCheck.limit})`
            : `سهمیه ${usageCheck.period} شناسایی گیاه شما تمام شده (${usageCheck.limit} از ${usageCheck.limit})`,
          usageInfo: usageCheck,
          upgradeRequired: usageCheck.tier === 'free',
        });
      }
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لطفاً یک تصویر آپلود کنید'
      });
    }

    const imagePath = req.file.path;
    const mimeType = req.file.mimetype;
    const fileSize = (req.file.size / 1024).toFixed(1);
    console.log(`📂 [API /identify] فایل: ${req.file.filename} | سایز: ${fileSize} KB | نوع: ${mimeType} | حالت: ${mode}`);

    let result: PlantIdentificationResult | null = null;
    let suggestPro: string | undefined;
    let lowConfidence = false;

    if (mode === 'pro') {
      result = await identifyPlantProMode(imagePath, mimeType);
    } else {
      // حالت عادی
      const normalResult = await identifyPlantNormalMode(imagePath, mimeType);
      result = normalResult.result;
      suggestPro = normalResult.suggestPro;
      lowConfidence = normalResult.lowConfidence || false;
    }

    const totalElapsed = Date.now() - requestStart;

    if (!result) {
      console.log(`❌ [API /identify] شکست در شناسایی بعد از ${totalElapsed}ms`);
      console.log('════════════════════════════════════════════════════════════');
      return res.status(500).json({
        success: false,
        message: suggestPro || 'خطا در شناسایی گیاه. لطفاً دوباره تلاش کنید.',
        suggestPro: !!suggestPro
      });
    }

    console.log(`✅ [API /identify] موفقیت در ${totalElapsed}ms | گیاه: ${result.name} (${result.scientificName}) | حالت: ${mode} | confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log('════════════════════════════════════════════════════════════');

    // ثبت مصرف
    if (user) {
      await trackUsage(user.id, mode === 'pro' ? 'identify_pro' : 'identify');
    }

    res.json({
      success: true,
      message: 'گیاه با موفقیت شناسایی شد',
      data: result,
      lowConfidence,
      suggestPro: suggestPro || undefined
    });
  } catch (error) {
    const totalElapsed = Date.now() - requestStart;
    console.error(`❌ [API /identify] خطا بعد از ${totalElapsed}ms:`, error);
    console.log('════════════════════════════════════════════════════════════');
    res.status(500).json({
      success: false,
      message: 'خطا در شناسایی گیاه'
    });
  }
});

// ===================================
// POST /api/diagnosis/identify-base64 - شناسایی گیاه از Base64
// ===================================
router.post('/identify-base64', optionalAuthMiddleware, async (req: Request, res: Response) => {
  const requestStart = Date.now();
  console.log('════════════════════════════════════════════════════════════');
  console.log(`🚀 [API /identify-base64] درخواست جدید در ${new Date().toISOString()}`);
  console.log(`📋 [API /identify-base64] typeAi: ${getAiType()} | typeIdentify: ${getIdentifyType()} | usePlantNet: ${shouldUsePlantNet()} | useOpenRouter: ${shouldUseOpenRouter()}`);
  if (shouldUseOpenRouter()) {
    console.log(`📋 [API /identify-base64] OpenRouter Models: ${getOpenRouterModels().join(', ')}`);
  }  
  try {
    // بررسی محدودیت مصرف
    const user = (req as any).user;
    const mode = (req.body?.mode || 'normal').toLowerCase();
    if (user) {
      const action = mode === 'pro' ? 'identify_pro' : 'identify';
      const usageCheck = await checkUsageLimit(user.id, action);
      if (!usageCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: mode === 'pro' 
            ? `سهمیه ${usageCheck.period} شناسایی حرفه‌ای شما تمام شده (${usageCheck.limit} از ${usageCheck.limit})`
            : `سهمیه ${usageCheck.period} شناسایی گیاه شما تمام شده (${usageCheck.limit} از ${usageCheck.limit})`,
          usageInfo: usageCheck,
          upgradeRequired: usageCheck.tier === 'free',
        });
      }
    }

    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'لطفاً یک تصویر ارسال کنید'
      });
    }

    // ذخیره تصویر Base64 در فایل
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.jpg`;
    const imagePath = path.join(uploadsDir, filename);
    
    const imageBuffer = Buffer.from(image, 'base64');
    fs.writeFileSync(imagePath, imageBuffer);
    
    const fileSize = (imageBuffer.length / 1024).toFixed(1);
    console.log(`📂 [API /identify-base64] فایل: ${filename} | سایز: ${fileSize} KB | نوع: ${mimeType} | حالت: ${mode}`);

    let result: PlantIdentificationResult | null = null;
    let suggestPro: string | undefined;
    let lowConfidence = false;

    if (mode === 'pro') {
      result = await identifyPlantProMode(imagePath, mimeType);
    } else {
      const normalResult = await identifyPlantNormalMode(imagePath, mimeType);
      result = normalResult.result;
      suggestPro = normalResult.suggestPro;
      lowConfidence = normalResult.lowConfidence || false;
    }

    const totalElapsed = Date.now() - requestStart;

    if (!result) {
      console.log(`❌ [API /identify-base64] شکست در شناسایی بعد از ${totalElapsed}ms`);
      console.log('════════════════════════════════════════════════════════════');
      return res.status(500).json({
        success: false,
        message: suggestPro || 'خطا در شناسایی گیاه. لطفاً دوباره تلاش کنید.',
        suggestPro: !!suggestPro
      });
    }

    console.log(`✅ [API /identify-base64] موفقیت در ${totalElapsed}ms | گیاه: ${result.name} (${result.scientificName}) | حالت: ${mode} | confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log('════════════════════════════════════════════════════════════');

    // ثبت مصرف
    if (user) {
      await trackUsage(user.id, mode === 'pro' ? 'identify_pro' : 'identify');
    }

    res.json({
      success: true,
      message: 'گیاه با موفقیت شناسایی شد',
      data: result,
      lowConfidence,
      suggestPro: suggestPro || undefined
    });
  } catch (error) {
    const totalElapsed = Date.now() - requestStart;
    console.error(`❌ [API /identify-base64] خطا بعد از ${totalElapsed}ms:`, error);
    console.log('════════════════════════════════════════════════════════════');
    res.status(500).json({
      success: false,
      message: 'خطا در شناسایی گیاه'
    });
  }
});

// ===================================
// POST /api/diagnosis/disease - شناسایی بیماری از فایل آپلود شده
// ===================================
router.post('/disease', optionalAuthMiddleware, upload.single('image'), async (req: Request, res: Response) => {
  try {
    // بررسی محدودیت مصرف
    const user = (req as any).user;
    if (user) {
      const usageCheck = await checkUsageLimit(user.id, 'disease');
      if (!usageCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: `سهمیه ${usageCheck.period} تشخیص بیماری شما تمام شده`,
          usageInfo: usageCheck,
          upgradeRequired: true,
        });
      }
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لطفاً یک تصویر آپلود کنید'
      });
    }

    const imagePath = req.file.path;
    const mimeType = req.file.mimetype;

    const result = await identifyPlantWithGemini(imagePath, mimeType, createDiseasePrompt());

    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'خطا در شناسایی بیماری گیاه. لطفاً دوباره تلاش کنید.'
      });
    }

    // ثبت مصرف و مصرف اسکن خریداری شده در صورت نیاز
    if (user) {
      const currentUsage = await checkUsageLimit(user.id, 'disease');
      if (currentUsage.remaining <= 0 && currentUsage.purchasedScansRemaining && currentUsage.purchasedScansRemaining > 0) {
        await consumePurchasedScan(user.id);
      }
      await trackUsage(user.id, 'disease');
    }

    res.json({
      success: true,
      message: 'بیماری گیاه با موفقیت شناسایی شد',
      data: result
    });
  } catch (error) {
    console.error('Disease identify error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در شناسایی بیماری گیاه'
    });
  }
});

// ===================================
// POST /api/diagnosis/disease-base64 - شناسایی بیماری از Base64
// ===================================
router.post('/disease-base64', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    // بررسی محدودیت مصرف
    const user = (req as any).user;
    if (user) {
      const usageCheck = await checkUsageLimit(user.id, 'disease');
      if (!usageCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: `سهمیه ${usageCheck.period} تشخیص بیماری شما تمام شده`,
          usageInfo: usageCheck,
          upgradeRequired: true,
        });
      }
    }

    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'لطفاً یک تصویر ارسال کنید'
      });
    }

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.jpg`;
    const imagePath = path.join(uploadsDir, filename);
    
    const imageBuffer = Buffer.from(image, 'base64');
    fs.writeFileSync(imagePath, imageBuffer);

    const result = await identifyPlantWithGemini(imagePath, mimeType, createDiseasePrompt());

    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'خطا در شناسایی بیماری گیاه. لطفاً دوباره تلاش کنید.'
      });
    }

    // ثبت مصرف
    if (user) {
      const currentUsage = await checkUsageLimit(user.id, 'disease');
      if (currentUsage.remaining <= 0 && currentUsage.purchasedScansRemaining && currentUsage.purchasedScansRemaining > 0) {
        await consumePurchasedScan(user.id);
      }
      await trackUsage(user.id, 'disease');
    }

    res.json({
      success: true,
      message: 'بیماری گیاه با موفقیت شناسایی شد',
      data: result
    });
  } catch (error) {
    console.error('Disease identify base64 error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در شناسایی بیماری گیاه'
    });
  }
});

// ===================================
// POST /api/diagnosis/health-diagnosis-base64 - تشخیص تخصصی بیماری برای صفحه سلامت
// ===================================
router.post('/health-diagnosis-base64', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user) {
      const usageCheck = await checkUsageLimit(user.id, 'disease');
      if (!usageCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: `سهمیه ${usageCheck.period} تشخیص بیماری شما تمام شده`,
          usageInfo: usageCheck,
          upgradeRequired: true,
        });
      }
    }

    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'لطفاً یک تصویر ارسال کنید'
      });
    }

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.jpg`;
    const imagePath = path.join(uploadsDir, filename);
    
    const imageBuffer = Buffer.from(image, 'base64');
    fs.writeFileSync(imagePath, imageBuffer);

    const result = await identifyPlantWithGemini(imagePath, mimeType, createHealthDiagnosisPrompt());

    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'خطا در تشخیص بیماری گیاه. لطفاً دوباره تلاش کنید.'
      });
    }

    // ثبت مصرف
    if (user) {
      const currentUsage = await checkUsageLimit(user.id, 'disease');
      if (currentUsage.remaining <= 0 && currentUsage.purchasedScansRemaining && currentUsage.purchasedScansRemaining > 0) {
        await consumePurchasedScan(user.id);
      }
      await trackUsage(user.id, 'disease');
    }

    res.json({
      success: true,
      message: 'تشخیص بیماری با موفقیت انجام شد',
      data: result
    });
  } catch (error) {
    console.error('Health diagnosis base64 error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تشخیص بیماری گیاه'
    });
  }
});

// ===================================
// POST /api/diagnosis/add-to-garden - افزودن گیاه شناسایی شده به باغچه
// ===================================
router.post('/add-to-garden', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { plantData, gardenId } = req.body;

    if (!plantData || !gardenId) {
      return res.status(400).json({
        success: false,
        message: 'اطلاعات گیاه و شناسه باغچه الزامی است'
      });
    }

    // بررسی محدودیت تعداد گیاه
    const { getUserTier: getTier, getUserPlantCount: getPlantCount, PLAN_LIMITS: planLimits } = require('./subscription');
    const tier = await getTier(user.id);
    const limits = planLimits[tier];
    const currentCount = await getPlantCount(user.id);
    if (currentCount >= limits.max_plants) {
      return res.status(403).json({
        success: false,
        message: `شما به حداکثر تعداد گیاه (${limits.max_plants} گیاه) رسیده‌اید. ${tier === 'free' ? 'برای افزودن گیاه بیشتر، اشتراک تهیه کنید.' : ''}`,
        upgradeRequired: tier === 'free',
      });
    }

    // اطمینان از وجود ستون تصویر سفارشی کاربر
    await query(`
      ALTER TABLE user_plants
      ADD COLUMN IF NOT EXISTS custom_image_url TEXT
    `);

    // ابتدا گیاه را در جدول plants ذخیره می‌کنیم (اگر وجود نداشت)
    // جستجو بر اساس نام علمی
    const existingPlant = await query(
      'SELECT id FROM plants WHERE scientific_name = $1 OR name_fa = $2',
      [plantData.scientificName, plantData.name_fa]
    );

    let plantId: number;

    if (existingPlant.rows.length > 0) {
      plantId = existingPlant.rows[0].id;
    } else {
      // انتخاب تصویر اصلی: اگر تصویر Wikipedia موجود بود از آن استفاده کن، در غیر این صورت از تصویر کاربر
      const mainImageUrl = plantData.wikipediaImageUrl || plantData.userImageUrl;
      
      // ایجاد گیاه جدید در کاتالوگ
      const newPlant = await query(`
        INSERT INTO plants (
          name, name_fa, scientific_name, description_fa,
          main_image_url, watering_interval_days, watering_tips,
          light_requirement, light_description,
          min_temperature, max_temperature, ideal_temperature, temperature_tips,
          humidity_level, humidity_tips,
          fertilizer_interval_days, fertilizer_type, fertilizer_tips,
          difficulty_level, is_toxic_to_pets, is_air_purifying
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id
      `, [
        plantData.name_fa, // name
        plantData.name_fa, // name_fa
        plantData.scientificName,
        plantData.description,
        mainImageUrl,  // استفاده از تصویر Wikipedia یا تصویر کاربر
        plantData.watering_interval_days,
        plantData.watering_tips,
        plantData.light_requirement,
        plantData.light_description,
        plantData.min_temperature,
        plantData.max_temperature,
        plantData.ideal_temperature,
        plantData.temperature_tips,
        plantData.humidity_level,
        plantData.humidity_tips,
        plantData.fertilizer_interval_days,
        plantData.fertilizer_type,
        plantData.fertilizer_tips,
        plantData.difficulty_level,
        plantData.is_toxic_to_pets,
        plantData.is_air_purifying
      ]);

      plantId = newPlant.rows[0].id;

      // ذخیره تصاویر اضافی در جدول plant_images
      if (plantData.additionalImages && Array.isArray(plantData.additionalImages)) {
        for (const imgUrl of plantData.additionalImages) {
          // تبدیل مسیر موقت به مسیر دائمی (چون فایل قبلاً در هر دو مسیر ذخیره شده است)
          // مسیر ورودی مثلاً: /uploads/identified/filename.jpg
          // مسیر خروجی: /storage/plant/filename.jpg
          const permanentUrl = imgUrl.replace('/uploads/identified/', '/storage/plant/');
          
          await query(
            'INSERT INTO plant_images (plant_id, image_url, is_main) VALUES ($1, $2, $3)',
            [plantId, permanentUrl, false]
          );
        }
      }
    }

    // حالا گیاه را به باغچه کاربر اضافه می‌کنیم
    const wateringInterval = plantData.watering_interval_days || 7;
    const fertilizerInterval = plantData.fertilizer_interval_days || 30;
    
    const now = new Date();
    const nextWatering = new Date(now.getTime() + wateringInterval * 24 * 60 * 60 * 1000);
    const nextFertilizing = new Date(now.getTime() + fertilizerInterval * 24 * 60 * 60 * 1000);

    const userPlant = await query(`
      INSERT INTO user_plants (
        user_id, garden_id, plant_id,
        custom_image_url,
        last_watered_at, next_watering_at,
        last_fertilized_at, next_fertilizing_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      user.id,
      gardenId,
      plantId,
      plantData.userImageUrl || null,
      now,
      nextWatering,
      now,
      nextFertilizing
    ]);

    res.json({
      success: true,
      message: 'گیاه با موفقیت به باغچه شما اضافه شد',
      plant: userPlant.rows[0]
    });
  } catch (error) {
    console.error('Add to garden error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در افزودن گیاه به باغچه'
    });
  }
});

// ===================================
// GET /api/diagnosis/stats - آمار استفاده از کلیدها
// ===================================
router.get('/stats', async (req: Request, res: Response) => {
  const keys = getGeminiApiKeys();
  const maskedKeys = keys.map((k, i) => ({
    index: i + 1,
    masked: k.substring(0, 8) + '...' + k.substring(k.length - 4)
  }));
  
  const plantNetBackoffRemaining = plantNetBackoffUntil > Date.now() 
    ? Math.ceil((plantNetBackoffUntil - Date.now()) / 1000)
    : 0;
  
  res.json({
    success: true,
    data: {
      totalGeminiKeys: keys.length,
      geminiKeys: maskedKeys,
      geminiUsageStats: geminiKeyUsageStats,
      aiType: getAiType(),
      identifyType: getIdentifyType(),
      usePlantNet: shouldUsePlantNet(),
      useOpenRouter: shouldUseOpenRouter(),
      openRouterModels: getOpenRouterModels(),
      plantNetAvailable: isPlantNetAvailable(),
      plantNetBackoff: {
        active: !isPlantNetAvailable(),
        remainingSeconds: plantNetBackoffRemaining,
        reason: plantNetBackoffReason
      }
    }
  });
});

// ===================================
// POST /api/diagnosis/reset-plantnet - ریست کردن backoff PlantNet
// ===================================
router.post('/reset-plantnet', async (req: Request, res: Response) => {
  const wasBacked = !isPlantNetAvailable();
  clearPlantNetBackoff();
  
  res.json({
    success: true,
    message: wasBacked ? 'PlantNet backoff پاک شد' : 'PlantNet در حال حاضر backoff نداشت',
    plantNetAvailable: isPlantNetAvailable()
  });
});

export default router;
