import React from 'react';
import styled from 'styled-components';
import { Bell } from 'lucide-react';

interface PlantCardProps {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  hasReminder?: boolean;
  reminderDate?: string;
  reminderText?: string;
  onReminderClick?: () => void;
  onCardClick?: () => void;
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

const ReminderBadge = styled.div`
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-radius: 12px;
  padding: 10px 16px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 
    0 2px 8px rgba(76, 175, 80, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(76, 175, 80, 0.15);
`;

const ReminderText = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ReminderTitle = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #2e7d32;
`;

const ReminderDate = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #558b2f;
  font-weight: 500;
`;

const ReminderIcon = styled.div`
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);

  svg {
    color: #fff;
  }
`;

const PlantCard: React.FC<PlantCardProps> = ({
  name,
  scientificName,
  image,
  hasReminder,
  reminderDate,
  reminderText,
  onReminderClick,
  onCardClick,
}) => {
  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReminderClick) {
      onReminderClick();
    }
  };

  return (
    <CardContainer onClick={onCardClick}>
      <CardContent>
        <PlantImageContainer>
          <PlantImage src={image} alt={name} />
        </PlantImageContainer>
        <PlantInfo>
          <PlantName>{name}</PlantName>
          <ScientificName>{scientificName}</ScientificName>
        </PlantInfo>
        <BellButton 
          $hasNotification={hasReminder}
          onClick={handleBellClick}
        >
          <Bell size={20} />
        </BellButton>
      </CardContent>
      {hasReminder && reminderText && reminderDate && (
        <ReminderBadge>
          <ReminderIcon>
            <Bell size={16} />
          </ReminderIcon>
          <ReminderText>
            <ReminderTitle>{reminderText}</ReminderTitle>
            <ReminderDate>{reminderDate}</ReminderDate>
          </ReminderText>
        </ReminderBadge>
      )}
    </CardContainer>
  );
};

export default PlantCard;
