import { Router } from 'express';
import multer from 'multer';

const router = Router();

// تنظیم multer برای آپلود فایل
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های تصویری مجاز هستند'));
    }
  }
});

// POST /api/diagnosis/identify - تشخیص نوع گیاه از تصویر
router.post('/identify', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'تصویر الزامی است'
      });
    }

    // در آینده تصویر به مدل AI ارسال و تحلیل خواهد شد
    // فعلاً نتیجه نمونه برمی‌گرداند
    
    const mockResult = {
      plantId: '1',
      name: 'گل رز',
      scientificName: 'Rosa',
      confidence: 0.95,
      careInstructions: 'نیاز به نور زیاد و آبیاری منظم دارد',
      wateringFrequency: 2,
      lightRequirements: 'نور مستقیم آفتاب',
      description: 'گل رز یکی از محبوب‌ترین گل‌های زینتی است که به دلیل زیبایی و عطر خوش خود شناخته شده است.'
    };

    res.json({
      success: true,
      data: mockResult,
      message: 'گیاه با موفقیت شناسایی شد'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در تشخیص گیاه'
    });
  }
});

// POST /api/diagnosis/disease - تشخیص بیماری گیاه
router.post('/disease', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'تصویر الزامی است'
      });
    }

    // در آینده تصویر به مدل AI برای تشخیص بیماری ارسال خواهد شد
    // فعلاً نتیجه نمونه برمی‌گرداند
    
    const mockDiseaseResult = {
      diseaseDetected: true,
      diseaseName: 'قارچ برگ',
      severity: 'متوسط',
      confidence: 0.87,
      description: 'عفونت قارچی که معمولاً به دلیل رطوبت زیاد ایجاد می‌شود',
      treatment: [
        'استفاده از قارچ‌کش مناسب',
        'کاهش آبیاری',
        'بهبود تهویه اطراف گیاه',
        'حذف برگ‌های آلوده'
      ],
      prevention: [
        'آبیاری از پایه گیاه',
        'جلوگیری از خیس شدن برگ‌ها',
        'تأمین تهویه مناسب'
      ]
    };

    res.json({
      success: true,
      data: mockDiseaseResult,
      message: 'تحلیل بیماری گیاه انجام شد'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در تشخیص بیماری'
    });
  }
});

// POST /api/diagnosis/light - سنجش نور محیط
router.post('/light', (req, res) => {
  try {
    const { lightLevel } = req.body;
    
    if (lightLevel === undefined) {
      return res.status(400).json({
        success: false,
        message: 'مقدار نور الزامی است'
      });
    }

    // تحلیل میزان نور و ارائه توصیه
    let analysis;
    
    if (lightLevel < 100) {
      analysis = {
        level: 'کم',
        status: 'نامناسب',
        recommendation: 'گیاه به نور بیشتری نیاز دارد. آن را به مکان روشن‌تری منتقل کنید.',
        suitablePlants: ['پوتوس', 'فیکوس', 'زاموکولاس']
      };
    } else if (lightLevel < 500) {
      analysis = {
        level: 'متوسط',
        status: 'مناسب',
        recommendation: 'میزان نور برای اکثر گیاهان آپارتمانی مناسب است.',
        suitablePlants: ['مونسترا', 'فیلودندرون', 'اسپاتی‌فیلوم']
      };
    } else {
      analysis = {
        level: 'زیاد',
        status: 'عالی',
        recommendation: 'نور بسیار خوب برای گیاهان آفتاب‌دوست.',
        suitablePlants: ['کاکتوس', 'ساکولنت', 'گل رز']
      };
    }

    res.json({
      success: true,
      data: {
        lightLevel,
        unit: 'لوکس',
        analysis,
        measuredAt: new Date().toISOString()
      },
      message: 'سنجش نور محیط انجام شد'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در سنجش نور'
    });
  }
});

export default router;