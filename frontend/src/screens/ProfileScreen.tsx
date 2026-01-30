import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { User, Settings, Info, Share2, Shield, LogOut, Phone, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Avatar = styled.div`
  width: 90px;
  height: 90px;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
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

const PhoneContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 16px;
  background: #f9fafb;
  padding: 8px 16px;
  border-radius: 12px;
  margin-top: 8px;
`;

const StatusBadge = styled.span`
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-family: 'Vazirmatn', sans-serif;

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

  &:hover svg {
    color: #d84315;
  }

  ${MenuText} {
    color: #FF5722;
  }
`;

const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleMenuClick = (menuItem: string) => {
    // Actions for specific menu items can be handled here
    if (menuItem === 'share') {
      if (navigator.share) {
        navigator.share({
          title: 'گل‌دان',
          text: 'من از اپلیکیشن گل‌دان برای مدیریت گیاهانم استفاده می‌کنم.',
          url: window.location.origin,
        }).catch(console.error);
      } else {
        alert('قابلیت اشتراک‌گذاری در مرورگر شما پشتیبانی نمی‌شود.');
      }
    } else {
      alert(`${menuItem} به زودی فعال خواهد شد`);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟')) {
      await logout();
      navigate('/login');
    }
  };

  const formatPhoneDisplay = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
  };

  return (
    <ScreenContainer>
      <Header title="پروفایل کاربری" showNotificationBadge={false} />
      
      <ProfileCard>
        <Avatar>
          <User size={40} />
        </Avatar>
        <UserName>کاربر عزیز</UserName>
        <PhoneContainer>
          <Phone size={16} />
          {user?.phone ? formatPhoneDisplay(user.phone) : '---'}
        </PhoneContainer>
      </ProfileCard>

      <MenuSection>
        <MenuItem>
          <Crown size={20} style={{ color: '#FFD700' }} />
          <MenuText>وضعیت اشتراک</MenuText>
          <StatusBadge>نسخه رایگان</StatusBadge>
        </MenuItem>

        <MenuItem onClick={() => handleMenuClick('درباره ما')}>
          <Info size={20} />
          <MenuText>درباره ما</MenuText>
          <MenuArrow>‹</MenuArrow>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuClick('share')}>
          <Share2 size={20} />
          <MenuText>اشتراک گذاری</MenuText>
          <MenuArrow>‹</MenuArrow>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuClick('حریم خصوصی و امنیت')}>
          <Shield size={20} />
          <MenuText>حریم خصوصی و امنیت</MenuText>
          <MenuArrow>‹</MenuArrow>
        </MenuItem>
      </MenuSection>

      <MenuSection>
        <LogoutButton onClick={handleLogout}>
          <LogOut size={20} />
          <MenuText>خروج از حساب کاربری</MenuText>
          <MenuArrow>‹</MenuArrow>
        </LogoutButton>
      </MenuSection>
    </ScreenContainer>
  );
};

export default ProfileScreen;