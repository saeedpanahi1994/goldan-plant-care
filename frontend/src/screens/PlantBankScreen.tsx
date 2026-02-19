import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Search, Leaf, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://130.185.76.46:4380/api';
const SERVER_URL = 'http://130.185.76.46:4380';

const getFullImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return 'https://via.placeholder.com/400x400?text=گیاه';
  if (imagePath.startsWith('http')) return imagePath;
  return `${SERVER_URL}${imagePath}`;
};

interface Plant {
  id: number;
  name_fa: string;
  scientific_name: string;
  main_image_url: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  light_requirement: string;
  watering_interval_days: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const ScreenContainer = styled.div`
  min-height: calc(100vh - 90px);
  background: linear-gradient(135deg, #f5f9f5 0%, #e8f5e9 50%, #f1f8f4 100%);
  padding-bottom: 80px;
`;

const HeaderSection = styled.div`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #43A047 100%);
  padding: 20px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  svg {
    color: white;
  }
`;

const HeaderTitle = styled.h1`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  flex: 1;
`;

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 48px 12px 16px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  outline: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  text-align: right;
  
  &::placeholder {
    color: #9e9e9e;
  }
  
  &:focus {
    background: #ffffff;
    box-shadow: 0 6px 16px rgba(76, 175, 80, 0.2);
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #4CAF50;
  pointer-events: none;
`;

const ContentSection = styled.div`
  padding: 20px;
`;

const PlantsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const PlantCard = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.15);
  }
`;

const PlantImageContainer = styled.div`
  width: 100%;
  padding-top: 100%;
  position: relative;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    border: 3px solid rgba(76, 175, 80, 0.2);
    border-top-color: #4CAF50;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  &.image-loaded::before {
    display: none;
  }
  
  @keyframes spin {
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;

const PlantImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
  
  &.loading {
    opacity: 0;
  }
  
  &.loaded {
    opacity: 1;
  }
`;

const PlantInfo = styled.div`
  padding: 12px;
`;

const PlantName = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #1b5e20;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PlantScientificName = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 11px;
  color: #757575;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
`;

const DifficultyBadge = styled.span<{ $level: string }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  margin-top: 8px;
  background: ${props => {
    switch (props.$level) {
      case 'easy': return 'linear-gradient(135deg, #a5d6a7 0%, #81c784 100%)';
      case 'medium': return 'linear-gradient(135deg, #ffcc80 0%, #ffb74d 100%)';
      case 'hard': return 'linear-gradient(135deg, #ef9a9a 0%, #e57373 100%)';
      default: return '#e0e0e0';
    }
  }};
  color: ${props => props.$level === 'easy' || props.$level === 'medium' || props.$level === 'hard' ? '#ffffff' : '#424242'};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  gap: 12px;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid rgba(76, 175, 80, 0.1);
  border-top-color: #4CAF50;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #4CAF50;
  font-weight: 600;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
`;

const EmptyIcon = styled.div`
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  
  svg {
    color: #4CAF50;
  }
`;

const EmptyTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1b5e20;
  margin: 0 0 8px 0;
`;

const EmptyMessage = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #757575;
  line-height: 1.6;
`;

const PlantBankScreen: React.FC = () => {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // دریافت گیاهان
  const fetchPlants = useCallback(async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      
      const endpoint = search ? '/plant-bank/search' : '/plant-bank';
      const params = {
        page,
        limit: 20,
        ...(search && { q: search })
      };
      
      const response = await axios.get(`${API_URL}${endpoint}`, { params });
      
      if (response.data.success) {
        if (page === 1) {
          setPlants(response.data.data.plants);
        } else {
          setPlants(prev => [...prev, ...response.data.data.plants]);
        }
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('خطا در دریافت گیاهان:', error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  // بارگذاری اولیه
  useEffect(() => {
    fetchPlants(1);
  }, [fetchPlants]);

  // جستجو
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        fetchPlants(1, searchTerm);
      } else {
        fetchPlants(1);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm, fetchPlants]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !pagination?.hasMore) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        fetchPlants(pagination.page + 1, searchTerm);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, pagination, searchTerm, fetchPlants]);

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'easy': return 'آسان';
      case 'medium': return 'متوسط';
      case 'hard': return 'سخت';
      default: return level;
    }
  };

  const handlePlantClick = (plantId: number) => {
    navigate(`/plant-detail/${plantId}`);
  };

  if (initialLoading) {
    return (
      <ScreenContainer>
        <LoadingContainer>
          <Spinner />
          <LoadingText>در حال بارگذاری...</LoadingText>
        </LoadingContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <HeaderSection>
        <TopBar>
          <BackButton onClick={() => navigate(-1)}>
            <ArrowRight size={24} />
          </BackButton>
          <HeaderTitle>بانک گیاهان</HeaderTitle>
        </TopBar>
        
        <SearchContainer>
          <SearchIcon size={20} />
          <SearchInput
            type="text"
            placeholder="جستجوی گیاه..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
      </HeaderSection>

      <ContentSection>
        {plants.length > 0 ? (
          <>
            <PlantsGrid>
              {plants.map((plant) => (
                <PlantCard key={plant.id} onClick={() => handlePlantClick(plant.id)}>
                  <PlantImageContainer className="image-loading">
                    <PlantImage 
                      src={getFullImageUrl(plant.main_image_url)} 
                      alt={plant.name_fa}
                      loading="lazy"
                      className="loading"
                      onLoad={(e) => {
                        e.currentTarget.classList.remove('loading');
                        e.currentTarget.classList.add('loaded');
                        e.currentTarget.parentElement?.classList.remove('image-loading');
                        e.currentTarget.parentElement?.classList.add('image-loaded');
                      }}
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x400?text=گیاه';
                        e.currentTarget.classList.remove('loading');
                        e.currentTarget.classList.add('loaded');
                        e.currentTarget.parentElement?.classList.remove('image-loading');
                        e.currentTarget.parentElement?.classList.add('image-loaded');
                      }}
                    />
                  </PlantImageContainer>
                  <PlantInfo>
                    <PlantName>{plant.name_fa}</PlantName>
                    <PlantScientificName>{plant.scientific_name}</PlantScientificName>
                    <DifficultyBadge $level={plant.difficulty_level}>
                      {getDifficultyLabel(plant.difficulty_level)}
                    </DifficultyBadge>
                  </PlantInfo>
                </PlantCard>
              ))}
            </PlantsGrid>
            
            {loading && (
              <LoadingContainer>
                <Spinner />
                <LoadingText>در حال بارگذاری...</LoadingText>
              </LoadingContainer>
            )}
          </>
        ) : (
          <EmptyState>
            <EmptyIcon>
              <Leaf size={48} />
            </EmptyIcon>
            <EmptyTitle>هیچ گیاهی یافت نشد</EmptyTitle>
            <EmptyMessage>
              {searchTerm 
                ? 'نتیجه‌ای برای جستجوی شما یافت نشد. لطفا کلمه دیگری امتحان کنید.'
                : 'در حال حاضر گیاهی در بانک موجود نیست.'}
            </EmptyMessage>
          </EmptyState>
        )}
      </ContentSection>
    </ScreenContainer>
  );
};

export default PlantBankScreen;
