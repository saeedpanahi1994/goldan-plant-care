import { Router } from 'express';

const router = Router();

// Sample plant data
const samplePlants = [
  {
    id: '1',
    name: 'گل رز',
    scientificName: 'Rosa',
    persianName: 'گل رز',
    category: 'گل‌های زینتی',
    careInstructions: 'نیاز به نور زیاد و آبیاری منظم دارد',
    wateringFrequency: 2, // days
    lightRequirements: 'نور مستقیم آفتاب',
    temperatureRange: '18-25°C',
    imageUrl: '/images/rose.jpg',
    emoji: '🌹'
  },
  {
    id: '2', 
    name: 'کاکتوس',
    scientificName: 'Cactaceae',
    persianName: 'کاکتوس',
    category: 'گیاهان آپارتمانی',
    careInstructions: 'آبیاری کم و نور زیاد نیاز دارد',
    wateringFrequency: 7, // days
    lightRequirements: 'نور غیرمستقیم',
    temperatureRange: '20-30°C',
    imageUrl: '/images/cactus.jpg',
    emoji: '🌵'
  },
  {
    id: '3',
    name: 'مونسترا',
    scientificName: 'Monstera deliciosa',
    persianName: 'مونسترا',
    category: 'گیاهان آپارتمانی',
    careInstructions: 'نیاز به نور غیرمستقیم و آبیاری منظم',
    wateringFrequency: 5, // days
    lightRequirements: 'نور غیرمستقیم',
    temperatureRange: '18-27°C',
    imageUrl: '/images/monstera.jpg',
    emoji: '🍃'
  }
];

// GET /api/plants - دریافت لیست همه گیاهان
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      data: samplePlants,
      count: samplePlants.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت لیست گیاهان'
    });
  }
});

// GET /api/plants/:id - دریافت اطلاعات گیاه خاص  
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const plant = samplePlants.find(p => p.id === id);
    
    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'گیاه مورد نظر یافت نشد'
      });
    }
    
    res.json({
      success: true,
      data: plant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت اطلاعات گیاه'
    });
  }
});

// POST /api/plants/search - جستجو در گیاهان
router.post('/search', (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'کلمه جستجو الزامی است'
      });
    }
    
    const results = samplePlants.filter(plant => 
      plant.name.includes(query) || 
      plant.persianName.includes(query) ||
      plant.scientificName.toLowerCase().includes(query.toLowerCase())
    );
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در جستجوی گیاهان'
    });
  }
});

// GET /api/plants/recommendations - پیشنهاد گیاهان
router.get('/recommendations', (req, res) => {
  try {
    // در آینده بر اساس موقعیت جغرافیایی و شرایط محیطی پیشنهاد خواهد داد
    const recommendations = samplePlants.slice(0, 2);
    
    res.json({
      success: true,
      data: recommendations,
      message: 'گیاهان پیشنهادی برای شما'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت پیشنهادات'
    });
  }
});

export default router;