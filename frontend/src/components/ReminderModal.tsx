import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Bell, X, Droplets, Leaf, Info } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantName: string;
  defaultWateringInterval?: number; // بازه آبیاری پیش‌فرض بر اساس نوع گیاه (روز)
  defaultFertilizerInterval?: number; // بازه کوددهی پیش‌فرض (روز)
  onSave: (reminderType: 'watering' | 'fertilizing', intervalDays: number, fertilizerType?: string) => void;
}

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 8px 24px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  padding: 24px 24px 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);

  svg {
    color: #ffffff;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const ModalTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1b5e20;
  margin: 0 0 4px 0;
`;

const PlantNameBadge = styled.div`
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  display: inline-block;
  padding: 4px 12px;
  border-radius: 8px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #2e7d32;
`;

const CloseButton = styled.button`
  background: #f5f5f5;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 10px;
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
    color: #757575;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const Description = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #616161;
  line-height: 1.7;
  margin: 0 0 24px 0;
  text-align: center;
`;

const ReminderTypeSection = styled.div`
  margin-bottom: 20px;
`;

const SectionLabel = styled.label`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #2e7d32;
  display: block;
  margin-bottom: 12px;
`;

const ReminderTypeButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const ReminderTypeButton = styled.button<{ $isSelected: boolean; $type: 'watering' | 'fertilizing' }>`
  background: ${props => props.$isSelected 
    ? props.$type === 'watering' 
      ? 'linear-gradient(135deg, #42A5F5 0%, #1E88E5 100%)' 
      : 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'
    : '#ffffff'};
  border: ${props => props.$isSelected ? 'none' : '2px solid #e0e0e0'};
  border-radius: 12px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isSelected 
    ? props.$type === 'watering'
      ? '0 4px 16px rgba(66, 165, 245, 0.3)'
      : '0 4px 16px rgba(255, 152, 0, 0.3)'
    : '0 2px 8px rgba(0, 0, 0, 0.04)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$isSelected 
      ? props.$type === 'watering'
        ? '0 6px 20px rgba(66, 165, 245, 0.4)'
        : '0 6px 20px rgba(255, 152, 0, 0.4)'
      : '0 4px 12px rgba(0, 0, 0, 0.08)'};
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    color: ${props => props.$isSelected ? '#ffffff' : '#9e9e9e'};
  }
`;

const ReminderTypeText = styled.span<{ $isSelected: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$isSelected ? '#ffffff' : '#424242'};
`;

const IntervalSection = styled.div`
  margin-bottom: 20px;
`;

const DefaultIntervalInfo = styled.div`
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    color: #1976d2;
    flex-shrink: 0;
  }
`;

const DefaultIntervalText = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #1565c0;
  font-weight: 500;
`;

const FertilizerTypeSection = styled.div`
  margin-bottom: 20px;
`;

const FertilizerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`;

const FertilizerButton = styled.button<{ $isSelected: boolean }>`
  background: ${props => props.$isSelected 
    ? 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' 
    : '#ffffff'};
  border: ${props => props.$isSelected ? 'none' : '2px solid #e0e0e0'};
  border-radius: 10px;
  padding: 10px 8px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$isSelected ? '#ffffff' : '#424242'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isSelected 
    ? '0 4px 12px rgba(255, 152, 0, 0.3)'
    : '0 2px 8px rgba(0, 0, 0, 0.04)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$isSelected 
      ? '0 6px 16px rgba(255, 152, 0, 0.4)'
      : '0 4px 12px rgba(0, 0, 0, 0.08)'};
  }

  &:active {
    transform: translateY(0);
  }
`;

const IntervalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;

const IntervalButton = styled.button<{ $isSelected: boolean; $isDefault?: boolean }>`
  background: ${props => props.$isSelected 
    ? 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)' 
    : '#ffffff'};
  border: ${props => props.$isSelected 
    ? 'none' 
    : props.$isDefault 
      ? '2px solid #4CAF50'
      : '2px solid #e0e0e0'};
  border-radius: 12px;
  padding: 12px 8px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.$isSelected ? '#ffffff' : props.$isDefault ? '#4CAF50' : '#424242'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isSelected 
    ? '0 4px 12px rgba(76, 175, 80, 0.3)'
    : '0 2px 8px rgba(0, 0, 0, 0.04)'};
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$isSelected 
      ? '0 6px 16px rgba(76, 175, 80, 0.4)'
      : '0 4px 12px rgba(0, 0, 0, 0.08)'};
  }

  &:active {
    transform: translateY(0);
  }
`;

const ActionButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 12px;
`;

const DeleteButton = styled.button`
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border: none;
  border-radius: 14px;
  padding: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #c62828;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(198, 40, 40, 0.15);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(198, 40, 40, 0.25);
  }

  &:active {
    transform: translateY(0);
  }
`;

const SaveButton = styled.button`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border: none;
  border-radius: 14px;
  padding: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// تبدیل عدد به فارسی
const toPersianDigits = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(digit => persianDigits[parseInt(digit)] || digit).join('');
};

const ReminderModal: React.FC<ReminderModalProps> = ({ 
  isOpen, 
  onClose, 
  plantName, 
  defaultWateringInterval = 7,
  defaultFertilizerInterval = 30,
  onSave 
}) => {
  const [selectedType, setSelectedType] = useState<'watering' | 'fertilizing' | null>(null);
  const [selectedIntervalDays, setSelectedIntervalDays] = useState<number | null>(null);
  const [selectedFertilizerType, setSelectedFertilizerType] = useState<string>('');

  // گزینه‌های آبیاری بر اساس روز
  const wateringIntervalOptions = [
    { label: 'هر روز', days: 1 },
    { label: 'هر ۲ روز', days: 2 },
    { label: 'هر ۳ روز', days: 3 },
    { label: 'هر ۵ روز', days: 5 },
    { label: 'هر هفته', days: 7 },
    { label: 'هر ۱۰ روز', days: 10 },
    { label: 'هر ۲ هفته', days: 14 },
  ];

  // گزینه‌های کوددهی بر اساس روز
  const fertilizingIntervalOptions = [
    { label: 'هر هفته', days: 7 },
    { label: 'هر ۲ هفته', days: 14 },
    { label: 'هر ماه', days: 30 },
    { label: 'هر ۲ ماه', days: 60 },
    { label: 'هر ۳ ماه', days: 90 },
  ];

  const fertilizerTypes = ['کود ۲۰-۲۰-۲۰', 'هیومیک اسید', 'کود جلبک', 'NPK', 'کود مایع', 'کود ارگانیک'];

  const intervalOptions = selectedType === 'watering' ? wateringIntervalOptions : fertilizingIntervalOptions;
  const currentDefaultInterval = selectedType === 'watering' ? defaultWateringInterval : defaultFertilizerInterval;

  // پیدا کردن نزدیک‌ترین گزینه به interval پیش‌فرض
  const findClosestInterval = (days: number, options: { label: string; days: number }[]): number => {
    let closest = options[0].days;
    let minDiff = Math.abs(options[0].days - days);
    
    for (const option of options) {
      const diff = Math.abs(option.days - days);
      if (diff < minDiff) {
        minDiff = diff;
        closest = option.days;
      }
    }
    return closest;
  };

  // وقتی نوع یادآور تغییر می‌کند، interval پیش‌فرض را بر اساس نوع گیاه تنظیم کن
  useEffect(() => {
    if (selectedType === 'watering') {
      const closest = findClosestInterval(defaultWateringInterval, wateringIntervalOptions);
      setSelectedIntervalDays(closest);
    } else if (selectedType === 'fertilizing') {
      const closest = findClosestInterval(defaultFertilizerInterval, fertilizingIntervalOptions);
      setSelectedIntervalDays(closest);
    }
  }, [selectedType, defaultWateringInterval, defaultFertilizerInterval]);

  const handleSave = () => {
    if (selectedType === 'watering' && selectedIntervalDays) {
      onSave(selectedType, selectedIntervalDays);
      handleClose();
    } else if (selectedType === 'fertilizing' && selectedIntervalDays && selectedFertilizerType) {
      onSave(selectedType, selectedIntervalDays, selectedFertilizerType);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setSelectedIntervalDays(null);
    setSelectedFertilizerType('');
    onClose();
  };

  const handleTypeChange = (type: 'watering' | 'fertilizing') => {
    setSelectedType(type);
    setSelectedFertilizerType('');
    // interval به صورت خودکار توسط useEffect تنظیم می‌شود
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // پیدا کردن گزینه پیش‌فرض برای هایلایت کردن
  const getDefaultOptionDays = (): number => {
    if (selectedType === 'watering') {
      return findClosestInterval(defaultWateringInterval, wateringIntervalOptions);
    } else {
      return findClosestInterval(defaultFertilizerInterval, fertilizingIntervalOptions);
    }
  };

  return (
    <ModalOverlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <HeaderIcon>
            <Bell size={22} />
          </HeaderIcon>
          <HeaderContent>
            <ModalTitle>تنظیم یادآور</ModalTitle>
            <PlantNameBadge>{plantName}</PlantNameBadge>
          </HeaderContent>
          <CloseButton onClick={handleClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <Description>
            تنظیم یادآور دوره آبیاری و کوددهی
          </Description>

          <ReminderTypeSection>
            <SectionLabel>نوع یادآوری:</SectionLabel>
            <ReminderTypeButtons>
              <ReminderTypeButton
                $isSelected={selectedType === 'watering'}
                $type="watering"
                onClick={() => handleTypeChange('watering')}
              >
                <Droplets size={20} />
                <ReminderTypeText $isSelected={selectedType === 'watering'}>
                  آبیاری
                </ReminderTypeText>
              </ReminderTypeButton>
              <ReminderTypeButton
                $isSelected={selectedType === 'fertilizing'}
                $type="fertilizing"
                onClick={() => handleTypeChange('fertilizing')}
              >
                <Leaf size={20} />
                <ReminderTypeText $isSelected={selectedType === 'fertilizing'}>
                  کوددهی
                </ReminderTypeText>
              </ReminderTypeButton>
            </ReminderTypeButtons>
          </ReminderTypeSection>

          {selectedType && (
            <IntervalSection>
              <SectionLabel>
                {selectedType === 'watering' ? 'دوره‌ی آبیاری:' : 'دوره‌ی کوددهی:'}
              </SectionLabel>
              
              <DefaultIntervalInfo>
                <Info size={16} />
                <DefaultIntervalText>
                  پیشنهاد برای این گیاه: هر {toPersianDigits(currentDefaultInterval)} روز
                </DefaultIntervalText>
              </DefaultIntervalInfo>

              <IntervalGrid>
                {intervalOptions.map((option) => (
                  <IntervalButton
                    key={option.days}
                    $isSelected={selectedIntervalDays === option.days}
                    $isDefault={option.days === getDefaultOptionDays()}
                    onClick={() => setSelectedIntervalDays(option.days)}
                  >
                    {option.label}
                  </IntervalButton>
                ))}
              </IntervalGrid>
            </IntervalSection>
          )}

          {selectedType === 'fertilizing' && (
            <FertilizerTypeSection>
              <SectionLabel>نوع کود:</SectionLabel>
              <FertilizerGrid>
                {fertilizerTypes.map((type) => (
                  <FertilizerButton
                    key={type}
                    $isSelected={selectedFertilizerType === type}
                    onClick={() => setSelectedFertilizerType(type)}
                  >
                    {type}
                  </FertilizerButton>
                ))}
              </FertilizerGrid>
            </FertilizerTypeSection>
          )}

          <ActionButtons>
            <DeleteButton onClick={handleClose}>
              انصراف
            </DeleteButton>
            <SaveButton 
              onClick={handleSave}
              disabled={!selectedType || !selectedIntervalDays || (selectedType === 'fertilizing' && !selectedFertilizerType)}
            >
              ثبت یادآور
            </SaveButton>
          </ActionButtons>
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default ReminderModal;
