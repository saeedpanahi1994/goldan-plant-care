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

// تابع دانلود تصویر از Wikipedia و ذخیره در چند مسیر
const downloadPlantImageFromWikipedia = async (plantName: string, scientificName: string): Promise<{ mainImage: string | null; additionalImage: string | null }> => {
  try {
    console.log('🔍 جستجوی تصویر در Wikipedia...');
    
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
    return { mainImage: null, additionalImage: null };
    
  } catch (error: any) {
    console.log('⚠️ خطا در دانلود از Wikipedia:', error.message);
    return { mainImage: null, additionalImage: null };
  }
};

// تابع شناسایی گیاه با Gemini
const identifyPlantWithGemini = async (
  imagePath: string,
  mimeType: string = 'image/jpeg',
  promptOverride?: string
): Promise<PlantIdentificationResult | null> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // خواندن تصویر
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const prompt = promptOverride || createPrompt();
    
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

export default router;
