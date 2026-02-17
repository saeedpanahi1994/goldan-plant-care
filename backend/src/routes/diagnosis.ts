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
      'X-Title': 'Goldan Plant Care App'
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

  // Resize تصویر برای کاهش حجم و افزایش سرعت
  const resizedImagePath = imagePath.replace(/(\.\w+)$/, '-resized$1');
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
    console.log(`✅ [PlantNet] تصویر resize شد در ${resizeElapsed}ms: ${path.basename(imagePath)}`);
  } catch (resizeError) {
    const resizeElapsed = Date.now() - startResize;
    console.error(`⚠️ [PlantNet] خطا در resize تصویر بعد از ${resizeElapsed}ms، از اصلی استفاده می‌شود:`, resizeError);
    // اگر resize نشد، از تصویر اصلی استفاده کن
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
    
    const prompt = promptOverride || createPrompt();

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
    
    return {
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

    return {
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
// POST /api/diagnosis/identify - شناسایی گیاه از فایل آپلود شده
// ===================================
router.post('/identify', upload.single('image'), async (req: Request, res: Response) => {
  const requestStart = Date.now();
  console.log('════════════════════════════════════════════════════════════');
  console.log(`🚀 [API /identify] درخواست جدید در ${new Date().toISOString()}`);
  console.log(`📋 [API /identify] typeAi: ${getAiType()} | usePlantNet: ${shouldUsePlantNet()}`);
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لطفاً یک تصویر آپلود کنید'
      });
    }

    const imagePath = req.file.path;
    const mimeType = req.file.mimetype;
    const fileSize = (req.file.size / 1024).toFixed(1);
    console.log(`📂 [API /identify] فایل: ${req.file.filename} | سایز: ${fileSize} KB | نوع: ${mimeType}`);

    const result = shouldUsePlantNet()
      ? await identifyPlantWithPlantNetAndGemini(imagePath, mimeType)
      : await identifyPlantWithGemini(imagePath, mimeType);

    const totalElapsed = Date.now() - requestStart;

    if (!result) {
      console.log(`❌ [API /identify] شکست در شناسایی بعد از ${totalElapsed}ms`);
      console.log('════════════════════════════════════════════════════════════');
      return res.status(500).json({
        success: false,
        message: 'خطا در شناسایی گیاه. لطفاً دوباره تلاش کنید.'
      });
    }

    console.log(`✅ [API /identify] موفقیت در ${totalElapsed}ms | گیاه: ${result.name} (${result.scientificName})`);
    console.log('════════════════════════════════════════════════════════════');

    res.json({
      success: true,
      message: 'گیاه با موفقیت شناسایی شد',
      data: result
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
router.post('/identify-base64', async (req: Request, res: Response) => {
  const requestStart = Date.now();
  console.log('════════════════════════════════════════════════════════════');
  console.log(`🚀 [API /identify-base64] درخواست جدید در ${new Date().toISOString()}`);
  console.log(`📋 [API /identify-base64] typeAi: ${getAiType()} | typeIdentify: ${getIdentifyType()} | usePlantNet: ${shouldUsePlantNet()} | useOpenRouter: ${shouldUseOpenRouter()}`);
  if (shouldUseOpenRouter()) {
    console.log(`📋 [API /identify-base64] OpenRouter Models: ${getOpenRouterModels().join(', ')}`);
  }  
  try {
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
    console.log(`📂 [API /identify-base64] فایل: ${filename} | سایز: ${fileSize} KB | نوع: ${mimeType}`);

    const result = shouldUsePlantNet()
      ? await identifyPlantWithPlantNetAndGemini(imagePath, mimeType)
      : await identifyPlantWithGemini(imagePath, mimeType);

    const totalElapsed = Date.now() - requestStart;

    if (!result) {
      console.log(`❌ [API /identify-base64] شکست در شناسایی بعد از ${totalElapsed}ms`);
      console.log('════════════════════════════════════════════════════════════');
      return res.status(500).json({
        success: false,
        message: 'خطا در شناسایی گیاه. لطفاً دوباره تلاش کنید.'
      });
    }

    console.log(`✅ [API /identify-base64] موفقیت در ${totalElapsed}ms | گیاه: ${result.name} (${result.scientificName})`);
    console.log('════════════════════════════════════════════════════════════');

    res.json({
      success: true,
      message: 'گیاه با موفقیت شناسایی شد',
      data: result
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
router.post('/disease', upload.single('image'), async (req: Request, res: Response) => {
  try {
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
router.post('/disease-base64', async (req: Request, res: Response) => {
  try {
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
