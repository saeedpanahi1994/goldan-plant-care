import React from 'react';
import styled from 'styled-components';
import { User, Bell, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(76, 175, 80, 0.08);
  box-shadow: 0 2px 20px rgba(76, 175, 80, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
  direction: rtl;
`;

const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 40%, #66BB6A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-family: 'Vazirmatn', sans-serif;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(46, 125, 50, 0.1);
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  direction: ltr;
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #ffffff 0%, #f8fffe 100%);
  border: 1px solid rgba(76, 175, 80, 0.12);
  border-radius: 50%;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 2px 12px rgba(76, 175, 80, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(129, 199, 132, 0.05) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    background: linear-gradient(135deg, #ffffff 0%, #e8f5e8 100%);
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    border-color: rgba(76, 175, 80, 0.2);
  }
  
  &:hover::before {
    opacity: 1;
  }
  
  svg {
    color: #4a5568;
    transition: all 0.3s ease;
    z-index: 1;
    position: relative;
  }
  
  &:hover svg {
    color: #4CAF50;
    transform: scale(1.1);
  }
`;

const NotificationBadge = styled.div`
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background: #FF4444;
    border-radius: 50%;
    border: 2px solid white;
  }
`;

interface HeaderProps {
  title: string;
  showNotificationBadge?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, showNotificationBadge }) => {
  const navigate = useNavigate();

  return (
    <HeaderContainer>
      <Title>{title}</Title>
      
      <HeaderActions>
        <ActionButton onClick={() => navigate('/profile')}>
          <User size={18} />
        </ActionButton>
        <ActionButton>
          <NotificationBadge>
            <Bell size={18} />
          </NotificationBadge>
        </ActionButton>
        <ActionButton>
          <ShoppingCart size={18} />
        </ActionButton>
      </HeaderActions>
    </HeaderContainer>
  );
};

export default Header;