import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ArrowRight, Droplets, Sun, Thermometer, Wind, ChevronDown, ChevronUp, Leaf, Plus, Check, Sparkles, HeartPulse, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import PlantChatModal from '../components/PlantChatModal';

const API_URL = 'http://130.185.76.46:4380/api';
const SERVER_URL = 'http://130.185.76.46:4380';

// Helper function to get full image URL
import defaultPlantImage from '../assets/default-plant.svg';

const getFullImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return defaultPlantImage;
  if (imagePath.startsWith('http')) return imagePath;
  return `${SERVER_URL}${imagePath}`;
};

interface PlantData {
  id: number;
  name: string;
  name_fa: string;
  scientific_name: string;
  description_fa: string;
  main_image_url: string;
  additional_images: string[];
  watering_interval_days: number;
  watering_tips: string;
  light_requirement: string;
  light_description: string;
  min_temperature: number;
  max_temperature: number;
  humidity_level: string;
  humidity_tips: string;
  fertilizer_interval_days: number;
  fertilizer_tips: string;
  difficulty_level: string;
  is_toxic_to_pets: boolean;
  is_air_purifying: boolean;
  user_plant_id?: number;
  health_status?: string;
}

const ScreenContainer = styled.div`
  min-height: calc(100vh - 90px);
  background: linear-gradient(135deg, #f5f9f5 0%, #e8f5e9 50%, #f1f8f4 100%);
  padding-bottom: 100px;
`;

const Header = styled.div`
  background: #ffffff;
  padding: 16px 20px;
  padding-top: calc(env(safe-area-inset-top, 16px) + 16px);
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
`;

const BackButton = styled.button`
  background: #f5f5f5;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #eeeeee;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    color: #424242;
  }
`;

const AIButton = styled.button`
  background: linear-gradient(135deg, #7C4DFF 0%, #651FFF 100%);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(124, 77, 255, 0.3);
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%);
    transform: translateX(-100%);
    animation: shimmer 3s infinite;
  }

  @keyframes shimmer {
    100% { transform: translateX(100%); }
  }

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(124, 77, 255, 0.4);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    color: white;
  }
`;

const HeaderTitle = styled.h1`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #2e7d32;
  margin: 0;
  flex: 1;
`;

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

const ImageSection = styled.div`
  background: #ffffff;
  padding: 24px 20px;
  margin-bottom: 16px;
`;

const MainImage = styled.div`
  width: 100%;
  height: 320px;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  margin-bottom: 16px;
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.1),
    inset 0 2px 4px rgba(0, 0, 0, 0.05);
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s ease;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    border: 4px solid rgba(76, 175, 80, 0.2);
    border-top-color: #4CAF50;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  &.loaded::before {
    display: none;
  }
  
  @keyframes spin {
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;

const ThumbnailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
`;

const Thumbnail = styled.div<{ $isActive?: boolean }>`
  width: 100%;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: ${props => props.$isActive ? '3px solid #4CAF50' : '2px solid #e0e0e0'};
  transition: all 0.3s ease;
  box-shadow: ${props => props.$isActive 
    ? '0 4px 12px rgba(76, 175, 80, 0.3)'
    : '0 2px 8px rgba(0, 0, 0, 0.06)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PlantNameSection = styled.div`
  background: #ffffff;
  padding: 20px;
  margin-bottom: 16px;
`;

const PlantName = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #1b5e20;
  margin: 0 0 8px 0;
`;

const ScientificName = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #757575;
  font-style: italic;
  margin: 0 0 12px 0;
`;

const DifficultyBadge = styled.span<{ $level: string }>`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => {
    switch (props.$level) {
      case 'easy': return 'linear-gradient(135deg, #a5d6a7 0%, #81c784 100%)';
      case 'medium': return 'linear-gradient(135deg, #ffcc80 0%, #ffb74d 100%)';
      case 'hard': return 'linear-gradient(135deg, #ef9a9a 0%, #e57373 100%)';
      default: return '#e0e0e0';
    }
  }};
  color: #ffffff;
`;

const DescriptionSection = styled.div`
  background: #ffffff;
  padding: 20px;
  margin-bottom: 16px;
  border-radius: 0;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const SectionIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);

  svg {
    color: #4CAF50;
  }
`;

const SectionTitle = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #2e7d32;
  margin: 0;
`;

const DescriptionText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: #424242;
  margin: 0;
  text-align: justify;
`;

const CareSection = styled.div`
  background: #ffffff;
  padding: 20px;
  margin-bottom: 16px;
`;

const CareGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const CareCard = styled.div<{ $color: string }>`
  background: #ffffff;
  border: 1px solid ${props => props.$color};
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const CareIcon = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  background: ${props => props.$color};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px ${props => props.$color}40;

  svg {
    color: #ffffff;
  }
`;

const CareInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
`;

const CareLabel = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #757575;
  font-weight: 500;
`;

const CareValue = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #2e7d32;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CollapsibleSection = styled.div`
  background: #ffffff;
  margin-bottom: 12px;
  border-radius: 0;
  overflow: hidden;
`;

const CollapsibleHeader = styled.div<{ $isOpen: boolean }>`
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: ${props => props.$isOpen ? '#f5f9f5' : '#ffffff'};
  transition: all 0.3s ease;
  border-bottom: ${props => props.$isOpen ? '1px solid #e0e0e0' : 'none'};

  &:hover {
    background: #f5f9f5;
  }
`;

const CollapsibleTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #2e7d32;
  margin: 0;
`;

const CollapsibleIcon = styled.div<{ $isOpen: boolean }>`
  width: 32px;
  height: 32px;
  background: ${props => props.$isOpen ? 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)' : '#f5f5f5'};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  svg {
    color: ${props => props.$isOpen ? '#ffffff' : '#757575'};
  }
`;

const CollapsibleContent = styled.div<{ $isOpen: boolean }>`
  max-height: ${props => props.$isOpen ? '1000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
`;

const CollapsibleBody = styled.div`
  padding: 20px;
`;

const CollapsibleText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: #424242;
  margin: 0;
  text-align: justify;
`;

const ActionButtonsRow = styled.div`
  display: flex;
  gap: 10px;
  margin: 20px 20px 10px 20px;
`;

const HealthButton = styled.button`
  flex: 1;
  background: linear-gradient(135deg, #EF5350 0%, #FF7043 100%);
  border: none;
  border-radius: 16px;
  padding: 14px 12px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 6px 20px rgba(239, 83, 80, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(239, 83, 80, 0.4);
  }

  &:active { transform: translateY(0); }
`;

const AnalysisButton = styled.button`
  flex: 1;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border: none;
  border-radius: 16px;
  padding: 14px 12px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.4);
  }

  &:active { transform: translateY(0); }
`;

const HealthStatusBadge = styled.div<{ $status: string }>`
  margin: 16px 20px 0 20px;
  padding: 14px 16px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${props => {
    switch (props.$status) {
      case 'healthy': return 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)';
      case 'needs_attention': return 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)';
      case 'sick': return 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)';
      case 'recovering': return 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)';
      default: return 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)';
    }
  }};
  border: 1.5px solid ${props => {
    switch (props.$status) {
      case 'healthy': return '#81C784';
      case 'needs_attention': return '#FFD54F';
      case 'sick': return '#EF9A9A';
      case 'recovering': return '#90CAF9';
      default: return '#81C784';
    }
  }};
`;

const HealthBadgeIcon = styled.div<{ $status: string }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.$status) {
      case 'healthy': return '#4CAF50';
      case 'needs_attention': return '#FFB300';
      case 'sick': return '#EF5350';
      case 'recovering': return '#42A5F5';
      default: return '#4CAF50';
    }
  }};
  color: white;
  flex-shrink: 0;
`;

const HealthBadgeText = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #424242;
`;

const AddToGardenButton = styled.button`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border: none;
  border-radius: 16px;
  padding: 16px;
  margin: 20px 20px 10px 20px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 6px 20px rgba(76, 175, 80, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  width: calc(100% - 40px);

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

const AddToMyGardenButton = styled.button<{ $added?: boolean }>`
  background: ${props => props.$added 
    ? 'linear-gradient(135deg, #66BB6A 0%, #81C784 100%)'
    : 'linear-gradient(135deg, #2196F3 0%, #42A5F5 100%)'};
  border: none;
  border-radius: 16px;
  padding: 16px;
  margin: 10px 20px 20px 20px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  cursor: ${props => props.$added ? 'default' : 'pointer'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$added 
    ? '0 6px 20px rgba(102, 187, 106, 0.3)' 
    : '0 6px 20px rgba(33, 150, 243, 0.3)'};
  width: calc(100% - 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    transform: ${props => props.$added ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.$added 
      ? '0 6px 20px rgba(102, 187, 106, 0.3)'
      : '0 8px 24px rgba(33, 150, 243, 0.4)'};
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
`;

const ErrorIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  
  svg {
    color: #e53935;
  }
`;

const ErrorText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  color: #757575;
  margin: 0;
`;

const PlantDetailScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source'); // 'garden' or null (plant-bank)
  const [plant, setPlant] = useState<PlantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [addingToGarden, setAddingToGarden] = useState(false);
  const [addedToGarden, setAddedToGarden] = useState(false);
  const [isFromGarden, setIsFromGarden] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    watering: false,
    light: false,
    humidity: false,
    fertilizer: false,
  });

  useEffect(() => {
    // Check if we should open chat automatically
    if (location.state && (location.state as any).openChat) {
      setIsChatOpen(true);
      // Clear the state so it doesn't reopen on refresh if we navigation works that way
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const fetchPlantDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        // اگر از باغچه آمده، گیاه کاربر را بگیر
        if (source === 'garden' && token) {
          const response = await axios.get(`${API_URL}/plants/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success) {
            const userPlant = response.data.plant;
            // تبدیل داده‌های گیاه کاربر به فرمت PlantData
            setPlant({
              id: userPlant.plant_id,
              name: userPlant.plant_name || userPlant.nickname,
              name_fa: userPlant.plant_name_fa || userPlant.nickname,
              scientific_name: userPlant.plant_scientific_name || '',
              description_fa: userPlant.description_fa || '',
              main_image_url: getFullImageUrl(userPlant.plant_image),
              additional_images: userPlant.additional_images ? userPlant.additional_images.map(getFullImageUrl) : [],
              watering_interval_days: userPlant.effective_watering_interval || userPlant.default_watering_interval || 7,
              watering_tips: userPlant.watering_tips || '',
              light_requirement: userPlant.light_requirement || 'indirect',
              light_description: userPlant.light_description || '',
              min_temperature: userPlant.min_temperature || 15,
              max_temperature: userPlant.max_temperature || 28,
              humidity_level: userPlant.humidity_level || 'medium',
              humidity_tips: userPlant.humidity_tips || '',
              fertilizer_interval_days: userPlant.default_fertilizer_interval || 30,
              fertilizer_tips: userPlant.fertilizer_tips || '',
              difficulty_level: userPlant.difficulty_level || 'medium',
              is_toxic_to_pets: userPlant.is_toxic_to_pets || false,
              is_air_purifying: userPlant.is_air_purifying || false,
              user_plant_id: userPlant.id,
              health_status: userPlant.health_status || 'healthy',
            });
            setIsFromGarden(true);
            setAddedToGarden(true);
          } else {
            setError('گیاه یافت نشد');
          }
        } else {
          // از بانک گیاهان بگیر
          const response = await axios.get(`${API_URL}/plant-bank/${id}`);
          
          if (response.data.success) {
            const plantData = response.data.data;
            setPlant({
              ...plantData,
              main_image_url: getFullImageUrl(plantData.main_image_url)
            });
            
            // بررسی اینکه آیا گیاه قبلاً به باغچه کاربر اضافه شده
            if (token) {
              try {
                const plantsResponse = await axios.get(`${API_URL}/plants`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                if (plantsResponse.data.success) {
                  const userPlants = plantsResponse.data.plants;
                  const alreadyAdded = userPlants.some((p: any) => p.plant_id === parseInt(id));
                  setAddedToGarden(alreadyAdded);
                }
              } catch (checkError) {
                console.log('خطا در بررسی گیاهان کاربر:', checkError);
              }
            }
          } else {
            setError('گیاه یافت نشد');
          }
        }
      } catch (err) {
        console.error('خطا در دریافت اطلاعات گیاه:', err);
        setError('خطا در دریافت اطلاعات گیاه');
      } finally {
        setLoading(false);
      }
    };

    fetchPlantDetails();
  }, [id, source]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleAddToGarden = async () => {
    if (!plant || addedToGarden || addingToGarden) return;

    try {
      setAddingToGarden(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        alert('لطفا ابتدا وارد شوید');
        navigate('/login');
        return;
      }

      // دریافت یا ایجاد باغچه پیش‌فرض کاربر
      const gardenResponse = await axios.get(`${API_URL}/gardens/default`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!gardenResponse.data.success) {
        throw new Error('خطا در دریافت باغچه');
      }

      const gardenId = gardenResponse.data.garden.id;

      // افزودن گیاه به باغچه
      const addResponse = await axios.post(`${API_URL}/plants`, {
        garden_id: gardenId,
        plant_id: plant.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (addResponse.data.success) {
        setAddedToGarden(true);
        // نمایش پیام موفقیت
        setTimeout(() => {
          alert('گیاه با موفقیت به باغچه شما اضافه شد!');
        }, 100);
      }
    } catch (err: any) {
      console.error('خطا در افزودن گیاه به باغچه:', err);
      alert(err.response?.data?.message || 'خطا در افزودن گیاه به باغچه');
    } finally {
      setAddingToGarden(false);
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'easy': return 'آسان';
      case 'medium': return 'متوسط';
      case 'hard': return 'سخت';
      default: return level;
    }
  };

  const getLightLabel = (light: string) => {
    switch (light) {
      case 'direct': return 'نور مستقیم';
      case 'indirect': return 'نور غیرمستقیم';
      case 'low': return 'نور کم';
      case 'bright': return 'نور زیاد';
      default: return light || 'متغیر';
    }
  };

  const getHumidityLabel = (humidity: string) => {
    switch (humidity) {
      case 'high': return 'بالا';
      case 'medium': return 'متوسط';
      case 'low': return 'کم';
      default: return humidity || 'متوسط';
    }
  };

  // ترکیب تصویر اصلی با تصاویر اضافی
  const allImages = plant ? [plant.main_image_url, ...(plant.additional_images || [])] : [];

  if (loading) {
    return (
      <ScreenContainer>
        <Header>
          <BackButton onClick={() => navigate(-1)}>
            <ArrowRight size={20} />
          </BackButton>
          <HeaderTitle>مشخصات گیاه</HeaderTitle>
        </Header>
        <LoadingContainer>
          <Spinner />
          <LoadingText>در حال بارگذاری اطلاعات گیاه...</LoadingText>
        </LoadingContainer>
      </ScreenContainer>
    );
  }

  if (error || !plant) {
    return (
      <ScreenContainer>
        <Header>
          <BackButton onClick={() => navigate(-1)}>
            <ArrowRight size={20} />
          </BackButton>
          <HeaderTitle>مشخصات گیاه</HeaderTitle>
        </Header>
        <ErrorContainer>
          <ErrorIcon>
            <Leaf size={40} />
          </ErrorIcon>
          <ErrorText>{error || 'گیاه یافت نشد'}</ErrorText>
        </ErrorContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <ArrowRight size={20} />
        </BackButton>
        <HeaderTitle>مشخصات گیاه</HeaderTitle>
        <AIButton onClick={() => setIsChatOpen(true)}>
          <Sparkles size={20} />
        </AIButton>
      </Header>

      <ImageSection>
        <MainImage className={mainImageLoaded ? 'loaded' : ''}>
          <img 
            src={allImages[selectedImage]} 
            alt={plant.name_fa}
            onLoad={() => setMainImageLoaded(true)}
            onError={(e) => {
              e.currentTarget.src = defaultPlantImage;
              setMainImageLoaded(true);
            }}
          />
        </MainImage>
        {allImages.length > 1 && (
          <ThumbnailGrid>
            {allImages.slice(0, 4).map((image, index) => (
              <Thumbnail
                key={index}
                $isActive={selectedImage === index}
                onClick={() => {
                  setSelectedImage(index);
                  setMainImageLoaded(false);
                }}
              >
                <img src={image} alt={`${plant.name_fa} ${index + 1}`} />
              </Thumbnail>
            ))}
          </ThumbnailGrid>
        )}
      </ImageSection>

      <PlantNameSection>
        <PlantName>{plant.name_fa}</PlantName>
        <ScientificName>{plant.scientific_name}</ScientificName>
        <DifficultyBadge $level={plant.difficulty_level}>
          سطح نگهداری: {getDifficultyLabel(plant.difficulty_level)}
        </DifficultyBadge>
      </PlantNameSection>

      {plant.description_fa && (
        <DescriptionSection>
          <SectionHeader>
            <SectionIcon>
              <Leaf size={20} />
            </SectionIcon>
            <SectionTitle>درباره گیاه</SectionTitle>
          </SectionHeader>
          <DescriptionText>{plant.description_fa}</DescriptionText>
        </DescriptionSection>
      )}

      <CareSection>
        <SectionHeader>
          <SectionIcon>
            <Droplets size={20} />
          </SectionIcon>
          <SectionTitle>نگهداری گیاه</SectionTitle>
        </SectionHeader>
        <CareGrid>
          <CareCard $color="#E3F2FD">
            <CareIcon $color="linear-gradient(135deg, #42A5F5 0%, #1E88E5 100%)">
              <Droplets size={20} />
            </CareIcon>
            <CareInfo>
              <CareLabel>آبدهی</CareLabel>
              <CareValue>هر {plant.watering_interval_days} روز</CareValue>
            </CareInfo>
          </CareCard>
          <CareCard $color="#E8F5E9">
            <CareIcon $color="linear-gradient(135deg, #66BB6A 0%, #43A047 100%)">
              <Wind size={20} />
            </CareIcon>
            <CareInfo>
              <CareLabel>رطوبت</CareLabel>
              <CareValue>{getHumidityLabel(plant.humidity_level)}</CareValue>
            </CareInfo>
          </CareCard>
          <CareCard $color="#FFF3E0">
            <CareIcon $color="linear-gradient(135deg, #FFA726 0%, #FB8C00 100%)">
              <Sun size={20} />
            </CareIcon>
            <CareInfo>
              <CareLabel>نور</CareLabel>
              <CareValue>{getLightLabel(plant.light_requirement)}</CareValue>
            </CareInfo>
          </CareCard>
          <CareCard $color="#FFEBEE">
            <CareIcon $color="linear-gradient(135deg, #EF5350 0%, #E53935 100%)">
              <Thermometer size={20} />
            </CareIcon>
            <CareInfo>
              <CareLabel>دما</CareLabel>
              <CareValue>{plant.min_temperature} تا {plant.max_temperature}°</CareValue>
            </CareInfo>
          </CareCard>
        </CareGrid>
      </CareSection>

      {plant.watering_tips && (
        <CollapsibleSection>
          <CollapsibleHeader 
            $isOpen={openSections.watering}
            onClick={() => toggleSection('watering')}
          >
            <CollapsibleTitle>نحوه آبیاری</CollapsibleTitle>
            <CollapsibleIcon $isOpen={openSections.watering}>
              {openSections.watering ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </CollapsibleIcon>
          </CollapsibleHeader>
          <CollapsibleContent $isOpen={openSections.watering}>
            <CollapsibleBody>
              <CollapsibleText>{plant.watering_tips}</CollapsibleText>
            </CollapsibleBody>
          </CollapsibleContent>
        </CollapsibleSection>
      )}

      {plant.light_description && (
        <CollapsibleSection>
          <CollapsibleHeader 
            $isOpen={openSections.light}
            onClick={() => toggleSection('light')}
          >
            <CollapsibleTitle>نور مناسب</CollapsibleTitle>
            <CollapsibleIcon $isOpen={openSections.light}>
              {openSections.light ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </CollapsibleIcon>
          </CollapsibleHeader>
          <CollapsibleContent $isOpen={openSections.light}>
            <CollapsibleBody>
              <CollapsibleText>{plant.light_description}</CollapsibleText>
            </CollapsibleBody>
          </CollapsibleContent>
        </CollapsibleSection>
      )}

      {plant.humidity_tips && (
        <CollapsibleSection>
          <CollapsibleHeader 
            $isOpen={openSections.humidity}
            onClick={() => toggleSection('humidity')}
          >
            <CollapsibleTitle>خاک مناسب</CollapsibleTitle>
            <CollapsibleIcon $isOpen={openSections.humidity}>
              {openSections.humidity ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </CollapsibleIcon>
          </CollapsibleHeader>
          <CollapsibleContent $isOpen={openSections.humidity}>
            <CollapsibleBody>
              <CollapsibleText>{plant.humidity_tips}</CollapsibleText>
            </CollapsibleBody>
          </CollapsibleContent>
        </CollapsibleSection>
      )}

      {plant.fertilizer_tips && (
        <CollapsibleSection>
          <CollapsibleHeader 
            $isOpen={openSections.fertilizer}
            onClick={() => toggleSection('fertilizer')}
          >
            <CollapsibleTitle>کود مناسب</CollapsibleTitle>
            <CollapsibleIcon $isOpen={openSections.fertilizer}>
              {openSections.fertilizer ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </CollapsibleIcon>
          </CollapsibleHeader>
          <CollapsibleContent $isOpen={openSections.fertilizer}>
            <CollapsibleBody>
              <CollapsibleText>{plant.fertilizer_tips}</CollapsibleText>
            </CollapsibleBody>
          </CollapsibleContent>
        </CollapsibleSection>
      )}

      {/* Health Status Badge - فقط در حالت باغچه */}
      {isFromGarden && plant.user_plant_id && plant.health_status && (
        <HealthStatusBadge $status={plant.health_status}>
          <HealthBadgeIcon $status={plant.health_status}>
            {plant.health_status === 'healthy' && <ShieldCheck size={18} />}
            {plant.health_status === 'needs_attention' && <ShieldAlert size={18} />}
            {plant.health_status === 'sick' && <HeartPulse size={18} />}
            {plant.health_status === 'recovering' && <Shield size={18} />}
          </HealthBadgeIcon>
          <HealthBadgeText>
            {plant.health_status === 'healthy' && '🌿 گیاه سالم است'}
            {plant.health_status === 'needs_attention' && '⚠️ نیاز به توجه دارد'}
            {plant.health_status === 'sick' && '🏥 بیماری شناسایی شده'}
            {plant.health_status === 'recovering' && '💊 در حال بهبود'}
          </HealthBadgeText>
        </HealthStatusBadge>
      )}

      {/* Action Buttons Row - Health + Analysis for garden plants */}
      {isFromGarden && plant.user_plant_id ? (
        <ActionButtonsRow>
          <HealthButton onClick={() => navigate(`/plant/${plant.user_plant_id}/health`)}>
            <HeartPulse size={18} />
            سلامت گیاه
          </HealthButton>
          <AnalysisButton onClick={() => navigate('/analysis')}>
            <Leaf size={18} />
            آنالیز محیط
          </AnalysisButton>
        </ActionButtonsRow>
      ) : (
        <AddToGardenButton onClick={() => navigate('/analysis')}>
          آنالیز محیط
        </AddToGardenButton>
      )}

      <AddToMyGardenButton 
        onClick={handleAddToGarden}
        disabled={addingToGarden || addedToGarden}
        $added={addedToGarden}
      >
        {addingToGarden ? (
          'در حال افزودن...'
        ) : addedToGarden ? (
          <>
            <Check size={20} />
            قبلاً به باغچه اضافه شده
          </>
        ) : (
          <>
            <Plus size={20} />
            افزودن به باغچه
          </>
        )}
      </AddToMyGardenButton>

      <PlantChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        plantName={plant.name_fa}
        plantId={plant.id}
        plantContext={plant}
      />
    </ScreenContainer>
  );
};

export default PlantDetailScreen;
