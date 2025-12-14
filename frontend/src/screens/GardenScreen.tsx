import React, { useState } from 'react';
import styled from 'styled-components';
import { Plus, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PlantCard from '../components/PlantCard';
import ReminderModal from '../components/ReminderModal';

const ScreenContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f9f5 0%, #e8f5e9 50%, #f1f8f4 100%);
  padding: 0 0 20px 0;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: radial-gradient(ellipse at top, rgba(76, 175, 80, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const HeaderSection = styled.div`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #43A047 100%);
  padding: 24px 20px;
  border-radius: 0 0 32px 32px;
  box-shadow: 
    0 8px 24px rgba(76, 175, 80, 0.2),
    0 4px 12px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    border-radius: 50%;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: -5%;
    width: 150px;
    height: 150px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
    border-radius: 50%;
  }
`;

const HeaderContent = styled.div`
  position: relative;
  z-index: 1;
`;

const PageTitle = styled.h1`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  letter-spacing: -0.5px;
`;

const SubTitle = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  font-weight: 500;
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
`;

const StatCard = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.1),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const StatValue = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const StatLabel = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
`;

const ContentSection = styled.div`
  padding: 24px 20px;
  position: relative;
  z-index: 1;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1b5e20;
  margin: 0;
  background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const AddButton = styled.button`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(76, 175, 80, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);

  &:hover {
    transform: scale(1.08);
    box-shadow: 
      0 6px 16px rgba(76, 175, 80, 0.4),
      inset 0 1px 2px rgba(255, 255, 255, 0.4);
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    color: #ffffff;
  }
`;

const PlantsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const EmptyIcon = styled.div`
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 8px 24px rgba(76, 175, 80, 0.15),
    inset 0 2px 4px rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;

  svg {
    color: #4CAF50;
  }
`;

const EmptyTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #2e7d32;
  margin: 0;
`;

const EmptyText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #757575;
  margin: 0;
  line-height: 1.6;
`;

const EmptyButton = styled.button`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border: none;
  padding: 14px 32px;
  border-radius: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 6px 20px rgba(76, 175, 80, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  margin-top: 8px;

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

interface Plant {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  hasReminder?: boolean;
  reminderDate?: string;
  reminderText?: string;
}

const GardenScreen: React.FC = () => {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([
    {
      id: '1',
      name: 'فیکوس لیراتا',
      scientificName: 'Ficus lyrata',
      image: 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=400&h=400&fit=crop',
      hasReminder: false,
    },
    {
      id: '2',
      name: 'گیاه هوازی تیلاندسیا',
      scientificName: 'Tillandsia',
      image: 'https://images.unsplash.com/photo-1509937528035-ad76254b0356?w=400&h=400&fit=crop',
      hasReminder: true,
      reminderText: 'یادآور آبیاری',
      reminderDate: '1404/09/18 - هر 1 روز یکبار',
    },
  ]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    plantId: string | null;
    plantName: string;
  }>({
    isOpen: false,
    plantId: null,
    plantName: '',
  });

  const handleAddPlant = () => {
    console.log('Add plant clicked');
  };

  const handleReminderClick = (plantId: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (plant) {
      setModalState({
        isOpen: true,
        plantId: plantId,
        plantName: plant.name,
      });
    }
  };

  const handleSaveReminder = (reminderType: 'watering' | 'fertilizing', interval: string, fertilizerType?: string) => {
    if (modalState.plantId) {
      const reminderText = reminderType === 'watering' 
        ? 'یادآور آبیاری' 
        : `یادآور کودهی (${fertilizerType})`;
      
      setPlants(prevPlants =>
        prevPlants.map(plant =>
          plant.id === modalState.plantId
            ? {
                ...plant,
                hasReminder: true,
                reminderText: reminderText,
                reminderDate: `۱۴۰۴/۰۹/۱۸ - ${interval}`,
              }
            : plant
        )
      );
    }
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      plantId: null,
      plantName: '',
    });
  };

  const handlePlantClick = (plantId: string) => {
    navigate(`/plant/${plantId}`);
  };

  return (
    <ScreenContainer>
      <HeaderSection>
        <HeaderContent>
          <PageTitle>باغچه ی من</PageTitle>
          <SubTitle>مجموعه گیاهان شما</SubTitle>
          <StatsContainer>
            <StatCard>
              <StatValue>{toPersianDigits(plants.length)}</StatValue>
              <StatLabel>گیاه</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{toPersianDigits(plants.filter(p => p.hasReminder).length)}</StatValue>
              <StatLabel>یادآور فعال</StatLabel>
            </StatCard>
          </StatsContainer>
        </HeaderContent>
      </HeaderSection>

      <ContentSection>
        {plants.length > 0 ? (
          <>
            <SectionHeader>
              <SectionTitle>گیاهان من</SectionTitle>
              <AddButton onClick={handleAddPlant}>
                <Plus size={22} />
              </AddButton>
            </SectionHeader>
            <PlantsList>
              {plants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  id={plant.id}
                  name={plant.name}
                  scientificName={plant.scientificName}
                  image={plant.image}
                  hasReminder={plant.hasReminder}
                  reminderDate={plant.reminderDate}
                  reminderText={plant.reminderText}
                  onReminderClick={() => handleReminderClick(plant.id)}
                  onCardClick={() => handlePlantClick(plant.id)}
                />
              ))}
            </PlantsList>
          </>
        ) : (
          <EmptyState>
            <EmptyIcon>
              <Droplets size={48} />
            </EmptyIcon>
            <EmptyTitle>باغچه شما خالی است</EmptyTitle>
            <EmptyText>
              با افزودن اولین گیاه خود، سفر مراقبت از گیاهان را آغاز کنید
            </EmptyText>
            <EmptyButton onClick={handleAddPlant}>
              <Plus size={20} />
              افزودن گیاه جدید
            </EmptyButton>
          </EmptyState>
        )}
      </ContentSection>

      <ReminderModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        plantName={modalState.plantName}
        onSave={handleSaveReminder}
      />
    </ScreenContainer>
  );
};

const toPersianDigits = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(digit => persianDigits[parseInt(digit)] || digit).join('');
};

export default GardenScreen;
