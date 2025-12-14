import React, { useState } from 'react';
import styled from 'styled-components';
import { ArrowRight, Droplets, Sun, Thermometer, Wind, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlantDetailProps {
  plantId?: string;
}

const ScreenContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f9f5 0%, #e8f5e9 50%, #f1f8f4 100%);
  padding-bottom: 100px;
`;

const Header = styled.div`
  background: #ffffff;
  padding: 16px 20px;
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

const HeaderTitle = styled.h1`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #2e7d32;
  margin: 0;
  flex: 1;
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
  background: #f5f5f5;
  margin-bottom: 16px;
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.1),
    inset 0 2px 4px rgba(0, 0, 0, 0.05);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ThumbnailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const Thumbnail = styled.div<{ $isActive?: boolean }>`
  width: 100%;
  height: 100px;
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

const DescriptionSection = styled.div`
  background: #ffffff;
  padding: 20px;
  margin-bottom: 16px;
  border-radius: 0;
`;

const DescriptionText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: #424242;
  margin: 0;
  text-align: justify;
`;

const SpecsSection = styled.div`
  background: #ffffff;
  padding: 20px;
  margin-bottom: 16px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
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

const SpecsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const SpecItem = styled.div`
  background: linear-gradient(135deg, #f5f9f5 0%, #e8f5e9 100%);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(76, 175, 80, 0.1);
`;

const SpecLabel = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #757575;
  margin-bottom: 6px;
  font-weight: 500;
`;

const SpecValue = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #2e7d32;
  font-weight: 700;
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

const AddToGardenButton = styled.button`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border: none;
  border-radius: 16px;
  padding: 16px;
  margin: 20px;
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

const PlantDetailScreen: React.FC<PlantDetailProps> = () => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    watering: false,
    light: false,
    fertilizer: false,
  });

  // Sample plant data - در آینده از API دریافت خواهد شد
  const plant = {
    name: 'گیاه هوازی تیلاندسیا',
    scientificName: 'Tillandsia',
    images: [
      'https://images.unsplash.com/photo-1509937528035-ad76254b0356?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=600&h=600&fit=crop',
    ],
    description: 'این گیاه اسطوره‌ی گیاهان هوازی است و دوست دارد زیر نور دلپذیر آفتاب آویزان باشد. این گیاه متعلق به مناطق نیمه مرطوب مرکز آمریکاست، جایی که آن روی شاخه درختان در جنگل رشد می‌کند. کثر انواع گیاه هوازی تیلاندسیا به محیط‌های مرطوب عادت کرده اند.',
    care: {
      watering: 'هر ۱۰ تا ۲۱ روز',
      humidity: '۳۰ تا ۶۰ درصد',
      light: '۳۰۰ تا ۱۰۰۰ لوکس',
      temperature: '۱۶ تا ۲۸ سلسیوس',
    },
    details: {
      watering: 'بازه دمایی ایده‌آل برای تیلاندسیا، دمایی بین ۱۶ الی ۲۷ درجه سانتی گراد است. سرمای زمستان سبب مرگ اغلب گیاهان هوازی خواهد شد، بنابراین مواظب باشید تیلاندسیا سرمای هوا را تجربه نکند.',
      light: 'تیلاندسیا به نور غیرمستقیم و روشن نیاز دارد. از قرار دادن آن در معرض نور مستقیم خورشید خودداری کنید.',
      fertilizer: 'از کود مایع رقیق شده (۱۰-۱۰-۱۰) هر ماه یکبار استفاده کنید. کود را در آب پاشیدنی حل کنید.',
    },
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <ScreenContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <ArrowRight size={20} />
        </BackButton>
        <HeaderTitle>مشخصات گیاه</HeaderTitle>
      </Header>

      <ImageSection>
        <MainImage>
          <img src={plant.images[selectedImage]} alt={plant.name} />
        </MainImage>
        <ThumbnailGrid>
          {plant.images.map((image, index) => (
            <Thumbnail
              key={index}
              $isActive={selectedImage === index}
              onClick={() => setSelectedImage(index)}
            >
              <img src={image} alt={`${plant.name} ${index + 1}`} />
            </Thumbnail>
          ))}
        </ThumbnailGrid>
      </ImageSection>

      <DescriptionSection>
        <DescriptionText>{plant.description}</DescriptionText>
      </DescriptionSection>

      <SpecsSection>
        <SectionHeader>
          <SectionIcon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </SectionIcon>
          <SectionTitle>مشخصات گیاه</SectionTitle>
        </SectionHeader>
        <SpecsGrid>
          <SpecItem>
            <SpecLabel>نام گیاه:</SpecLabel>
            <SpecValue>{plant.name}</SpecValue>
          </SpecItem>
          <SpecItem>
            <SpecLabel>نام علمی:</SpecLabel>
            <SpecValue>{plant.scientificName}</SpecValue>
          </SpecItem>
        </SpecsGrid>
      </SpecsSection>

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
              <CareValue>{plant.care.watering}</CareValue>
            </CareInfo>
          </CareCard>
          <CareCard $color="#E8F5E9">
            <CareIcon $color="linear-gradient(135deg, #66BB6A 0%, #43A047 100%)">
              <Wind size={20} />
            </CareIcon>
            <CareInfo>
              <CareLabel>رطوبت</CareLabel>
              <CareValue>{plant.care.humidity}</CareValue>
            </CareInfo>
          </CareCard>
          <CareCard $color="#FFF3E0">
            <CareIcon $color="linear-gradient(135deg, #FFA726 0%, #FB8C00 100%)">
              <Sun size={20} />
            </CareIcon>
            <CareInfo>
              <CareLabel>نور</CareLabel>
              <CareValue>{plant.care.light}</CareValue>
            </CareInfo>
          </CareCard>
          <CareCard $color="#FFEBEE">
            <CareIcon $color="linear-gradient(135deg, #EF5350 0%, #E53935 100%)">
              <Thermometer size={20} />
            </CareIcon>
            <CareInfo>
              <CareLabel>دما</CareLabel>
              <CareValue>{plant.care.temperature}</CareValue>
            </CareInfo>
          </CareCard>
        </CareGrid>
      </CareSection>

      <CollapsibleSection>
        <CollapsibleHeader 
          $isOpen={openSections.watering}
          onClick={() => toggleSection('watering')}
        >
          <CollapsibleTitle>نحوه ی آبدهی</CollapsibleTitle>
          <CollapsibleIcon $isOpen={openSections.watering}>
            {openSections.watering ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </CollapsibleIcon>
        </CollapsibleHeader>
        <CollapsibleContent $isOpen={openSections.watering}>
          <CollapsibleBody>
            <CollapsibleText>{plant.details.watering}</CollapsibleText>
          </CollapsibleBody>
        </CollapsibleContent>
      </CollapsibleSection>

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
            <CollapsibleText>{plant.details.light}</CollapsibleText>
          </CollapsibleBody>
        </CollapsibleContent>
      </CollapsibleSection>

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
            <CollapsibleText>{plant.details.fertilizer}</CollapsibleText>
          </CollapsibleBody>
        </CollapsibleContent>
      </CollapsibleSection>

      <AddToGardenButton onClick={() => navigate('/analysis')}>
        انالیز محیط
      </AddToGardenButton>
    </ScreenContainer>
  );
};

export default PlantDetailScreen;
