import React from 'react';
import styled from 'styled-components';
import Header from '../components/Header';
import FeatureCard from '../components/FeatureCard';
import { useNavigate } from 'react-router-dom';

const ScreenContainer = styled.div`
  min-height: calc(100vh - 90px);
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

const DiagnosisScreen: React.FC = () => {
  const navigate = useNavigate();

  const handlePlantIdClick = () => {
    // Navigate to plant identify screen
    navigate('/identify');
  };

  const handleDiseaseClick = () => {
    // Navigate to disease detection (همان صفحه شناسایی)
    navigate('/identify');
  };

  const handleLightClick = () => {
    // Navigate to light meter
    console.log('Light meter clicked');
  };

  return (
    <ScreenContainer>
      <Header title="تشخیص گیاه" />
      
      <FeatureCard
        emoji="🌿"
        title="شناسایی نوع گیاه"
        description="از گل و گیاهانت عکس بگیر و نحوه نگهداری شون را یاد بگیر"
        buttonText="شناسایی گیاه"
        backgroundColor="#E8F5E8"
        onClick={handlePlantIdClick}
      />

      <FeatureCard
        emoji="🩺"
        title="شناسایی بیماری گیاه"
        description="از بیماری های گیاهانت عکس بگیر تا بتونی درمانشون کنی"
        buttonText="شناسایی بیماری"
        backgroundColor="#FFF3E0"
        onClick={handleDiseaseClick}
      />

      <FeatureCard
        emoji="☀️"
        title="سنجش نور محیط"
        description="سنسور تلفن همراه خود را در اطراف گیاه قرار دهید تا میزان نور محیط به شما نمایش داده شود"
        buttonText="سنجش نور"
        backgroundColor="#E3F2FD"
        onClick={handleLightClick}
      />
    </ScreenContainer>
  );
};

export default DiagnosisScreen;