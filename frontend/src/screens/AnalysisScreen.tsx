import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import Header from '../components/Header';
import { Droplets, Sun, Thermometer, Wind } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ScreenContainer = styled.div`
  min-height: calc(100vh - 90px);
  background: linear-gradient(180deg, #f8fffe 0%, #f0fff4 50%, #f8f9fa 100%);
  padding-bottom: 100px;
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

const ContentSection = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PlantImageSection = styled.div`
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(46, 125, 50, 0.08);
`;

const PlantImage = styled.div`
  width: 96px;
  height: 96px;
  background: radial-gradient(circle at 30% 30%, #d7eede, #c2e1cd 60%, #b5d6c2 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  box-shadow: 0 12px 28px rgba(46, 125, 50, 0.18);
`;

const PlantInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PlantName = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #1b5e20;
  margin: 0;
`;

const PlantScientificName = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #607d8b;
  margin: 0;
`;

const Badge = styled.span`
  align-self: flex-start;
  padding: 6px 10px;
  background: rgba(76, 175, 80, 0.08);
  color: #1b5e20;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const MetricCard = styled.div<{ $color: string }>`
  background: #ffffff;
  border: 1px solid rgba(46, 125, 50, 0.08);
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  transition: all 0.25s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
  }
`;

const MetricTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MetricIcon = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, ${props => props.$color} 0%, ${props => props.$color}cc 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px ${props => props.$color}33;

  svg {
    color: #ffffff;
  }
`;

const MetricLabel = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #607d8b;
  font-weight: 700;
`;

const MetricValue = styled.div<{ $color: string }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 22px;
  color: ${props => props.$color};
  font-weight: 800;
  letter-spacing: -0.4px;
`;

const MetricSub = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #90a4ae;
`;

const MetricBar = styled.div`
  width: 100%;
  height: 6px;
  background: #f1f4f2;
  border-radius: 999px;
  overflow: hidden;
`;

const MetricBarFill = styled.div<{ $color: string; $value: number }>`
  width: ${props => Math.min(props.$value, 100)}%;
  height: 100%;
  background: linear-gradient(135deg, ${props => props.$color} 0%, ${props => props.$color}aa 100%);
  border-radius: 999px;
  box-shadow: 0 6px 14px ${props => props.$color}33;
`;

const ChartSection = styled.div`
  background: #ffffff;
  border-radius: 20px;
  padding: 20px 18px 24px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(46, 125, 50, 0.08);
`;

const ChartTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 800;
  color: #1b5e20;
  margin: 0 0 12px 0;
  text-align: right;
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 280px;
  position: relative;
  direction: ltr;
`;

const ChartSvg = styled.svg`
  width: 100%;
  height: 100%;
`;

const ChartLegend = styled.div`
  display: flex;
  justify-content: center;
  gap: 18px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LegendColor = styled.div<{ $color: string }>`
  width: 18px;
  height: 4px;
  background: ${props => props.$color};
  border-radius: 999px;
`;

const LegendText = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #546e7a;
  font-weight: 700;
`;

const blinkAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const AIRecommendationCard = styled.div`
  background: #ffffff;
  border-radius: 20px;
  padding: 20px 18px 22px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(46, 125, 50, 0.08);
`;

const AIHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const AIAvatar = styled.div`
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #e8f5e9;
  box-shadow: 0 10px 24px rgba(46, 125, 50, 0.28);
`;

const AITitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 800;
  color: #1b5e20;
  margin: 0;
`;

const AIStatus = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #607d8b;
  background: #f5f9f6;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(46, 125, 50, 0.08);
`;

const AIText = styled.p<{ $showCursor: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  line-height: 1.85;
  color: #37474f;
  margin: 0;
  text-align: justify;
  position: relative;
  
  &::after {
    content: '${props => props.$showCursor ? '|' : ''}';
    animation: ${blinkAnimation} 1s infinite;
    margin-right: 2px;
  }
`;

const AnalysisScreen: React.FC = () => {
  const navigate = useNavigate();
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const fullText = 'تحلیل خودکار: شرایط محیطی برای تیلاندسیا در محدوده ایمن قرار دارد. دما پایدار و نزدیک به ایده‌آل است، رطوبت در سطح مطلوب نگه داشته شده و شدت نور ملایم است. توصیه می‌شود جریان هوا حفظ شود و از شوک نوری مستقیم در ساعات ظهر جلوگیری کنید.';

  const metrics = [
    { label: 'دما', value: '۲۲°', sub: 'ایده‌آل: ۲۰ - ۲۴°', color: '#D32F2F', percent: 72, icon: <Thermometer size={20} /> },
    { label: 'رطوبت', value: '۶۵٪', sub: 'ایده‌آل: ۵۵ - ۷۰٪', color: '#1E88E5', percent: 80, icon: <Droplets size={20} /> },
    { label: 'نور', value: '۳۸۰ لوکس', sub: 'ایده‌آل: ۳۰۰ - ۵۰۰', color: '#FB8C00', percent: 70, icon: <Sun size={20} /> },
    { label: 'جریان هوا', value: 'متعادل', sub: 'تهویه آرام و مداوم', color: '#2E7D32', percent: 60, icon: <Wind size={20} /> },
  ];

  const chartData = {
    temperature: [18, 19, 20, 21, 22, 23, 22, 21],
    humidity: [60, 62, 64, 65, 65, 66, 67, 65],
    light: [250, 280, 320, 350, 380, 400, 370, 340],
    labels: ['۰۰:۰۰', '۰۳:۰۰', '۰۶:۰۰', '۰۹:۰۰', '۱۲:۰۰', '۱۵:۰۰', '۱۸:۰۰', '۲۱:۰۰'],
  };

  // Typewriter effect
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayedText(fullText.slice(0, index));
        index++;
      } else {
        setShowCursor(false);
        clearInterval(interval);
      }
    }, 30); // Speed of typing

    return () => clearInterval(interval);
  }, []);

  // Generate SVG chart paths and areas
  const generatePath = (data: number[], maxValue: number, height: number) => {
    const width = 100; // percentage
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value / maxValue) * height);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const generateArea = (data: number[], maxValue: number, height: number) => {
    const width = 100;
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value / maxValue) * height);
      return `${x},${y}`;
    });
    return `M 0,${height} L ${points.join(' L ')} L 100,${height} Z`;
  };

  const tempPath = generatePath(chartData.temperature, 30, 200);
  const humidityPath = generatePath(chartData.humidity, 100, 200);
  const lightPath = generatePath(chartData.light, 500, 200);

  const tempArea = generateArea(chartData.temperature, 30, 200);
  const humidityArea = generateArea(chartData.humidity, 100, 200);
  const lightArea = generateArea(chartData.light, 500, 200);

  return (
    <ScreenContainer>
      <Header title="انالیز محیط" />

      <ContentSection>
        <PlantImageSection>
          <PlantImage>🌿</PlantImage>
          <PlantInfo>
            <Badge>پایش زنده</Badge>
            <PlantName>گیاه هوازی تیلاندسیا</PlantName>
            <PlantScientificName>Tillandsia • هوشمند تنظیم می‌شود</PlantScientificName>
          </PlantInfo>
        </PlantImageSection>

        <MetricsGrid>
          {metrics.map((item) => (
            <MetricCard key={item.label} $color={item.color}>
              <MetricTop>
                <MetricIcon $color={item.color}>{item.icon}</MetricIcon>
                <div>
                  <MetricLabel>{item.label}</MetricLabel>
                  <MetricValue $color={item.color}>{item.value}</MetricValue>
                </div>
              </MetricTop>
              <MetricBar>
                <MetricBarFill $color={item.color} $value={item.percent} />
              </MetricBar>
              <MetricSub>{item.sub}</MetricSub>
            </MetricCard>
          ))}
        </MetricsGrid>

        <ChartSection>
          <ChartTitle>نمودار روند ۲۴ ساعت گذشته</ChartTitle>
          <ChartContainer>
            <ChartSvg viewBox="0 0 100 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF5350" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#EF5350" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="humidityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#42A5F5" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#42A5F5" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="lightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFA726" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#FFA726" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <g opacity="0.12">
                {[0, 25, 50, 75, 100].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y * 2}
                    x2="100"
                    y2={y * 2}
                    stroke="#1b5e20"
                    strokeWidth="0.25"
                  />
                ))}
              </g>

              {/* Areas */}
              <path d={lightArea} fill="url(#lightFill)" opacity="0.8" />
              <path d={humidityArea} fill="url(#humidityFill)" opacity="0.9" />
              <path d={tempArea} fill="url(#tempFill)" opacity="0.95" />

              {/* Light (Orange) */}
              <path
                d={lightPath}
                fill="none"
                stroke="#FFA726"
                strokeWidth="1.1"
                opacity="0.9"
              />
              {chartData.light.map((value, index) => (
                <circle
                  key={`light-${index}`}
                  cx={(index / (chartData.light.length - 1)) * 100}
                  cy={200 - ((value / 500) * 200)}
                  r="1.1"
                  fill="#FFA726"
                />
              ))}

              {/* Humidity (Blue) */}
              <path
                d={humidityPath}
                fill="none"
                stroke="#42A5F5"
                strokeWidth="1.1"
                opacity="0.9"
              />
              {chartData.humidity.map((value, index) => (
                <circle
                  key={`humidity-${index}`}
                  cx={(index / (chartData.humidity.length - 1)) * 100}
                  cy={200 - ((value / 100) * 200)}
                  r="1.1"
                  fill="#42A5F5"
                />
              ))}

              {/* Temperature (Red) */}
              <path
                d={tempPath}
                fill="none"
                stroke="#EF5350"
                strokeWidth="1.1"
                opacity="0.92"
              />
              {chartData.temperature.map((value, index) => (
                <circle
                  key={`temp-${index}`}
                  cx={(index / (chartData.temperature.length - 1)) * 100}
                  cy={200 - ((value / 30) * 200)}
                  r="1.1"
                  fill="#EF5350"
                />
              ))}

              {/* X-axis labels */}
              <g>
                {chartData.labels.map((label, index) => (
                  <text
                    key={label}
                    x={(index / (chartData.labels.length - 1)) * 100}
                    y="214"
                    fontSize="3"
                    fill="#607d8b"
                    textAnchor="middle"
                    fontFamily="Vazirmatn"
                  >
                    {label}
                  </text>
                ))}
              </g>
            </ChartSvg>
          </ChartContainer>
          <ChartLegend>
            <LegendItem>
              <LegendColor $color="#EF5350" />
              <LegendText>دما (°C)</LegendText>
            </LegendItem>
            <LegendItem>
              <LegendColor $color="#42A5F5" />
              <LegendText>رطوبت (%)</LegendText>
            </LegendItem>
            <LegendItem>
              <LegendColor $color="#FFA726" />
              <LegendText>نور (لوکس)</LegendText>
            </LegendItem>
          </ChartLegend>
        </ChartSection>

        <AIRecommendationCard>
          <AIHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AIAvatar>AI</AIAvatar>
              <AITitle>تحلیل هوشمند گیاه</AITitle>
            </div>
            <AIStatus>به‌روزرسانی: ۲ دقیقه پیش</AIStatus>
          </AIHeader>
          <AIText $showCursor={showCursor}>{displayedText}</AIText>
        </AIRecommendationCard>
      </ContentSection>
    </ScreenContainer>
  );
};

export default AnalysisScreen;
