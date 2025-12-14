import React from 'react';
import styled from 'styled-components';
import Header from '../components/Header';
import FeatureCard from '../components/FeatureCard';
import { useNavigate } from 'react-router-dom';

const ScreenContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fffe 0%, #f0fff4 50%, #f8f9fa 100%);
  direction: rtl;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: radial-gradient(circle at 50% 0%, rgba(76, 175, 80, 0.03) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const WelcomeSection = styled.div`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  padding: 20px 24px;
  margin: 16px 20px;
  border-radius: 16px;
  color: white;
  text-align: center;
  direction: rtl;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.25);
`;

const WelcomeTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 0;
  font-family: 'Vazirmatn', sans-serif;
  line-height: 1.3;
`;

const WelcomeSubtitle = styled.p`
  font-size: 15px;
  opacity: 0.95;
  line-height: 1.6;
  font-family: 'Vazirmatn', sans-serif;
  font-weight: 400;
`;

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleGardenClick = () => {
    navigate('/garden');
  };

  const handleRecommendationClick = () => {
    navigate('/recommendation');
  };

  const handleWeatherClick = () => {
    navigate('/weather');
  };

  return (
    <ScreenContainer>
      <Header title="گلدان" />
      
      <FeatureCard
        emoji="👨‍🌾"
        title="باغچه شما"
        description="گل و گیاه مورد علاقه ی خود را به باغچه خود اضافه کنید و برای آن تایم مراقبت و آبیاری تنظیم کنید"
        buttonText="ورود به باغچه"
        backgroundColor="#E8F5E8"
        onClick={handleGardenClick}
      />

      <FeatureCard
        emoji="🌱"
        title="پیشنهاد گل و گیاه"
        description="بر اساس شرایط محل نگهداری گیاه به شما گل و گیاه پیشنهاد میشود"
        buttonText="پیشنهاد گیاه"
        backgroundColor="#FFF3E0"
        onClick={handleRecommendationClick}
      />

      <FeatureCard
        emoji="🌤️"
        title="وضعیت نگهداری"
        description="اطلاع از دمای شهر برای نگهداری گل و گیاه"
        buttonText="آنالیز محیط"
        backgroundColor="#E3F2FD"
        onClick={handleWeatherClick}
      />
    </ScreenContainer>
  );
};

export default HomeScreen;