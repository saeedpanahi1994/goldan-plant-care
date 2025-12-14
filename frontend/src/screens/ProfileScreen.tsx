import React from 'react';
import styled from 'styled-components';
import Header from '../components/Header';
import { User, Settings, HelpCircle, Star, Shield, LogOut } from 'lucide-react';

const ScreenContainer = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  direction: rtl;
`;

const ProfileCard = styled.div`
  background: white;
  margin: 20px 24px;
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  direction: rtl;
  border: 1px solid #f5f5f5;
`;

const Avatar = styled.div`
  width: 90px;
  height: 90px;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 36px;
  color: white;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2);
`;

const UserName = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 8px;
  font-family: 'Vazirmatn', sans-serif;
  line-height: 1.3;
`;

const UserEmail = styled.p`
  font-size: 15px;
  color: #6b7280;
  margin: 0;
  font-family: 'Vazirmatn', sans-serif;
  font-weight: 400;
`;

const MenuSection = styled.div`
  background: white;
  margin: 16px 24px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid #f5f5f5;
`;

const MenuItem = styled.button`
  width: 100%;
  padding: 20px 24px;
  border: none;
  background: white;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 1px solid #f5f5f5;
  direction: rtl;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f8fdf8;
    padding-right: 28px;
  }
  
  svg {
    color: #6b7280;
    transition: color 0.3s ease;
  }
  
  &:hover svg {
    color: #4CAF50;
  }
`;

const MenuText = styled.span`
  flex: 1;
  text-align: right;
  font-size: 16px;
  color: #2c2c2c;
  font-family: 'Vazirmatn', sans-serif;
  font-weight: 500;
  transition: color 0.3s ease;
`;

const MenuArrow = styled.span`
  color: #9ca3af;
  font-size: 18px;
  transition: all 0.3s ease;
`;

const LogoutButton = styled(MenuItem)`
  color: #FF5722;
  
  svg {
    color: #FF5722;
  }
`;

const ProfileScreen: React.FC = () => {
  const handleMenuClick = (menuItem: string) => {
    alert(`${menuItem} به زودی فعال خواهد شد`);
  };

  const handleLogout = () => {
    alert('خروج از حساب کاربری');
  };

  return (
    <ScreenContainer>
      <Header title="پروفایل" />
      
      <ProfileCard>
        <Avatar>
          <User size={32} />
        </Avatar>
        <UserName>کاربر گل دان</UserName>
        <UserEmail>user@goldan.app</UserEmail>
      </ProfileCard>

      <MenuSection>
        <MenuItem onClick={() => handleMenuClick('تنظیمات')}>
          <Settings size={20} />
          <MenuText>تنظیمات</MenuText>
          <MenuArrow>‹</MenuArrow>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuClick('امتیاز به برنامه')}>
          <Star size={20} />
          <MenuText>امتیاز به برنامه</MenuText>
          <MenuArrow>‹</MenuArrow>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuClick('راهنما و پشتیبانی')}>
          <HelpCircle size={20} />
          <MenuText>راهنما و پشتیبانی</MenuText>
          <MenuArrow>‹</MenuArrow>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuClick('حریم خصوصی')}>
          <Shield size={20} />
          <MenuText>حریم خصوصی</MenuText>
          <MenuArrow>‹</MenuArrow>
        </MenuItem>
      </MenuSection>

      <MenuSection>
        <LogoutButton onClick={handleLogout}>
          <LogOut size={20} />
          <MenuText>خروج از حساب</MenuText>
          <MenuArrow>‹</MenuArrow>
        </LogoutButton>
      </MenuSection>
    </ScreenContainer>
  );
};

export default ProfileScreen;