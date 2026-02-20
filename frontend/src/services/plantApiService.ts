// آدرس سرور بکند
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://130.185.76.46:4380';

// اینترفیس برای نتیجه شناسایی گیاه
export interface PlantIdentificationResult {
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}

// تابع شناسایی گیاه از تصویر Base64
export const identifyPlantFromBase64 = async (
  base64Image: string,
  mimeType: string = 'image/jpeg',
  mode: 'normal' | 'pro' = 'normal'
): Promise<ApiResponse<PlantIdentificationResult>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/diagnosis/identify-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType,
        mode: mode,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('خطا در ارسال تصویر به سرور:', error);
    return {
      success: false,
      message: 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
    };
  }
};

// تابع شناسایی گیاه از فایل
export const identifyPlantFromFile = async (
  file: File,
  mode: 'normal' | 'pro' = 'normal'
): Promise<ApiResponse<PlantIdentificationResult>> => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('mode', mode);

    const response = await fetch(`${API_BASE_URL}/api/diagnosis/identify`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('خطا در ارسال تصویر به سرور:', error);
    return {
      success: false,
      message: 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
    };
  }
};

// تابع تشخیص تخصصی بیماری برای صفحه سلامت (پاسخ متمرکز بر بیماری و درمان)
export const diagnoseHealthFromBase64 = async (
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<ApiResponse<any>> => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/api/diagnosis/health-diagnosis-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('خطا در تشخیص بیماری:', error);
    return {
      success: false,
      message: 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
    };
  }
};

// تابع شناسایی بیماری گیاه از تصویر Base64
export const identifyDiseaseFromBase64 = async (
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<ApiResponse<PlantIdentificationResult>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/diagnosis/disease-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('خطا در ارسال تصویر به سرور:', error);
    return {
      success: false,
      message: 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
    };
  }
};

// تابع شناسایی بیماری گیاه از فایل
export const identifyDiseaseFromFile = async (
  file: File
): Promise<ApiResponse<PlantIdentificationResult>> => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/api/diagnosis/disease`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('خطا در ارسال تصویر به سرور:', error);
    return {
      success: false,
      message: 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
    };
  }
};

// تابع تبدیل فایل به Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // حذف پیشوند data:image/...;base64,
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// تابع افزودن گیاه شناسایی شده به باغچه
export const addIdentifiedPlantToGarden = async (
  plantData: PlantIdentificationResult,
  gardenId: number,
  token: string
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/diagnosis/add-to-garden`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        plantData,
        gardenId
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('خطا در افزودن گیاه به باغچه:', error);
    return {
      success: false,
      message: 'خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.'
    };
  }
};

// تابع دریافت باغچه پیش‌فرض کاربر
export const getDefaultGarden = async (token: string): Promise<ApiResponse<{ id: number; name: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gardens/default`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        data: result.garden,
        message: 'باغچه یافت شد'
      };
    }
    return result;
  } catch (error) {
    console.error('خطا در دریافت باغچه:', error);
    return {
      success: false,
      message: 'خطا در اتصال به سرور.'
    };
  }
};
