import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  console.log('📋 لیست مدل‌های موجود Gemini:\n');
  
  try {
    // لیست تمام مدل‌ها
    const models = await genAI.listModels();
    
    models.forEach((model: any) => {
      console.log(`\n✅ ${model.name}`);
      console.log(`   نام نمایشی: ${model.displayName}`);
      console.log(`   توضیحات: ${model.description}`);
      if (model.supportedGenerationMethods) {
        console.log(`   متدهای پشتیبانی شده: ${model.supportedGenerationMethods.join(', ')}`);
      }
    });
  } catch (error) {
    console.error('❌ خطا در دریافت لیست مدل‌ها:', error);
  }
}

listModels();
