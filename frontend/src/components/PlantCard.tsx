import React, { useState } from 'react';
import styled from 'styled-components';
import { Bell, Trash2, Droplets, Check } from 'lucide-react';

interface PlantCardProps {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  hasReminder?: boolean;
  reminderDate?: string;
  reminderText?: string;
  daysUntilWatering?: number;
  onReminderClick?: () => void;
  onCardClick?: () => void;
  onDeleteClick?: () => void;
  onWateringConfirm?: () => void;
  showDeleteButton?: boolean;
}

const CardContainer = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fdf8 100%);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 
    0 4px 20px rgba(76, 175, 80, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.03) 0%, rgba(46, 125, 50, 0.02) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 8px 30px rgba(76, 175, 80, 0.12),
      0 4px 12px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 1);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
  }
`;

const CardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
`;

const PlantImageContainer = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8f5e9 100%);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 2px 4px rgba(76, 175, 80, 0.1);
`;

const PlantImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: #e8f5e9;
`;

const PlaceholderImage = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  font-size: 40px;
`;

const PlantInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PlantName = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1b5e20;
  margin: 0;
  background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.3px;
`;

const ScientificName = styled.p`
  font-family: 'Estedad', sans-serif;
  font-size: 13px;
  color: #757575;
  margin: 0;
  font-weight: 400;
  direction: ltr;
  text-align: right;
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const BellButton = styled.button<{ $hasNotification?: boolean }>`
  background: ${props => props.$hasNotification 
    ? 'linear-gradient(135deg, #FFB74D 0%, #FFA726 100%)' 
    : 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)'};
  border: none;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$hasNotification
    ? '0 4px 12px rgba(255, 152, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)'
    : '0 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 2px rgba(255, 255, 255, 0.5)'};
  position: relative;
  flex-shrink: 0;

  &:hover {
    transform: scale(1.05);
    box-shadow: ${props => props.$hasNotification
      ? '0 6px 16px rgba(255, 152, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
      : '0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.6)'};
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    color: ${props => props.$hasNotification ? '#fff' : '#9e9e9e'};
  }

  ${props => props.$hasNotification && `
    &::after {
      content: '';
      position: absolute;
      top: 8px;
      left: 8px;
      width: 8px;
      height: 8px;
      background: #f44336;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 2px 4px rgba(244, 67, 54, 0.4);
    }
  `}
`;

const DeleteButton = styled.button`
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.15);
  flex-shrink: 0;

  &:hover {
    transform: scale(1.05);
    background: linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%);
    box-shadow: 0 4px 12px rgba(244, 67, 54, 0.25);
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    color: #c62828;
  }
`;

const WateringStatusBadge = styled.div<{ $status: 'overdue' | 'urgent' | 'today' | 'upcoming' | 'normal' }>`
  background: ${props => {
    switch (props.$status) {
      case 'overdue': return 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)';
      case 'urgent': return 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)';
      case 'today': return 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
      case 'upcoming': return 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)';
      default: return 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)';
    }
  }};
  border-radius: 12px;
  padding: 10px 16px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 
    0 2px 8px ${props => {
      switch (props.$status) {
        case 'overdue': return 'rgba(244, 67, 54, 0.15)';
        case 'urgent': return 'rgba(255, 152, 0, 0.15)';
        case 'today': return 'rgba(33, 150, 243, 0.15)';
        case 'upcoming': return 'rgba(76, 175, 80, 0.15)';
        default: return 'rgba(0, 0, 0, 0.08)';
      }
    }},
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'overdue': return 'rgba(244, 67, 54, 0.2)';
      case 'urgent': return 'rgba(255, 152, 0, 0.2)';
      case 'today': return 'rgba(33, 150, 243, 0.2)';
      case 'upcoming': return 'rgba(76, 175, 80, 0.15)';
      default: return 'rgba(0, 0, 0, 0.08)';
    }
  }};
`;

const StatusTextContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StatusTitle = styled.span<{ $status: 'overdue' | 'urgent' | 'today' | 'upcoming' | 'normal' }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: ${props => {
    switch (props.$status) {
      case 'overdue': return '#c62828';
      case 'urgent': return '#ef6c00';
      case 'today': return '#1565c0';
      case 'upcoming': return '#2e7d32';
      default: return '#616161';
    }
  }};
`;

const StatusSubtitle = styled.span<{ $status: 'overdue' | 'urgent' | 'today' | 'upcoming' | 'normal' }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: ${props => {
    switch (props.$status) {
      case 'overdue': return '#e53935';
      case 'urgent': return '#ff9800';
      case 'today': return '#42a5f5';
      case 'upcoming': return '#558b2f';
      default: return '#9e9e9e';
    }
  }};
`;

const StatusIcon = styled.div<{ $status: 'overdue' | 'urgent' | 'today' | 'upcoming' | 'normal' }>`
  width: 36px;
  height: 36px;
  background: ${props => {
    switch (props.$status) {
      case 'overdue': return 'linear-gradient(135deg, #e53935 0%, #c62828 100%)';
      case 'urgent': return 'linear-gradient(135deg, #ff9800 0%, #ef6c00 100%)';
      case 'today': return 'linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%)';
      case 'upcoming': return 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)';
      default: return 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)';
    }
  }};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px ${props => {
    switch (props.$status) {
      case 'overdue': return 'rgba(244, 67, 54, 0.3)';
      case 'urgent': return 'rgba(255, 152, 0, 0.3)';
      case 'today': return 'rgba(33, 150, 243, 0.3)';
      case 'upcoming': return 'rgba(76, 175, 80, 0.3)';
      default: return 'rgba(0, 0, 0, 0.15)';
    }
  }};

  svg {
    color: #fff;
  }
`;

const ConfirmWateringButton = styled.button<{ $status: 'overdue' | 'urgent' | 'today' | 'upcoming' | 'normal' }>`
  background: ${props => {
    switch (props.$status) {
      case 'overdue': return 'linear-gradient(135deg, #e53935 0%, #c62828 100%)';
      case 'today': return 'linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%)';
      case 'urgent': return 'linear-gradient(135deg, #ff9800 0%, #ef6c00 100%)';
      default: return 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)';
    }
  }};
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px ${props => {
    switch (props.$status) {
      case 'overdue': return 'rgba(244, 67, 54, 0.3)';
      case 'today': return 'rgba(33, 150, 243, 0.3)';
      case 'urgent': return 'rgba(255, 152, 0, 0.3)';
      default: return 'rgba(76, 175, 80, 0.3)';
    }
  }};
  flex-shrink: 0;

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 4px 12px ${props => {
      switch (props.$status) {
        case 'overdue': return 'rgba(244, 67, 54, 0.4)';
        case 'today': return 'rgba(33, 150, 243, 0.4)';
        case 'urgent': return 'rgba(255, 152, 0, 0.4)';
        default: return 'rgba(76, 175, 80, 0.4)';
      }
    }};
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    color: #fff;
  }
`;

const toPersianDigits = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return Math.abs(num).toString().split('').map(digit => persianDigits[parseInt(digit)] || digit).join('');
};

const PlantCard: React.FC<PlantCardProps> = ({
  name,
  scientificName,
  image,
  hasReminder,
  daysUntilWatering,
  onReminderClick,
  onCardClick,
  onDeleteClick,
  onWateringConfirm,
  showDeleteButton = false,
}) => {
  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReminderClick) {
      onReminderClick();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteClick) {
      onDeleteClick();
    }
  };

  const handleWateringConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWateringConfirm) {
      onWateringConfirm();
    }
  };

  // محاسبه وضعیت آبیاری
  const getWateringStatus = (): 'overdue' | 'urgent' | 'today' | 'upcoming' | 'normal' => {
    if (daysUntilWatering === undefined) return 'normal';
    if (daysUntilWatering < 0) return 'overdue';
    if (daysUntilWatering === 0) return 'today';
    if (daysUntilWatering <= 2) return 'urgent';
    return 'upcoming';
  };

  // آیا باید دکمه تایید آبیاری نمایش داده شود؟
  const shouldShowConfirmButton = (): boolean => {
    if (daysUntilWatering === undefined) return false;
    // نمایش دکمه تیک وقتی روز آبیاری است، یک روز مانده یا گذشته
    return daysUntilWatering <= 1;
  };

  // محاسبه متن وضعیت
  const getStatusText = (): { title: string; subtitle: string } => {
    if (daysUntilWatering === undefined) return { title: 'یادآور آبیاری', subtitle: 'تنظیم نشده' };
    
    if (daysUntilWatering < 0) {
      const days = Math.abs(daysUntilWatering);
      return {
        title: 'نیاز به آبیاری فوری',
        subtitle: `${toPersianDigits(days)} روز از آبیاری گذشته`
      };
    }
    
    if (daysUntilWatering === 0) {
      return {
        title: 'امروز آبیاری کنید',
        subtitle: 'روز آبیاری است'
      };
    }
    
    if (daysUntilWatering === 1) {
      return {
        title: 'فردا آبیاری کنید',
        subtitle: '۱ روز تا آبیاری'
      };
    }
    
    if (daysUntilWatering <= 2) {
      return {
        title: 'آبیاری نزدیک است',
        subtitle: `${toPersianDigits(daysUntilWatering)} روز تا آبیاری`
      };
    }
    
    return {
      title: 'یادآور آبیاری',
      subtitle: `${toPersianDigits(daysUntilWatering)} روز تا آبیاری بعدی`
    };
  };

  const status = getWateringStatus();
  const statusText = getStatusText();
  const showConfirmButton = shouldShowConfirmButton();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('❌ Image load error for:', image, 'Error:', e);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', image);
    setImageLoaded(true);
  };

  return (
    <CardContainer onClick={onCardClick}>
      <CardContent>
        <PlantImageContainer>
          {imageError ? (
            <PlaceholderImage>🌱</PlaceholderImage>
          ) : (
            <PlantImage 
              src={image} 
              alt={name} 
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          )}
        </PlantImageContainer>
        <PlantInfo>
          <PlantName>{name}</PlantName>
          <ScientificName>{scientificName}</ScientificName>
        </PlantInfo>
        <ButtonsContainer>
          {showDeleteButton && (
            <DeleteButton onClick={handleDeleteClick}>
              <Trash2 size={16} />
            </DeleteButton>
          )}
          <BellButton 
            $hasNotification={hasReminder}
            onClick={handleBellClick}
          >
            <Bell size={20} />
          </BellButton>
        </ButtonsContainer>
      </CardContent>
      {daysUntilWatering !== undefined && (
        <WateringStatusBadge $status={status}>
          <StatusIcon $status={status}>
            <Droplets size={18} />
          </StatusIcon>
          <StatusTextContainer>
            <StatusTitle $status={status}>{statusText.title}</StatusTitle>
            <StatusSubtitle $status={status}>{statusText.subtitle}</StatusSubtitle>
          </StatusTextContainer>
          {showConfirmButton && (
            <ConfirmWateringButton $status={status} onClick={handleWateringConfirm}>
              <Check size={20} />
            </ConfirmWateringButton>
          )}
        </WateringStatusBadge>
      )}
    </CardContainer>
  );
};

export default PlantCard;
