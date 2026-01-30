import axios from 'axios';

const SMSIR_API_URL = 'https://api.sms.ir/v1/send/verify';
const SMSIR_API_KEY = process.env.SMSIR_API_KEY;
const SMSIR_TEMPLATE_ID = process.env.SMSIR_TEMPLATE_ID;

export interface SendSmsResponse {
  success: boolean;
  messageId?: number;
  cost?: number;
  error?: string;
}

/**
 * ارسال کد تایید از طریق SMS.ir
 * @param mobile شماره موبایل (با کد کشور 98)
 * @param code کد تایید 6 رقمی
 */
export const sendVerificationCode = async (mobile: string, code: string): Promise<SendSmsResponse> => {
  try {
    // اطمینان از فرمت صحیح شماره موبایل
    let formattedMobile = mobile.replace(/^0/, '98'); // حذف 0 ابتدایی و افزودن کد کشور
    if (!formattedMobile.startsWith('98')) {
      formattedMobile = '98' + formattedMobile;
    }

    console.log(`📱 ارسال SMS به ${formattedMobile} با کد: ${code}`);

    const requestData = {
      mobile: formattedMobile,
      templateId: parseInt(SMSIR_TEMPLATE_ID || '123456'),
      parameters: [
        {
          name: 'Code',
          value: code
        }
      ]
    };

    const response = await axios.post(SMSIR_API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-KEY': SMSIR_API_KEY
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.data.status === 1) {
      console.log(`✅ SMS با موفقیت ارسال شد - MessageId: ${response.data.data.messageId}`);
      return {
        success: true,
        messageId: response.data.data.messageId,
        cost: response.data.data.cost
      };
    } else {
      console.error(`❌ خطا در ارسال SMS: ${response.data.message}`);
      return {
        success: false,
        error: response.data.message
      };
    }

  } catch (error: any) {
    console.error('❌ خطا در ارسال SMS:', error.response?.data || error.message);
    
    // در محیط development، کد را در کنسول نمایش بده
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [DEV MODE] کد تایید برای ${mobile}: ${code}`);
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'خطای ناشناخته در ارسال SMS'
    };
  }
};

/**
 * اعتبارسنجی شماره موبایل ایرانی
 */
export const isValidIranianMobile = (mobile: string): boolean => {
  // حذف فاصله‌ها و کاراکترهای غیرضروری
  const cleaned = mobile.replace(/\s+/g, '');
  
  // فرمت‌های معتبر:
  // 09123456789
  // 9123456789
  // 989123456789
  const patterns = [
    /^09\d{9}$/,           // 09123456789
    /^9\d{9}$/,            // 9123456789
    /^989\d{9}$/           // 989123456789
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
};

/**
 * نرمال‌سازی شماره موبایل به فرمت 09xxxxxxxxx
 */
export const normalizeMobileNumber = (mobile: string): string => {
  let cleaned = mobile.replace(/\s+/g, '');
  
  // حذف کد کشور
  if (cleaned.startsWith('98')) {
    cleaned = cleaned.substring(2);
  }
  
  // اضافه کردن 0 در ابتدا
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
};

/**
 * چک کردن اعتبار و وضعیت حساب SMS.ir
 */
export const checkAccountCredit = async (): Promise<{ success: boolean; credit?: number; error?: string }> => {
  try {
    const response = await axios.get('https://api.sms.ir/v1/credit', {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': SMSIR_API_KEY
      },
      timeout: 10000
    });

    if (response.data.status === 1) {
      return {
        success: true,
        credit: response.data.data
      };
    } else {
      return {
        success: false,
        error: response.data.message
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'خطا در دریافت اعتبار'
    };
  }
};

export default {
  sendVerificationCode,
  isValidIranianMobile,
  normalizeMobileNumber,
  checkAccountCredit
};
