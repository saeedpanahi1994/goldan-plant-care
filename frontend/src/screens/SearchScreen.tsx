import React, { useState } from 'react';
import styled from 'styled-components';
import Header from '../components/Header';
import { Search } from 'lucide-react';

const ScreenContainer = styled.div`
  min-height: calc(100vh - 90px);
  background: #f8f9fa;
  direction: rtl;
`;

const SearchContainer = styled.div`
  padding: 20px 24px;
  direction: rtl;
`;

const SearchBar = styled.div`
  position: relative;
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 16px 50px 16px 20px;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  font-size: 16px;
  background: white;
  direction: rtl;
  font-family: 'Vazirmatn', sans-serif;
  font-weight: 400;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  &:focus {
    outline: none;
    border-color: #4CAF50;
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.15);
  }
  
  &::placeholder {
    color: #9ca3af;
    font-family: 'Vazirmatn', sans-serif;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  transition: color 0.3s ease;
`;

const PlantGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  padding: 0 24px;
  direction: rtl;
`;

const PlantCard = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #f5f5f5;
  
  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: #e8f5e8;
  }
`;

const PlantImage = styled.div<{ $image: string }>`
  width: 100%;
  height: 130px;
  background: ${props => `url(${props.$image})`};
  background-size: cover;
  background-position: center;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  transition: all 0.3s ease;
`;

const PlantInfo = styled.div`
  padding: 16px;
  direction: rtl;
`;

const PlantName = styled.h4`
  font-size: 15px;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0;
  text-align: center;
  font-family: 'Vazirmatn', sans-serif;
  line-height: 1.4;
`;

const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Sample plant data - در آینده از API دریافت خواهد شد
  const plants = [
    { id: 1, name: 'گل ارکیده', emoji: '🌺', image: '' },
    { id: 2, name: 'گل داودی', emoji: '🌼', image: '' },
    { id: 3, name: 'گل رز', emoji: '🌹', image: '' },
    { id: 4, name: 'گل لاله', emoji: '🌷', image: '' },
    { id: 5, name: 'گل آفتابگردان', emoji: '🌻', image: '' },
    { id: 6, name: 'گیاه مونسترا', emoji: '🍃', image: '' },
    { id: 7, name: 'کاکتوس', emoji: '🌵', image: '' },
    { id: 8, name: 'گل بنفشه', emoji: '💜', image: '' },
    { id: 9, name: 'گیاه فیکوس', emoji: '🌿', image: '' },
    { id: 10, name: 'گل پتونیا', emoji: '🌺', image: '' },
    { id: 11, name: 'گیاه پوتوس', emoji: '🌱', image: '' },
    { id: 12, name: 'گل یاس', emoji: '🤍', image: '' }
  ];

  const filteredPlants = plants.filter(plant => 
    plant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlantClick = (plant: any) => {
    alert(`اطلاعات ${plant.name} به زودی در دسترس خواهد بود`);
  };

  return (
    <ScreenContainer>
      <Header title="جست و جوی گیاه" />
      
      <SearchContainer>
        <SearchBar>
          <SearchInput
            type="text"
            placeholder="جست و جوی گیاه ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <SearchIcon>
            <Search size={20} />
          </SearchIcon>
        </SearchBar>
      </SearchContainer>

      <PlantGrid>
        {filteredPlants.map(plant => (
          <PlantCard key={plant.id} onClick={() => handlePlantClick(plant)}>
            <PlantImage $image={plant.image}>
              {plant.emoji}
            </PlantImage>
            <PlantInfo>
              <PlantName>{plant.name}</PlantName>
            </PlantInfo>
          </PlantCard>
        ))}
      </PlantGrid>
    </ScreenContainer>
  );
};

export default SearchScreen;