import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// بارگذاری متغیرهای محیطی
dotenv.config();

// بارگذاری API Key از متغیرهای محیطی
const API_KEY = process.env.GEMINI_API_KEY || "";

if (!API_KEY) {
  console.error("⚠️ GEMINI_API_KEY در فایل .env تنظیم نشده است!");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// اینترفیس برای نتیجه شناسایی گیاه
export interface PlantIdentificationResult {
  name: string;
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
}

// تابع شناسایی گیاه از تصویر
export const identifyPlantFromImage = async (
  imagePath: string
): Promise<PlantIdentificationResult> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // خواندن فایل تصویر و تبدیل به Base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    // تشخیص نوع MIME بر اساس پسوند فایل
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = "image/jpeg";
    if (ext === ".png") mimeType = "image/png";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".gif") mimeType = "image/gif";

    const prompt = `
    تو یک متخصص گیاه‌شناس و کشاورز حرفه‌ای هستی. لطفاً این تصویر گیاه را با دقت بررسی کن.
    
    خروجی را دقیقاً با فرمت JSON زیر بده (بدون هیچ توضیح اضافه، فقط JSON خالص):
    {
      "name": "نام فارسی گیاه",
      "scientificName": "نام علمی لاتین گیاه",
      "family": "خانواده گیاهی",
      "description": "توضیح کوتاه درباره این گیاه (حداکثر 2 جمله)",
      "needs": {
        "light": "میزان نور مورد نیاز (مثل: نور غیرمستقیم، نور مستقیم، نیمه‌سایه)",
        "water": "برنامه آبیاری (مثل: هفته‌ای 2 بار، وقتی خاک خشک شد)",
        "temperature": "دمای مناسب (مثل: 18-25 درجه سانتی‌گراد)",
        "humidity": "رطوبت مورد نیاز (مثل: رطوبت متوسط، رطوبت بالا)"
      },
      "healthStatus": "وضعیت سلامت گیاه در تصویر (سالم / نیاز به مراقبت / بیمار)",
      "disease": "نام بیماری یا مشکل اگر وجود دارد، در غیر این صورت بنویس: ندارد",
      "treatment": "راه درمان یا بهبود اگر مشکلی وجود دارد، در غیر این صورت بنویس: نیاز ندارد",
      "careTips": ["نکته مراقبتی 1", "نکته مراقبتی 2", "نکته مراقبتی 3"],
      "confidence": 0.95
    }
    
    نکات مهم:
    - confidence باید عددی بین 0 تا 1 باشد که نشان‌دهنده میزان اطمینان تو از شناسایی است
    - همه متن‌ها به فارسی باشند به جز scientificName که لاتین است
    - اگر گیاه قابل شناسایی نیست، در name بنویس "گیاه ناشناخته" و confidence را کمتر از 0.5 بگذار
    `;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // پاکسازی متن و استخراج JSON
    let jsonStr = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // حذف هر چیزی قبل از { و بعد از }
    const startIndex = jsonStr.indexOf("{");
    const endIndex = jsonStr.lastIndexOf("}");
    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = jsonStr.substring(startIndex, endIndex + 1);
    }

    const plantData = JSON.parse(jsonStr) as PlantIdentificationResult;

    return plantData;
  } catch (error) {
    console.error("خطا در شناسایی گیاه با Gemini:", error);
    throw new Error("خطا در پردازش تصویر با هوش مصنوعی");
  }
};

// تابع شناسایی گیاه از Base64
export const identifyPlantFromBase64 = async (
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<PlantIdentificationResult> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // حذف هدر data URL اگر وجود داشته باشد
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
    تو یک متخصص گیاه‌شناس و کشاورز حرفه‌ای هستی. لطفاً این تصویر گیاه را با دقت بررسی کن.
    
    خروجی را دقیقاً با فرمت JSON زیر بده (بدون هیچ توضیح اضافه، فقط JSON خالص):
    {
      "name": "نام فارسی گیاه",
      "scientificName": "نام علمی لاتین گیاه",
      "family": "خانواده گیاهی",
      "description": "توضیح کوتاه درباره این گیاه (حداکثر 2 جمله)",
      "needs": {
        "light": "میزان نور مورد نیاز (مثل: نور غیرمستقیم، نور مستقیم، نیمه‌سایه)",
        "water": "برنامه آبیاری (مثل: هفته‌ای 2 بار، وقتی خاک خشک شد)",
        "temperature": "دمای مناسب (مثل: 18-25 درجه سانتی‌گراد)",
        "humidity": "رطوبت مورد نیاز (مثل: رطوبت متوسط، رطوبت بالا)"
      },
      "healthStatus": "وضعیت سلامت گیاه در تصویر (سالم / نیاز به مراقبت / بیمار)",
      "disease": "نام بیماری یا مشکل اگر وجود دارد، در غیر این صورت بنویس: ندارد",
      "treatment": "راه درمان یا بهبود اگر مشکلی وجود دارد، در غیر این صورت بنویس: نیاز ندارد",
      "careTips": ["نکته مراقبتی 1", "نکته مراقبتی 2", "نکته مراقبتی 3"],
      "confidence": 0.95
    }
    
    نکات مهم:
    - confidence باید عددی بین 0 تا 1 باشد که نشان‌دهنده میزان اطمینان تو از شناسایی است
    - همه متن‌ها به فارسی باشند به جز scientificName که لاتین است
    - اگر گیاه قابل شناسایی نیست، در name بنویس "گیاه ناشناخته" و confidence را کمتر از 0.5 بگذار
    `;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // پاکسازی متن و استخراج JSON
    let jsonStr = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // حذف هر چیزی قبل از { و بعد از }
    const startIndex = jsonStr.indexOf("{");
    const endIndex = jsonStr.lastIndexOf("}");
    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = jsonStr.substring(startIndex, endIndex + 1);
    }

    const plantData = JSON.parse(jsonStr) as PlantIdentificationResult;

    return plantData;
  } catch (error) {
    console.error("خطا در شناسایی گیاه با Gemini:", error);
    throw new Error("خطا در پردازش تصویر با هوش مصنوعی");
  }
};
