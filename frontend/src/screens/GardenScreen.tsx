import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Plus, Leaf, WifiOff, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-jalaali';
import axios from 'axios';
import PlantCard from '../components/PlantCard';
import ReminderModal from '../components/ReminderModal';
import ConfirmModal from '../components/ConfirmModal';
import Header from '../components/Header';
import offlineGardenService, { CachedPlant } from '../services/offlineGardenService';

const API_URL = 'http://130.185.76.46:4380/api';
const SERVER_URL = 'http://130.185.76.46:4380';
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Helper function to get full image URL
const getFullImageUrl = (imagePath: string | null): string => {
  if (!imagePath) {
    console.log('🖼️ Image path is null, using placeholder');
    return 'https://via.placeholder.com/400x400?text=گیاه';
  }
  if (imagePath.startsWith('http')) {
    console.log('🖼️ Full URL:', imagePath);
    return imagePath;
  }
  const fullUrl = `${SERVER_URL}${imagePath}`;
  console.log('🖼️ Built URL:', fullUrl, 'from path:', imagePath);
  return fullUrl;
};

// Configure moment-jalaali
moment.loadPersian({ dialect: 'persian-modern', usePersianDigits: true });

const toPersianDigits = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(digit => persianDigits[parseInt(digit)] || digit).join('');
};

const ScreenContainer = styled.div`
  min-height: calc(100vh - 90px);
  background: linear-gradient(135deg, #f5f9f5 0%, #e8f5e9 50%, #f1f8f4 100%);
  padding: 0 0 20px 0;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: radial-gradient(ellipse at top, rgba(76, 175, 80, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const HeaderSection = styled.div`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #43A047 100%);
  padding: 16px 20px;
  border-radius: 0 0 32px 32px;
  box-shadow: 
    0 8px 24px rgba(76, 175, 80, 0.2),
    0 4px 12px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    border-radius: 50%;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: -5%;
    width: 150px;
    height: 150px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
    border-radius: 50%;
  }
`;

const HeaderContent = styled.div`
  position: relative;
  z-index: 1;
  text-align: center;
`;

const PageTitle = styled.h1`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  letter-spacing: -0.5px;
`;

const ContentSection = styled.div`
  padding: 24px 20px;
  position: relative;
  z-index: 1;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1b5e20;
  margin: 0;
  background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const FloatingAddButton = styled.button`
  position: fixed;
  bottom: 100px;
  left: 20px;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border: none;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 6px 20px rgba(76, 175, 80, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  z-index: 1000;

  &:hover {
    transform: scale(1.1);
    box-shadow: 
      0 12px 32px rgba(76, 175, 80, 0.4),
      inset 0 1px 2px rgba(255, 255, 255, 0.4);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    color: #ffffff;
  }
`;

const PlantsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const EmptyIcon = styled.div`
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 8px 24px rgba(76, 175, 80, 0.15),
    inset 0 2px 4px rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;

  svg {
    color: #4CAF50;
  }
`;

const EmptyTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #2e7d32;
  margin: 0;
`;

const EmptyText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #757575;
  margin: 0;
  line-height: 1.6;
`;

const EmptyButton = styled.button`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border: none;
  padding: 14px 32px;
  border-radius: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 6px 20px rgba(76, 175, 80, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  margin-top: 8px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 8px 24px rgba(76, 175, 80, 0.4),
      inset 0 1px 2px rgba(255, 255, 255, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

interface Plant {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  hasReminder?: boolean;
  reminderDate?: string;
  reminderText?: string;
  daysUntilWatering?: number;
  defaultWateringInterval?: number;
  defaultFertilizerInterval?: number;
}

interface UserPlant {
  id: number;
  plant_name_fa: string;
  plant_scientific_name: string;
  plant_image: string;
  nickname: string | null;
  next_watering_at: string;
  health_status: string;
  effective_watering_interval: number;
  default_watering_interval: number;
  default_fertilizer_interval: number;
  custom_watering_interval: number | null;
  custom_fertilizer_interval: number | null;
}

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
  gap: 16px;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(76, 175, 80, 0.1);
  border-top-color: #4CAF50;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #4CAF50;
  font-weight: 600;
`;

const OfflineBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  color: white;
  padding: 10px 16px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 600;
  border-radius: 12px;
  margin: 0 16px 12px;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
`;

const SyncingBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
  color: white;
  padding: 10px 16px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 600;
  border-radius: 12px;
  margin: 0 16px 12px;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
  
  svg {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const GardenScreen: React.FC = () => {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPlant, setDeletingPlant] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasInitialized = useRef(false);

  const [reminderModalState, setReminderModalState] = useState<{
    isOpen: boolean;
    plantId: string | null;
    plantName: string;
    defaultWateringInterval: number;
    defaultFertilizerInterval: number;
  }>({
    isOpen: false,
    plantId: null,
    plantName: '',
    defaultWateringInterval: 7,
    defaultFertilizerInterval: 30,
  });

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    plantId: string | null;
    plantName: string;
  }>({
    isOpen: false,
    plantId: null,
    plantName: '',
  });

  // تبدیل گیاه سرور/کش به فرمت نمایش
  const formatPlantForDisplay = useCallback((plant: UserPlant | CachedPlant): Plant => {
    const nextWatering = new Date(plant.next_watering_at);
    const now = new Date();
    const daysUntilWatering = Math.round((toStartOfDay(nextWatering).getTime() - toStartOfDay(now).getTime()) / MS_PER_DAY);
    
    return {
      id: plant.id.toString(),
      name: plant.nickname || plant.plant_name_fa,
      scientificName: plant.plant_scientific_name || '',
      image: getFullImageUrl(plant.plant_image),
      hasReminder: daysUntilWatering <= 2,
      reminderText: daysUntilWatering <= 0 
        ? 'نیاز به آبیاری فوری' 
        : daysUntilWatering <= 2 
          ? 'یادآور آبیاری' 
          : undefined,
      reminderDate: daysUntilWatering <= 2 
        ? `${toPersianDigits(Math.max(0, daysUntilWatering))} روز تا آبیاری` 
        : undefined,
      daysUntilWatering,
      defaultWateringInterval: plant.effective_watering_interval || plant.default_watering_interval || 7,
      defaultFertilizerInterval: plant.default_fertilizer_interval || 30,
    };
  }, []);

  // بارگذاری گیاهان از کش آفلاین
  const loadFromOfflineCache = useCallback(async (): Promise<Plant[]> => {
    try {
      const cachedPlants = await offlineGardenService.getPlants();
      if (cachedPlants.length > 0) {
        const formatted = cachedPlants.map(formatPlantForDisplay);
        
        // جایگزینی آدرس تصاویر با نسخه کش شده (در حالت آفلاین)
        const plantsWithCachedImages = await Promise.all(
          formatted.map(async (plant) => {
            const cachedImageUrl = await offlineGardenService.getImageUrl(plant.image);
            return { ...plant, image: cachedImageUrl };
          })
        );
        
        return plantsWithCachedImages;
      }
    } catch (error) {
      console.error('❌ خطا در خواندن از کش آفلاین:', error);
    }
    return [];
  }, [formatPlantForDisplay]);

  // دریافت گیاهان کاربر از سرور (با پشتیبانی آفلاین)
  const fetchUserPlants = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setPlants([]);
        return;
      }

      // اگر آنلاین هستیم، از سرور بخوان
      if (navigator.onLine) {
        try {
          const response = await axios.get(`${API_URL}/plants`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000, // 10 ثانیه تایم‌اوت
          });

          if (response.data.success) {
            const userPlants: UserPlant[] = response.data.plants;
            
            // ذخیره در کش آفلاین
            const plantsToCache: CachedPlant[] = userPlants.map(p => ({
              id: p.id,
              plant_name_fa: p.plant_name_fa,
              plant_scientific_name: p.plant_scientific_name,
              plant_image: p.plant_image,
              nickname: p.nickname,
              next_watering_at: p.next_watering_at,
              health_status: p.health_status,
              effective_watering_interval: p.effective_watering_interval,
              default_watering_interval: p.default_watering_interval,
              default_fertilizer_interval: p.default_fertilizer_interval,
              custom_watering_interval: p.custom_watering_interval,
              custom_fertilizer_interval: p.custom_fertilizer_interval,
            }));
            
            await offlineGardenService.savePlants(plantsToCache);

            // کش تصاویر در پس‌زمینه
            const imageUrls = userPlants
              .map(p => getFullImageUrl(p.plant_image))
              .filter(url => !url.includes('placeholder'));
            offlineGardenService.cacheAllImages(imageUrls);
            
            // تبدیل و نمایش
            const formattedPlants = userPlants.map(formatPlantForDisplay);
            setPlants(formattedPlants);
            setIsOffline(false);
            return;
          }
        } catch (networkError) {
          console.warn('⚠️ خطا در دریافت از سرور، بارگذاری از کش...', networkError);
        }
      }

      // آفلاین یا خطای شبکه: از کش بخوان
      setIsOffline(true);
      const cachedPlants = await loadFromOfflineCache();
      setPlants(cachedPlants);

    } catch (error) {
      console.error('خطا در دریافت گیاهان:', error);
      // تلاش آخر: از کش بخوان
      const cachedPlants = await loadFromOfflineCache();
      setPlants(cachedPlants);
      if (cachedPlants.length === 0) {
        setPlants([]);
      }
    } finally {
      setLoading(false);
    }
  }, [formatPlantForDisplay, loadFromOfflineCache]);

  // همگام‌سازی عملیات در انتظار هنگام آنلاین شدن
  const syncPendingActions = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const pending = await offlineGardenService.getPendingActions();
    if (pending.length === 0) return;

    setIsSyncing(true);
    try {
      const result = await offlineGardenService.syncPendingActions(API_URL, token);
      if (result.synced > 0) {
        // بعد از همگام‌سازی، داده‌ها را از سرور بازخوانی کن
        await fetchUserPlants();
      }
    } catch (error) {
      console.error('❌ خطا در همگام‌سازی:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchUserPlants]);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchUserPlants();
    }
  }, [fetchUserPlants]);

  // رصد تغییرات وضعیت شبکه
  useEffect(() => {
    const handleOnline = () => {
      console.log('🟢 آنلاین شد');
      setIsOffline(false);
      syncPendingActions();
      fetchUserPlants();
    };

    const handleOffline = () => {
      console.log('🔴 آفلاین شد');
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingActions, fetchUserPlants]);

  const handleAddPlant = () => {
    navigate('/plant-bank');
  };

  const handleReminderClick = (plantId: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (plant) {
      setReminderModalState({
        isOpen: true,
        plantId: plantId,
        plantName: plant.name,
        defaultWateringInterval: plant.defaultWateringInterval || 7,
        defaultFertilizerInterval: plant.defaultFertilizerInterval || 30,
      });
    }
  };

  const handleSaveReminder = async (
    reminderType: 'watering' | 'fertilizing', 
    intervalDays: number, 
    fertilizerType?: string
  ) => {
    if (!reminderModalState.plantId) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('لطفاً ابتدا وارد شوید');
      return;
    }

    const reminderData = {
      reminder_type: reminderType,
      interval_days: intervalDays,
      fertilizer_type: fertilizerType
    };

    // اگر آفلاین هستیم، عملیات را در صف ذخیره کن
    if (!navigator.onLine) {
      await offlineGardenService.addPendingAction({
        type: 'reminder',
        plantId: parseInt(reminderModalState.plantId),
        data: reminderData,
      });
      
      // به‌روزرسانی محلی
      const cachedPlants = await offlineGardenService.getPlants();
      const targetPlant = cachedPlants.find(p => p.id === parseInt(reminderModalState.plantId!));
      if (targetPlant && reminderType === 'watering') {
        targetPlant.effective_watering_interval = intervalDays;
        targetPlant.custom_watering_interval = intervalDays;
        const nextWatering = new Date();
        nextWatering.setDate(nextWatering.getDate() + intervalDays);
        targetPlant.next_watering_at = nextWatering.toISOString();
        await offlineGardenService.updatePlant(targetPlant);
      }
      
      const offlinePlants = await loadFromOfflineCache();
      setPlants(offlinePlants);

      const message = reminderType === 'watering' 
        ? `یادآور آبیاری هر ${intervalDays} روز تنظیم شد (همگام‌سازی هنگام اتصال)`
        : `یادآور کوددهی تنظیم شد (همگام‌سازی هنگام اتصال)`;
      alert(message);
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/plants/${reminderModalState.plantId}/reminder`,
        reminderData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        await fetchUserPlants();
        
        const message = reminderType === 'watering' 
          ? `یادآور آبیاری هر ${intervalDays} روز تنظیم شد`
          : `یادآور کوددهی با ${fertilizerType} هر ${intervalDays} روز تنظیم شد`;
        
        alert(message);
      }
    } catch (error) {
      console.error('خطا در ذخیره یادآور:', error);
      alert('خطا در ذخیره یادآور. لطفاً دوباره تلاش کنید.');
    }
  };

  const handleCloseReminderModal = () => {
    setReminderModalState({
      isOpen: false,
      plantId: null,
      plantName: '',
      defaultWateringInterval: 7,
      defaultFertilizerInterval: 30,
    });
  };

  const handleDeleteClick = (plantId: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (plant) {
      setDeleteModalState({
        isOpen: true,
        plantId: plantId,
        plantName: plant.name,
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState.plantId) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('لطفاً ابتدا وارد شوید');
      return;
    }

    // اگر آفلاین هستیم
    if (!navigator.onLine) {
      const plantIdNum = parseInt(deleteModalState.plantId);
      await offlineGardenService.addPendingAction({
        type: 'delete',
        plantId: plantIdNum,
      });
      await offlineGardenService.deletePlant(plantIdNum);
      
      setPlants(prev => prev.filter(p => p.id !== deleteModalState.plantId));
      setDeleteModalState({ isOpen: false, plantId: null, plantName: '' });
      alert('گیاه حذف شد (همگام‌سازی هنگام اتصال)');
      return;
    }

    try {
      setDeletingPlant(true);
      
      const response = await axios.delete(
        `${API_URL}/plants/${deleteModalState.plantId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        await fetchUserPlants();
        
        setDeleteModalState({
          isOpen: false,
          plantId: null,
          plantName: '',
        });
        
        alert('گیاه با موفقیت از باغچه حذف شد');
      }
    } catch (error) {
      console.error('خطا در حذف گیاه:', error);
      alert('خطا در حذف گیاه. لطفاً دوباره تلاش کنید.');
    } finally {
      setDeletingPlant(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!deletingPlant) {
      setDeleteModalState({
        isOpen: false,
        plantId: null,
        plantName: '',
      });
    }
  };

  // ثبت آبیاری گیاه (با پشتیبانی آفلاین)
  const handleWateringConfirm = async (plantId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('لطفاً ابتدا وارد شوید');
      return;
    }

    const plant = plants.find(p => p.id === plantId);

    // اگر آفلاین هستیم
    if (!navigator.onLine) {
      const plantIdNum = parseInt(plantId);
      await offlineGardenService.addPendingAction({
        type: 'water',
        plantId: plantIdNum,
      });

      // به‌روزرسانی محلی: تنظیم next_watering_at بر اساس بازه آبیاری
      const cachedPlants = await offlineGardenService.getPlants();
      const targetPlant = cachedPlants.find(p => p.id === plantIdNum);
      if (targetPlant) {
        const interval = targetPlant.effective_watering_interval || targetPlant.default_watering_interval || 7;
        const nextWatering = new Date();
        nextWatering.setDate(nextWatering.getDate() + interval);
        targetPlant.next_watering_at = nextWatering.toISOString();
        await offlineGardenService.updatePlant(targetPlant);
      }

      // به‌روزرسانی لیست نمایشی
      const offlinePlants = await loadFromOfflineCache();
      setPlants(offlinePlants);
      
      alert(`آبیاری ${plant?.name || 'گیاه'} ثبت شد (همگام‌سازی هنگام اتصال)`);
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/plants/${plantId}/water`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        await fetchUserPlants();
        alert(`آبیاری ${plant?.name || 'گیاه'} با موفقیت ثبت شد`);
      }
    } catch (error) {
      console.error('خطا در ثبت آبیاری:', error);
      alert('خطا در ثبت آبیاری. لطفاً دوباره تلاش کنید.');
    }
  };

  const handlePlantClick = (plantId: string) => {
    navigate(`/plant/${plantId}?source=garden`);
  };

  return (
    <ScreenContainer>
      <Header title="باغچه ی من" showNotificationBadge={plants.some(p => p.hasReminder)} />
      
      <HeaderSection>
        <HeaderContent>
          <PageTitle>{moment().locale('fa').format('dddd، jD jMMMM jYYYY')}</PageTitle>
        </HeaderContent>
      </HeaderSection>

      <ContentSection>
        {isOffline && !loading && plants.length > 0 && (
          <OfflineBanner>
            <WifiOff size={16} />
            حالت آفلاین — نمایش از حافظه محلی
          </OfflineBanner>
        )}
        
        {isSyncing && (
          <SyncingBanner>
            <RefreshCw size={16} />
            در حال همگام‌سازی با سرور...
          </SyncingBanner>
        )}

        {loading ? (
          <LoadingContainer>
            <Spinner />
            <LoadingText>در حال بارگذاری باغچه شما...</LoadingText>
          </LoadingContainer>
        ) : plants.length > 0 ? (
          <>
            
            <PlantsList>
              {plants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  id={plant.id}
                  name={plant.name}
                  scientificName={plant.scientificName}
                  image={plant.image}
                  hasReminder={plant.hasReminder}
                  daysUntilWatering={plant.daysUntilWatering}
                  showDeleteButton={true}
                  onReminderClick={() => handleReminderClick(plant.id)}
                  onCardClick={() => handlePlantClick(plant.id)}
                  onDeleteClick={() => handleDeleteClick(plant.id)}
                  onWateringConfirm={() => handleWateringConfirm(plant.id)}
                />
              ))}
            </PlantsList>
          </>
        ) : (
          <EmptyState>
            <EmptyIcon>
              <Leaf size={48} />
            </EmptyIcon>
            <EmptyTitle>باغچه شما خالی است</EmptyTitle>
            <EmptyText>
              با افزودن اولین گیاه خود، سفر مراقبت از گیاهان را آغاز کنید
            </EmptyText>
            <EmptyButton onClick={handleAddPlant}>
              <Plus size={20} />
              افزودن گیاه جدید
            </EmptyButton>
          </EmptyState>
        )}
      </ContentSection>
      
      <FloatingAddButton onClick={handleAddPlant}>
        <Plus size={20} />
      </FloatingAddButton>

      <ReminderModal
        isOpen={reminderModalState.isOpen}
        onClose={handleCloseReminderModal}
        plantName={reminderModalState.plantName}
        defaultWateringInterval={reminderModalState.defaultWateringInterval}
        defaultFertilizerInterval={reminderModalState.defaultFertilizerInterval}
        onSave={handleSaveReminder}
      />

      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="حذف گیاه از باغچه"
        message={`آیا مطمئن هستید که می‌خواهید "${deleteModalState.plantName}" را از باغچه خود حذف کنید؟`}
        confirmText="بله، حذف شود"
        cancelText="انصراف"
        isDestructive={true}
        loading={deletingPlant}
      />
    </ScreenContainer>
  );
};

export default GardenScreen;
