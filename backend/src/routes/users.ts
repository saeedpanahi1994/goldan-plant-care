import { Router } from 'express';

const router = Router();

// GET /api/users/profile - دریافت پروفایل کاربر
router.get('/profile', (req, res) => {
  try {
    // در حال حاضر داده‌های نمونه برمی‌گرداند
    const userProfile = {
      id: '1',
      username: 'gol_dan_user',
      fullName: 'کاربر گل دان',
      email: 'user@goldan.app',
      phone: '+98912XXXXXXX',
      location: 'تهران',
      plantsCount: 0,
      joinDate: new Date().toISOString(),
      avatar: null
    };

    res.json({
      success: true,
      data: userProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت اطلاعات کاربر'
    });
  }
});

// GET /api/users/plants - دریافت گیاهان کاربر
router.get('/plants', (req, res) => {
  try {
    // در حال حاضر آرایه خالی برمی‌گرداند - در آینده از پایگاه داده دریافت خواهد شد
    const userPlants: any[] = [];
    
    res.json({
      success: true,
      data: userPlants,
      count: userPlants.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت گیاهان کاربر'
    });
  }
});

// POST /api/users/plants - افزودن گیاه به باغچه کاربر
router.post('/plants', (req, res) => {
  try {
    const { plantId, nickname, location, plantingDate } = req.body;
    
    if (!plantId) {
      return res.status(400).json({
        success: false,
        message: 'شناسه گیاه الزامی است'
      });
    }
    
    // در آینده گیاه به پایگاه داده اضافه خواهد شد
    const newUserPlant = {
      id: Date.now().toString(),
      plantId,
      nickname: nickname || 'گیاه من',
      location: location || 'نامشخص',
      plantingDate: plantingDate || new Date().toISOString(),
      lastWatered: null,
      nextWatering: null,
      notes: '',
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: newUserPlant,
      message: 'گیاه با موفقیت به باغچه اضافه شد'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در افزودن گیاه'
    });
  }
});

// PUT /api/users/plants/:id - به‌روزرسانی اطلاعات گیاه
router.put('/plants/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // در آینده گیاه در پایگاه داده به‌روزرسانی خواهد شد
    
    res.json({
      success: true,
      message: 'اطلاعات گیاه به‌روزرسانی شد',
      data: { id, ...updates }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در به‌روزرسانی گیاه'
    });
  }
});

// DELETE /api/users/plants/:id - حذف گیاه از باغچه
router.delete('/plants/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // در آینده گیاه از پایگاه داده حذف خواهد شد
    
    res.json({
      success: true,
      message: 'گیاه از باغچه حذف شد'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در حذف گیاه'
    });
  }
});

export default router;