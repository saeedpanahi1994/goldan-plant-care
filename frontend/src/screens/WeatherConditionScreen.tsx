import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Header from '../components/Header';
import { Sun, Wind, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ScreenContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fffe 0%, #f0fff4 50%, #f8f9fa 100%);
  padding-bottom: 100px;
  font-family: 'Vazirmatn', sans-serif;
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

const Content = styled.div`
  padding: 20px;
`;

const TopSection = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
`;

const PlantContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const SunIcon = styled.div`
  position: absolute;
  top: 0;
  right: 20px;
  color: #ffb74d;
  animation: spin 10s linear infinite;
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const PlantImage = styled.img`
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-top: 10px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
  z-index: 2;
`;

const InfoColumn = styled.div`
  flex: 1.5;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoCard = styled.div`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  border: 1px solid rgba(76, 175, 80, 0.1);
  flex: 1;
`;

const InfoValue = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: #2e7d32;
  margin-bottom: 4px;
  display: flex;
  align-items: baseline;
  gap: 4px;
  
  span {
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }
`;

const InfoLabel = styled.div`
  font-size: 12px;
  color: #666;
  font-weight: 500;
`;

const MiddleSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
`;

const DetailCard = styled.div`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  border: 1px solid rgba(76, 175, 80, 0.1);
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #444;
  font-weight: 600;
`;

const DetailValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #2e7d32;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const UVBar = styled.div`
  width: 100%;
  height: 6px;
  background: #f0f0f0;
  border-radius: 4px;
  display: flex;
  overflow: hidden;
  margin-top: auto;
`;

const UVSegment = styled.div<{ $color: string }>`
  flex: 1;
  background-color: ${props => props.$color};
  opacity: 0.8;
`;

const ChartSection = styled.div`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  border: 1px solid rgba(76, 175, 80, 0.1);
`;

const ChartTitle = styled.h3`
  font-size: 14px;
  color: #444;
  text-align: center;
  margin: 0 0 20px 0;
  font-weight: 600;
`;

const ChartContainer = styled.div`
  height: 200px;
  width: 100%;
  position: relative;
`;

const AdviceBox = styled.div`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  border: 1px solid rgba(76, 175, 80, 0.1);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #2e7d32;
  }
`;

const AdviceText = styled.p`
  font-size: 13px;
  line-height: 1.8;
  color: #444;
  margin: 0;
  text-align: justify;
`;

const WeatherConditionScreen: React.FC = () => {
  const navigate = useNavigate();

  // Mock data
  const chartPoints = [
    { x: 0, y: 80 }, { x: 10, y: 79 }, { x: 20, y: 82 }, { x: 30, y: 80 },
    { x: 40, y: 70 }, { x: 50, y: 60 }, { x: 60, y: 52 }, { x: 70, y: 48 },
    { x: 80, y: 50 }, { x: 90, y: 58 }, { x: 100, y: 65 }, { x: 110, y: 66 },
    { x: 120, y: 64 }, { x: 130, y: 65 }, { x: 140, y: 64 }
  ];

  const generatePath = (points: {x: number, y: number}[]) => {
    const width = 100;
    const height = 100;
    const maxX = 140;
    const maxY = 100;

    const d = points.map((p, i) => {
      const x = (p.x / maxX) * width;
      const y = height - ((p.y / maxY) * height);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return d;
  };

  return (
    <ScreenContainer>
      <Header title="وضعیت آب و هوا" />

      <Content>
        <TopSection>
          <PlantContainer>
            <SunIcon>
              <Sun size={32} fill="#ffb74d" />
            </SunIcon>
            <PlantImage src="https://cdn-icons-png.flaticon.com/512/1892/1892751.png" alt="Plant" />
          </PlantContainer>
          
          <InfoColumn>
            <InfoCard>
              <InfoValue>
                ۱۰ <span>°C</span>
              </InfoValue>
              <InfoLabel>دمای هوا در منطقه شما</InfoLabel>
            </InfoCard>
            
            <InfoCard>
              <InfoValue>
                ۵۱ <span>%</span>
              </InfoValue>
              <InfoLabel>درصد رطوبت در منطقه شما</InfoLabel>
            </InfoCard>
          </InfoColumn>
        </TopSection>

        <MiddleSection>
          <DetailCard>
            <DetailHeader>
              <Sun size={18} />
              اشعه فرابنفش
            </DetailHeader>
            <DetailValue>
              ۳.۴
              <ChevronDown size={16} />
            </DetailValue>
            <UVBar>
              <UVSegment $color="#4CAF50" />
              <UVSegment $color="#FFEB3B" />
              <UVSegment $color="#FF9800" />
              <UVSegment $color="#F44336" />
              <UVSegment $color="#9C27B0" />
            </UVBar>
          </DetailCard>

          <DetailCard>
            <DetailHeader>
              <Wind size={18} />
              سرعت باد
            </DetailHeader>
            <DetailValue>
              ۷ km/h
            </DetailValue>
          </DetailCard>
        </MiddleSection>

        <ChartSection>
          <ChartTitle>پیش‌بینی نمودار دما و رطوبت امروز</ChartTitle>
          <ChartContainer>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
              <line x1="0" y1="40" x2="100" y2="40" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
              <line x1="0" y1="60" x2="100" y2="60" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
              <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
              
              {/* Y Axis Labels */}
              <text x="2" y="20" fontSize="4" fill="#999">80</text>
              <text x="2" y="40" fontSize="4" fill="#999">60</text>
              <text x="2" y="60" fontSize="4" fill="#999">40</text>
              <text x="2" y="80" fontSize="4" fill="#999">20</text>

              {/* Chart Line */}
              <path 
                d={generatePath(chartPoints)} 
                fill="none" 
                stroke="#2e7d32" 
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Green Line (Humidity maybe?) */}
              <path 
                d="M 0 95 L 20 96 L 40 92 L 60 88 L 80 90 L 100 94" 
                fill="none" 
                stroke="#81c784" 
                strokeWidth="1"
                strokeLinecap="round"
                strokeDasharray="2,2"
              />

              {/* X Axis Labels */}
              <text x="10" y="98" fontSize="3" fill="#999" textAnchor="middle">00:00</text>
              <text x="35" y="98" fontSize="3" fill="#999" textAnchor="middle">05:00</text>
              <text x="60" y="98" fontSize="3" fill="#999" textAnchor="middle">10:00</text>
              <text x="85" y="98" fontSize="3" fill="#999" textAnchor="middle">15:00</text>
            </svg>
          </ChartContainer>
        </ChartSection>

        <AdviceBox>
          <AdviceText>
            در دماهای پایین، به خصوص در فصول سرد سال مانند پاییز و زمستان، نیاز گیاهان به آبیاری کمتر می‌شود و باید دفعات آبیاری را نسبت به فصول گرم کاهش داد تا از پوسیدگی ریشه جلوگیری شود.
          </AdviceText>
        </AdviceBox>
      </Content>
    </ScreenContainer>
  );
};

export default WeatherConditionScreen;
