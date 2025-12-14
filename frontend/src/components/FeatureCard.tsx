import React from 'react';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';

const CardContainer = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #fafcff 100%);
  border-radius: 20px;
  padding: 24px;
  margin: 12px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  direction: rtl;
  border: 1px solid rgba(76, 175, 80, 0.06);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.02) 0%, rgba(129, 199, 132, 0.02) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 12px 40px rgba(76, 175, 80, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04);
    border-color: rgba(76, 175, 80, 0.12);
  }
  
  &:hover::before {
    opacity: 1;
  }
`;

const CardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  direction: rtl;
`;

const CardImage = styled.div`
  min-width: 76px;
  height: 76px;
  background: linear-gradient(135deg, #e8f5e8 0%, #f0fff0 50%, #e1f5fe 100%);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(76, 175, 80, 0.08);
  transition: all 0.3s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    bottom: 2px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%);
    border-radius: 16px;
    pointer-events: none;
  }
`;

const CardText = styled.div`
  flex: 1;
  text-align: right;
  direction: rtl;
`;

const CardTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 8px;
  font-family: 'Vazirmatn', sans-serif;
  line-height: 1.4;
`;

const CardDescription = styled.p`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 16px;
  font-family: 'Vazirmatn', sans-serif;
  font-weight: 400;
`;

const CardButton = styled.button`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #81C784 100%);
  color: white;
  border: none;
  border-radius: 14px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Vazirmatn', sans-serif;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  direction: rtl;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.6s ease;
  }
  
  &:hover {
    background: linear-gradient(135deg, #45a049 0%, #5cb85c 50%, #7cb342 100%);
    transform: translateX(3px) translateY(-2px) scale(1.02);
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  
  &:hover::before {
    left: 100%;
  }
  
  &:active {
    transform: translateX(1px) translateY(-1px) scale(1.01);
  }
`;

interface FeatureCardProps {
  emoji: string;
  title: string;
  description: string;
  buttonText: string;
  onClick?: () => void;
  backgroundColor?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  emoji,
  title,
  description,
  buttonText,
  onClick,
  backgroundColor = '#f0f8ff'
}) => {
  return (
    <CardContainer onClick={onClick}>
      <CardContent>
        <CardText>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <CardButton>
            <ArrowLeft size={16} />
            {buttonText}
          </CardButton>
        </CardText>
        <CardImage style={{ background: backgroundColor }}>
          {emoji}
        </CardImage>
      </CardContent>
    </CardContainer>
  );
};

export default FeatureCard;