import React from 'react';
import styled, { keyframes } from 'styled-components';
import { 
  X, Crown, ShieldAlert, Sparkles, Zap, TrendingUp, 
  Package, ArrowLeft, Lock, Heart, Star, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://130.185.76.46:4380/api';

// ===================================
// انیمیشن‌ها
// ===================================
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-8px) rotate(-2deg); }
  75% { transform: translateY(4px) rotate(2deg); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(255, 193, 7, 0.3); }
  50% { box-shadow: 0 0 40px rgba(255, 193, 7, 0.6); }
`;

// ===================================
// استایل‌ها
// ===================================
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: ${fadeIn} 0.3s ease;
  direction: rtl;
`;

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  animation: ${slideUp} 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: relative;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.06);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  color: #757575;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
  }
`;

const HeroSection = styled.div`
  background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 50%, #FFE082 100%);
  padding: 40px 24px 32px;
  text-align: center;
  position: relative;
  overflow: hidden;
  border-radius: 24px 24px 0 0;

  &::before {
    content: '';
    position: absolute;
    top: -30%;
    left: -20%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255, 152, 0, 0.15) 0%, transparent 70%);
    border-radius: 50%;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -20%;
    right: -15%;
    width: 150px;
    height: 150px;
    background: radial-gradient(circle, rgba(255, 193, 7, 0.2) 0%, transparent 70%);
    border-radius: 50%;
  }
`;

const HeroIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  animation: ${float} 3s ease-in-out infinite;
  box-shadow: 0 8px 32px rgba(255, 152, 0, 0.35);

  svg {
    color: white;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
  }
`;

const HeroTitle = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #E65100;
  margin: 0 0 8px;
  position: relative;
`;

const HeroSubtitle = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #BF360C;
  margin: 0;
  line-height: 1.6;
  position: relative;
`;

const UsageCard = styled.div`
  margin: -16px 20px 0;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 16px;
  border: 1.5px solid #FFE082;
  box-shadow: 0 4px 16px rgba(255, 193, 7, 0.15);
  position: relative;
  z-index: 1;
`;

const UsageRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const UsageLabel = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #757575;
  font-weight: 500;
`;

const UsageValue = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #E65100;
  font-weight: 700;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #FFF3E0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #FF9800, #F44336);
  border-radius: 4px;
  width: 100%;
  transition: width 0.8s ease;
`;

const ResetInfo = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 11px;
  color: #9e9e9e;
  text-align: center;
  margin-top: 4px;
`;

const MotivationSection = styled.div`
  padding: 20px 20px 0;
`;

const MotivationCard = styled.div`
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 1px solid #A5D6A7;
`;

const MotivationIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    color: white;
  }
`;

const MotivationText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #2E7D32;
  margin: 0;
  line-height: 1.7;
  font-weight: 500;
`;

const CTASection = styled.div`
  padding: 20px;
`;

const SectionTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #424242;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SubscriptionCTA = styled.button`
  width: 100%;
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 50%, #EF6C00 100%);
  background-size: 200% auto;
  border: none;
  border-radius: 16px;
  padding: 18px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
  animation: ${glow} 2s ease-in-out infinite;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%);
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
  }

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const CTAIcon = styled.div`
  width: 46px;
  height: 46px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 1;

  svg {
    color: white;
  }
`;

const CTAContent = styled.div`
  flex: 1;
  text-align: right;
  position: relative;
  z-index: 1;
`;

const CTATitle = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 2px;
`;

const CTASubtitle = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
`;

const CTAArrow = styled.div`
  position: relative;
  z-index: 1;

  svg {
    color: rgba(255, 255, 255, 0.8);
  }
`;

const ScanPackCard = styled.button`
  width: 100%;
  background: #ffffff;
  border: 2px solid #E0E0E0;
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #4CAF50;
    background: #FAFFFE;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const PackIcon = styled.div<{ $color: string }>`
  width: 42px;
  height: 42px;
  background: ${props => props.$color};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    color: white;
  }
`;

const PackContent = styled.div`
  flex: 1;
  text-align: right;
`;

const PackTitle = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #424242;
  margin-bottom: 2px;
`;

const PackDesc = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #9e9e9e;
`;

const PackPrice = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 800;
  color: #2E7D32;
  white-space: nowrap;
`;

const SocialProof = styled.div`
  padding: 0 20px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const SocialText = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 11px;
  color: #9e9e9e;
`;

const Stars = styled.div`
  display: flex;
  gap: 2px;

  svg {
    color: #FFC107;
    fill: #FFC107;
  }
`;

const FooterNote = styled.div`
  text-align: center;
  padding: 0 20px 20px;
`;

const FooterText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 11px;
  color: #BDBDBD;
  margin: 0;
  line-height: 1.5;
`;

// ===================================
// Helper: تبدیل عدد به فارسی
// ===================================
const toPersianDigits = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, (d) => persianDigits[parseInt(d)]);
};

const formatPrice = (price: number): string => {
  return toPersianDigits(price.toLocaleString('fa-IR'));
};

// ===================================
// Props
// ===================================
interface QuotaExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageInfo: {
    used: number;
    limit: number;
    period: string;
    remaining: number;
    tier: string;
    purchasedScansRemaining?: number;
  };
  featureType?: 'disease' | 'identify' | 'chat';
}

// ===================================
// کامپوننت اصلی
// ===================================
const QuotaExhaustedModal: React.FC<QuotaExhaustedModalProps> = ({
  isOpen,
  onClose,
  usageInfo,
  featureType = 'disease',
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const featureLabels: Record<string, { title: string; icon: string; action: string }> = {
    disease: {
      title: 'تشخیص بیماری گیاه',
      icon: '🏥',
      action: 'بیماری شناسایی',
    },
    identify: {
      title: 'شناسایی گیاه',
      icon: '🌿',
      action: 'گیاه شناسایی',
    },
    chat: {
      title: 'چت هوشمند',
      icon: '💬',
      action: 'پیام ارسال',
    },
  };

  const feature = featureLabels[featureType];
  const periodLabel = usageInfo.period === 'هفتگی' ? 'این هفته' : 
                      usageInfo.period === 'ماهانه' ? 'این ماه' : 'امروز';

  const handleNavigateToSubscription = () => {
    onClose();
    navigate('/subscription');
  };

  return (
    <Overlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContainer>
        <CloseButton onClick={onClose}>
          <X size={18} />
        </CloseButton>

        {/* Hero Section */}
        <HeroSection>
          <HeroIcon>
            <ShieldAlert size={36} />
          </HeroIcon>
          <HeroTitle>سهمیه رایگان {periodLabel} استفاده شد</HeroTitle>
          <HeroSubtitle>
            شما {periodLabel} {toPersianDigits(usageInfo.used)} {feature.action} کردید
          </HeroSubtitle>
        </HeroSection>

        {/* Usage Stats */}
        <UsageCard>
          <UsageRow>
            <UsageLabel>{feature.title}</UsageLabel>
            <UsageValue>{toPersianDigits(usageInfo.used)} از {toPersianDigits(usageInfo.limit)}</UsageValue>
          </UsageRow>
          <ProgressBar>
            <ProgressFill />
          </ProgressBar>
          <ResetInfo>
            {usageInfo.period === 'هفتگی' && '⏰ سهمیه هفتگی شنبه آینده بازنشانی می‌شود'}
            {usageInfo.period === 'ماهانه' && '⏰ سهمیه ماهانه اول ماه بازنشانی می‌شود'}
            {usageInfo.period === 'روزانه' && '⏰ سهمیه روزانه فردا بازنشانی می‌شود'}
          </ResetInfo>
        </UsageCard>

        {/* Motivation */}
        <MotivationSection>
          <MotivationCard>
            <MotivationIcon>
              <Heart size={20} />
            </MotivationIcon>
            <MotivationText>
              {featureType === 'disease' 
                ? 'تشخیص به‌موقع بیماری می‌تواند گیاه شما را نجات دهد! با ارتقای حساب، همیشه مراقب سلامت گیاهانتان باشید 🌱'
                : featureType === 'identify'
                ? 'شناسایی دقیق گیاه، اولین قدم برای مراقبت صحیح است! با اشتراک، محدودیتی نداشته باشید 🔍'
                : 'گفتگو با هوش مصنوعی، بهترین راهنمای مراقبت از گیاهان شماست! 🤖'}
            </MotivationText>
          </MotivationCard>
        </MotivationSection>

        {/* CTA Section */}
        <CTASection>
          <SectionTitle>
            <Sparkles size={18} color="#FF9800" />
            راه‌حل‌های پیشنهادی
          </SectionTitle>

          {/* Subscription CTA */}
          <SubscriptionCTA onClick={handleNavigateToSubscription}>
            <CTAIcon>
              <Crown size={24} />
            </CTAIcon>
            <CTAContent>
              <CTATitle>فعال‌سازی اشتراک ویژه</CTATitle>
              <CTASubtitle>
                {featureType === 'disease' ? '۳۰ تشخیص بیماری در ماه' : 
                 featureType === 'identify' ? '۴۰ شناسایی در هفته' : '۲۰ پیام در روز'} 
                {' '}• از ماهانه {formatPrice(19000)} تومان
              </CTASubtitle>
            </CTAContent>
            <CTAArrow>
              <ChevronLeft size={20} />
            </CTAArrow>
          </SubscriptionCTA>

          {/* Scan Packages - only for disease */}
          {featureType === 'disease' && (
            <>
              <SectionTitle style={{ marginTop: 8, fontSize: 13, color: '#757575' }}>
                <Package size={16} color="#757575" />
                یا خرید بسته تشخیص بیماری
              </SectionTitle>

              <ScanPackCard onClick={handleNavigateToSubscription}>
                <PackIcon $color="linear-gradient(135deg, #66BB6A 0%, #43A047 100%)">
                  <Zap size={20} />
                </PackIcon>
                <PackContent>
                  <PackTitle>۵ تشخیص بیماری</PackTitle>
                  <PackDesc>بدون نیاز به اشتراک • بدون انقضا</PackDesc>
                </PackContent>
                <PackPrice>{formatPrice(30000)} تومان</PackPrice>
              </ScanPackCard>

              <ScanPackCard onClick={handleNavigateToSubscription}>
                <PackIcon $color="linear-gradient(135deg, #42A5F5 0%, #1E88E5 100%)">
                  <TrendingUp size={20} />
                </PackIcon>
                <PackContent>
                  <PackTitle>۱۰ تشخیص بیماری</PackTitle>
                  <PackDesc>صرفه‌جویی ۱۰,۰۰۰ تومانی! ⭐</PackDesc>
                </PackContent>
                <PackPrice>{formatPrice(50000)} تومان</PackPrice>
              </ScanPackCard>
            </>
          )}
        </CTASection>

        {/* Social Proof */}
        <SocialProof>
          <Stars>
            {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} />)}
          </Stars>
          <SocialText>بیش از ۲,۰۰۰ کاربر فعال گلدون</SocialText>
        </SocialProof>

        {/* Footer */}
        <FooterNote>
          <FooterText>
            پرداخت امن از طریق درگاه زرین‌پال • پشتیبانی ۲۴ ساعته
          </FooterText>
        </FooterNote>
      </ModalContainer>
    </Overlay>
  );
};

export default QuotaExhaustedModal;
