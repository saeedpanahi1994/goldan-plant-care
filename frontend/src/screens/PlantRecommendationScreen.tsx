import React, { useMemo, useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ChevronLeft,
  Check
} from 'lucide-react';
import axios from 'axios';
import Header from '../components/Header';

// --- Styled Components ---

const ScreenContainer = styled.div`
  min-height: calc(100vh - 90px);
  background-color: #f5f5f5;
  padding-bottom: 20px;
  font-family: 'Vazirmatn', sans-serif;
`;

const API_URL = 'http://130.185.76.46:4380/api';
const SERVER_URL = 'http://130.185.76.46:4380';

const getFullImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return 'https://via.placeholder.com/400x400?text=گیاه';
  if (imagePath.startsWith('http')) return imagePath;
  return `${SERVER_URL}${imagePath}`;
};

const BackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  color: #000;
`;

const BackRow = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
`;

const Content = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const WizardCard = styled.div`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 400px;
  position: relative;
`;

const QuestionTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin-bottom: 30px;
  line-height: 1.5;
`;

const Illustration = styled.img`
  width: 180px;
  height: 180px;
  object-fit: contain;
  margin-bottom: 30px;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.1));
`;

const OptionsContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
`;

const OptionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 8px 0;
`;

const OptionLabel = styled.span`
  font-size: 14px;
  color: #333;
  font-weight: 500;
`;

const Checkbox = styled.div<{ $checked: boolean }>`
  width: 24px;
  height: 24px;
  border: 2px solid ${props => props.$checked ? '#2e7d32' : '#9e9e9e'};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.$checked ? '#2e7d32' : 'transparent'};
  transition: all 0.2s ease;

  svg {
    color: #fff;
    width: 16px;
    height: 16px;
    opacity: ${props => props.$checked ? 1 : 0};
  }
`;

const ActionButton = styled.button`
  background-color: #2e7d32;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 12px 40px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  align-self: flex-start; /* Align to left (RTL: right) */
  transition: background-color 0.2s;
  box-shadow: 0 4px 8px rgba(46, 125, 50, 0.2);

  &:hover {
    background-color: #1b5e20;
  }
  
  &:disabled {
    background-color: #a5d6a7;
    cursor: not-allowed;
  }
`;

// --- Results Styles ---

const ResultsTitle = styled.h2`
  font-size: 15px;
  font-weight: 700;
  color: #000;
  margin-bottom: 20px;
  text-align: center;
  line-height: 1.6;
  background: #fff;
  padding: 16px;
  border-radius: 16px;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.03);
`;

const PlantList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

const PlantCard = styled.div`
  background-color: #ffffff;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
`;

const PlantInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 12px;
`;

const PlantName = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin: 0;
`;

const PlantDesc = styled.p`
  font-size: 12px;
  color: #666;
  margin: 0;
  line-height: 1.5;
`;

const PlantThumb = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 12px;
  object-fit: cover;
`;

const ArrowIcon = styled.div`
  color: #2e7d32;
  display: flex;
  align-items: center;
  margin-top: 10px;
`;

// --- Component ---

const PlantRecommendationScreen: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plants, setPlants] = useState<any[]>([]);
  const [selections, setSelections] = useState({
    location: '',
    light: '',
    climate: ''
  });

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/plant-bank`);
        if (response.data?.success) {
          setPlants(response.data.data?.plants || []);
        } else {
          setPlants([]);
        }
      } catch (error) {
        console.error('خطا در دریافت بانک گیاهان:', error);
        setPlants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlants();
  }, []);

  const handleSelect = (key: string, value: string) => {
    setSelections(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
    else navigate(-1);
  };

  const recommendedPlants = useMemo(() => {
    const lightMap: Record<string, string[]> = {
      high: ['direct', 'indirect', 'behind_curtain'],
      medium: ['indirect', 'behind_curtain'],
      low: ['low_light']
    };

    const humidityMap: Record<string, string[]> = {
      humid: ['high'],
      moderate: ['medium'],
      dry: ['low']
    };

    const lightAllowed = lightMap[selections.light] || [];
    const humidityAllowed = humidityMap[selections.climate] || [];

    const scored = (plants || []).map((plant) => {
      let score = 0;
      if (lightAllowed.length && lightAllowed.includes(plant.light_requirement)) score += 2;
      if (humidityAllowed.length && humidityAllowed.includes(plant.humidity_level)) score += 2;
      if (selections.location === 'indoor' && plant.light_requirement !== 'direct') score += 1;
      if (selections.location === 'outdoor' && plant.light_requirement === 'direct') score += 1;
      return { plant, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .map((item) => item.plant)
      .slice(0, 12);
  }, [plants, selections]);

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <WizardCard>
            <QuestionTitle>محل نگهداری گیاه را انتخاب کنید</QuestionTitle>
            <Illustration src="https://cdn-icons-png.flaticon.com/512/2942/2942544.png" alt="House" />
            <OptionsContainer>
              <OptionItem onClick={() => handleSelect('location', 'indoor')}>
                <OptionLabel>داخل منزل</OptionLabel>
                <Checkbox $checked={selections.location === 'indoor'}>
                  <Check />
                </Checkbox>
              </OptionItem>
              <OptionItem onClick={() => handleSelect('location', 'outdoor')}>
                <OptionLabel>محیط باز</OptionLabel>
                <Checkbox $checked={selections.location === 'outdoor'}>
                  <Check />
                </Checkbox>
              </OptionItem>
            </OptionsContainer>
            <ActionButton onClick={nextStep} disabled={!selections.location}>
              بعدی
            </ActionButton>
          </WizardCard>
        );
      case 2:
        return (
          <WizardCard>
            <QuestionTitle>میزان نور محل نگهداری گیاه در طول روز را مشخص کنید</QuestionTitle>
            <Illustration src="https://cdn-icons-png.flaticon.com/512/427/427735.png" alt="Light" />
            <OptionsContainer>
              <OptionItem onClick={() => handleSelect('light', 'high')}>
                <OptionLabel>کاملا نورانی</OptionLabel>
                <Checkbox $checked={selections.light === 'high'}>
                  <Check />
                </Checkbox>
              </OptionItem>
              <OptionItem onClick={() => handleSelect('light', 'medium')}>
                <OptionLabel>تا حدودی</OptionLabel>
                <Checkbox $checked={selections.light === 'medium'}>
                  <Check />
                </Checkbox>
              </OptionItem>
              <OptionItem onClick={() => handleSelect('light', 'low')}>
                <OptionLabel>کم نور</OptionLabel>
                <Checkbox $checked={selections.light === 'low'}>
                  <Check />
                </Checkbox>
              </OptionItem>
            </OptionsContainer>
            <ActionButton onClick={nextStep} disabled={!selections.light}>
              بعدی
            </ActionButton>
          </WizardCard>
        );
      case 3:
        return (
          <WizardCard>
            <QuestionTitle>آب و هوای محل زندگی خود را مشخص کنید :</QuestionTitle>
            <Illustration src="https://cdn-icons-png.flaticon.com/512/1163/1163624.png" alt="Climate" />
            <OptionsContainer>
              <OptionItem onClick={() => handleSelect('climate', 'humid')}>
                <OptionLabel>مرطوب و شرجی</OptionLabel>
                <Checkbox $checked={selections.climate === 'humid'}>
                  <Check />
                </Checkbox>
              </OptionItem>
              <OptionItem onClick={() => handleSelect('climate', 'moderate')}>
                <OptionLabel>معتدل</OptionLabel>
                <Checkbox $checked={selections.climate === 'moderate'}>
                  <Check />
                </Checkbox>
              </OptionItem>
              <OptionItem onClick={() => handleSelect('climate', 'dry')}>
                <OptionLabel>خشک</OptionLabel>
                <Checkbox $checked={selections.climate === 'dry'}>
                  <Check />
                </Checkbox>
              </OptionItem>
            </OptionsContainer>
            <ActionButton onClick={nextStep} disabled={!selections.climate}>
              بررسی
            </ActionButton>
          </WizardCard>
        );
      case 4:
        return (
          <>
            <ResultsTitle>
              با توجه به شرایط گیاهان زیر برای نگهداری به شما توصیه میشود
            </ResultsTitle>
            <PlantList>
              {loading ? (
                <PlantCard>
                  <PlantInfo>
                    <PlantName>در حال بارگذاری...</PlantName>
                    <PlantDesc>لطفاً صبر کنید</PlantDesc>
                  </PlantInfo>
                </PlantCard>
              ) : recommendedPlants.length === 0 ? (
                <PlantCard>
                  <PlantInfo>
                    <PlantName>نتیجه‌ای پیدا نشد</PlantName>
                    <PlantDesc>تنظیمات را تغییر دهید تا پیشنهادهای بیشتری ببینید.</PlantDesc>
                  </PlantInfo>
                </PlantCard>
              ) : (
                recommendedPlants.map(plant => (
                  <PlantCard key={plant.id} onClick={() => navigate(`/plant-detail/${plant.id}`)}>
                  <ArrowIcon>
                    <ChevronLeft size={24} />
                  </ArrowIcon>
                  <PlantInfo>
                    <PlantName>{plant.name_fa || plant.name}</PlantName>
                    <PlantDesc>{plant.description_fa || 'اطلاعات بیشتر در صفحه گیاه'}</PlantDesc>
                  </PlantInfo>
                  <PlantThumb src={getFullImageUrl(plant.main_image_url)} alt={plant.name_fa || plant.name} />
                </PlantCard>
                ))
              )}
            </PlantList>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <ScreenContainer>
      <Header title="پیشنهاد گیاه" />

      <Content>
        <BackRow>
          <BackButton onClick={prevStep}>
            <ArrowRight size={24} />
          </BackButton>
        </BackRow>
        {renderStepContent()}
      </Content>
    </ScreenContainer>
  );
};

export default PlantRecommendationScreen;
