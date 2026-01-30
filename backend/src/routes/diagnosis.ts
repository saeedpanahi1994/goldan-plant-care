import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { authMiddleware } from './auth';
import { query } from '../config/database';

const router = Router();

// تنظیمات Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ایجاد فولدر uploads اگر وجود نداشت
const uploadsDir = path.join(__dirname, '../../uploads');
const identifiedImagesDir = path.join(__dirname, '../../uploads/identified');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(identifiedImagesDir)) {
  fs.mkdirSync(identifiedImagesDir, { recursive: true });
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
  light_requirement: string;
  min_temperature: number;
  max_temperature: number;
  humidity_level: string;
  fertilizer_interval_days: number;
  difficulty_level: string;
  is_toxic_to_pets: boolean;
  is_air_purifying: boolean;
  // تصاویر
  userImageUrl: string;
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
  "light_requirement": "indirect",
  "min_temperature": 15,
  "max_temperature": 28,
  "humidity_level": "medium",
  "fertilizer_interval_days": 30,
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
`;

// تابع دانلود تصاویر از Google (اختیاری - در صورت خطا از تصویر کاربر استفاده می‌شود)
const downloadPlantImages = async (plantName: string, plantNameEn: string): Promise<string[]> => {
  const downloadedImages: string[] = [];
  
  const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleCx = process.env.GOOGLE_SEARCH_CX;
  
  // اگر API key موجود نیست، مستقیم خالی برگردان
  if (!googleApiKey || !googleCx) {
    console.log('⚠️ Google Search API تنظیم نشده - فقط از تصویر کاربر استفاده می‌شود');
    return [];
  }
  
  try {
    console.log('🔍 جستجوی تصاویر با Google Custom Search...');
    
    // جستجوی تصویر با نام انگلیسی گیاه
    const searchQuery = `${plantNameEn} plant`;
    const googleSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(searchQuery)}&searchType=image&num=3&imgSize=medium&safe=active`;
    
    const searchResponse = await axios.get(googleSearchUrl, { timeout: 10000 });
    
    if (searchResponse.data?.items && searchResponse.data.items.length > 0) {
      // دانلود 2 تصویر اول
      for (let i = 0; i < Math.min(2, searchResponse.data.items.length); i++) {
        const item = searchResponse.data.items[i];
        const imageUrl = item.link;
        
        try {
          console.log(`📥 دانلود تصویر ${i + 1}...`);
          
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (imageResponse.status === 200 && imageResponse.data) {
            const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
            const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
            
            const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
            const filepath = path.join(identifiedImagesDir, filename);
            
            fs.writeFileSync(filepath, imageResponse.data);
            downloadedImages.push(`/uploads/identified/${filename}`);
            console.log(`✅ تصویر ${i + 1} ذخیره شد`);
          }
        } catch (downloadErr: any) {
          console.log(`⚠️ خطا در دانلود تصویر ${i + 1} - ادامه بدون این تصویر`);
        }
      }
    }
    
    console.log(`📸 تعداد تصاویر دانلود شده: ${downloadedImages.length}`);
    
  } catch (error: any) {
    // در صورت هر خطایی، فقط لاگ کن و آرایه خالی برگردان
    console.log('⚠️ Google Search در دسترس نیست - فقط از تصویر کاربر استفاده می‌شود');
  }
  
  return downloadedImages;
};

// تابع شناسایی گیاه با Gemini
const identifyPlantWithGemini = async (
  imagePath: string,
  mimeType: string = 'image/jpeg'
): Promise<PlantIdentificationResult | null> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // خواندن تصویر
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const prompt = createPrompt();
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      }
    ]);
    
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
    
    // دانلود تصاویر اضافی از اینترنت
    const additionalImages = await downloadPlantImages(
      plantData.name, 
      plantData.name_en || plantData.scientificName
    );
    
    // ساخت URL تصویر کاربر
    const userImageUrl = `/uploads/${path.basename(imagePath)}`;
    
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
      light_requirement: plantData.light_requirement || 'indirect',
      min_temperature: plantData.min_temperature || 15,
      max_temperature: plantData.max_temperature || 28,
      humidity_level: plantData.humidity_level || 'medium',
      fertilizer_interval_days: plantData.fertilizer_interval_days || 30,
      difficulty_level: plantData.difficulty_level || 'medium',
      is_toxic_to_pets: plantData.is_toxic_to_pets || false,
      is_air_purifying: plantData.is_air_purifying || false,
      userImageUrl,
      additionalImages
    };
  } catch (error) {
    console.error('خطا در شناسایی گیاه با Gemini:', error);
    return null;
  }
};

// ===================================
// POST /api/diagnosis/identify - شناسایی گیاه از فایل آپلود شده
// ===================================
router.post('/identify', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لطفاً یک تصویر آپلود کنید'
      });
    }

    const imagePath = req.file.path;
    const mimeType = req.file.mimetype;

    const result = await identifyPlantWithGemini(imagePath, mimeType);

    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'خطا در شناسایی گیاه. لطفاً دوباره تلاش کنید.'
      });
    }

    res.json({
      success: true,
      message: 'گیاه با موفقیت شناسایی شد',
      data: result
    });
  } catch (error) {
    console.error('Identify error:', error);
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

    const result = await identifyPlantWithGemini(imagePath, mimeType);

    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'خطا در شناسایی گیاه. لطفاً دوباره تلاش کنید.'
      });
    }

    res.json({
      success: true,
      message: 'گیاه با موفقیت شناسایی شد',
      data: result
    });
  } catch (error) {
    console.error('Identify base64 error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در شناسایی گیاه'
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
      // ایجاد گیاه جدید در کاتالوگ
      const newPlant = await query(`
        INSERT INTO plants (
          name, name_fa, scientific_name, description_fa,
          main_image_url, watering_interval_days,
          light_requirement, min_temperature, max_temperature,
          humidity_level, fertilizer_interval_days,
          difficulty_level, is_toxic_to_pets, is_air_purifying
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        plantData.name_fa, // name
        plantData.name_fa, // name_fa
        plantData.scientificName,
        plantData.description,
        plantData.userImageUrl,
        plantData.watering_interval_days,
        plantData.light_requirement,
        plantData.min_temperature,
        plantData.max_temperature,
        plantData.humidity_level,
        plantData.fertilizer_interval_days,
        plantData.difficulty_level,
        plantData.is_toxic_to_pets,
        plantData.is_air_purifying
      ]);

      plantId = newPlant.rows[0].id;
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
        last_watered_at, next_watering_at,
        last_fertilized_at, next_fertilizing_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      user.id,
      gardenId,
      plantId,
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

export default router;
