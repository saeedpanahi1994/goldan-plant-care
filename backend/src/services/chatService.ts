import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export const askPlantExpert = async (
  plantName: string,
  question: string,
  context?: any
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contextStr = context 
      ? `اطلاعات گیاه: ${JSON.stringify(context, null, 2)}` 
      : `درباره گیاه: ${plantName}`;

    const prompt = `
    شما یک متخصص گیاه‌شناسی هوشمند و دستیار اپلیکیشن "گلدان" هستید.
    کاربر سوالی درباره گیاه "${plantName}" دارد.
    
    ${contextStr}
    
    سوال کاربر: ${question}
    
    لطفاً پاسخی دقیق، علمی، کاربردی و به زبان فارسی و صمیمی بدهید.
    از Emoji مرتبط استفاده کنید.
    حداکثر در 4-5 خط پاسخ دهید مگراینکه نیاز به توضیحات بیشتر باشد.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw new Error("خطا در دریافت پاسخ از هوش مصنوعی");
  }
};
