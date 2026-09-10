import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Phone, ArrowLeft, Leaf, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components
const ScreenContainer = styled.div`
  /* use dynamic viewport units to adjust when keyboard is open */
  min-height: 100dvh;
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 30%, #a5d6a7 70%, #81c784 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const BackgroundDecoration = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
`;

const FloatingLeaf = styled.div<{ $delay: number; $left: string; $size: number }>`
  position: absolute;
  top: ${props => Math.random() * 30}%;
  left: ${props => props.$left};
  animation: ${float} ${props => 4 + props.$delay}s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
  opacity: 0.15;

  svg {
    width: ${props => props.$size}px;
    height: ${props => props.$size}px;
    color: #2e7d32;
  }
`;

const Header = styled.header`
  padding: 60px 24px 40px;
  text-align: center;
  animation: ${fadeIn} 0.6s ease;
`;

const LogoContainer = styled.div`
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  box-shadow: 
    0 20px 40px rgba(76, 175, 80, 0.2),
    0 8px 16px rgba(0, 0, 0, 0.1),
    inset 0 2px 4px rgba(255, 255, 255, 0.8);
  animation: ${pulse} 3s ease-in-out infinite;
`;

const LogoEmoji = styled.span`
  font-size: 48px;
`;

const Title = styled.h1`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #1b5e20;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Subtitle = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  color: #388e3c;
  margin: 0;
  line-height: 1.6;
`;

const FormContainer = styled.div`
  flex: 1;
  background: white;
  border-radius: 32px 32px 0 0;
  padding: 32px 24px 40px;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.1);
  animation: ${fadeIn} 0.6s ease 0.2s backwards;
`;

const FormTitle = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #1b5e20;
  margin: 0 0 8px 0;
  text-align: center;
`;

const FormDescription = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #757575;
  margin: 0 0 32px 0;
  text-align: center;
  line-height: 1.6;
`;

const InputWrapper = styled.div`
  position: relative;
  margin-bottom: 24px;
`;

const InputLabel = styled.label`
  display: block;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: #4CAF50;
  }
`;

const PhoneInput = styled.input<{ $hasError: boolean }>`
  width: 100%;
  padding: 18px 20px;
  padding-right: 50px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #1b5e20;
  background: linear-gradient(135deg, #f8faf8 0%, #f0f4f0 100%);
  border: 2px solid ${props => props.$hasError ? '#f44336' : '#e0e0e0'};
  border-radius: 16px;
  outline: none;
  transition: all 0.3s ease;
  direction: ltr;
  text-align: left;
  letter-spacing: 2px;

  &:focus {
    border-color: ${props => props.$hasError ? '#f44336' : '#4CAF50'};
    box-shadow: 0 0 0 4px ${props => props.$hasError ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)'};
    background: white;
  }

  &::placeholder {
    color: #bdbdbd;
    letter-spacing: 0;
  }
`;

const PhonePrefix = styled.span`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #9e9e9e;
  display: flex;
  align-items: center;
  gap: 4px;

  &::after {
    content: '🇮🇷';
    font-size: 16px;
  }
`;

const ErrorMessage = styled.span`
  display: block;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #f44336;
  margin-top: 8px;
  padding-right: 4px;
`;

const SubmitButton = styled.button<{ $disabled: boolean; $loading: boolean }>`
  width: 100%;
  padding: 18px;
  background: ${props => props.$disabled 
    ? 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)'
    : 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #43A047 100%)'
  };
  border: none;
  border-radius: 16px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: white;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: ${props => props.$disabled 
    ? 'none'
    : '0 8px 24px rgba(76, 175, 80, 0.3)'
  };
  position: relative;
  overflow: hidden;

  ${props => props.$loading && css`
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      background-size: 200% 100%;
      animation: ${shimmer} 1.5s infinite;
    }
  `}

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(76, 175, 80, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const FeaturesContainer = styled.div`
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
`;

const FeaturesTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #9e9e9e;
  text-align: center;
  margin: 0 0 20px 0;
`;

const FeaturesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8faf8 0%, #f0f4f0 100%);
  border-radius: 12px;
`;

const FeatureIcon = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  background: ${props => props.$color};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 18px;
    height: 18px;
    color: white;
  }
`;

const FeatureText = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #616161;
  flex: 1;
`;

// Component
const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validatePhone = (value: string): boolean => {
    // حذف همه کاراکترهای غیر عددی
    const digitsOnly = value.replace(/\D/g, '');
    
    // بررسی شروع با 09 و طول 11 رقم
    if (digitsOnly.length === 0) return true; // خالی مجاز است
    if (!digitsOnly.startsWith('09')) {
      setError('شماره باید با 09 شروع شود');
      return false;
    }
    if (digitsOnly.length > 11) {
      return false;
    }
    if (digitsOnly.length === 11) {
      setError('');
      return true;
    }
    setError('');
    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // فقط اعداد
    if (value.length <= 11) {
      setPhone(value);
      validatePhone(value);
    }
  };

  const formatPhoneDisplay = (value: string): string => {
    // فرمت نمایش: 0912 345 6789
    if (value.length <= 4) return value;
    if (value.length <= 7) return `${value.slice(0, 4)} ${value.slice(4)}`;
    return `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`;
  };

  const handleSubmit = async () => {
    // اعتبارسنجی نهایی
    if (phone.length !== 11) {
      setError('لطفاً شماره تلفن 11 رقمی وارد کنید');
      return;
    }

    if (!phone.startsWith('09')) {
      setError('شماره باید با 09 شروع شود');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // ارسال به سرور
      const response = await fetch('http://188.212.99.240:4380/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        // ذخیره شماره تلفن و هدایت به صفحه OTP
        localStorage.setItem('pendingPhone', phone);
        navigate('/verify-otp');
      } else {
        setError(data.message || 'خطا در ارسال کد تایید');
      }
    } catch (err) {
      setError('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = phone.length === 11 && phone.startsWith('09') && !error;

  return (
    <ScreenContainer>
      <BackgroundDecoration>
        <FloatingLeaf $delay={0} $left="10%" $size={60}>
          <Leaf />
        </FloatingLeaf>
        <FloatingLeaf $delay={1} $left="80%" $size={40}>
          <Leaf />
        </FloatingLeaf>
        <FloatingLeaf $delay={2} $left="50%" $size={50}>
          <Leaf />
        </FloatingLeaf>
      </BackgroundDecoration>

      <Header>
        <LogoContainer>
          <LogoEmoji>🌱</LogoEmoji>
        </LogoContainer>
        <Title>گلدان</Title>
        <Subtitle>دستیار هوشمند مراقبت از گیاهان</Subtitle>
      </Header>

      <FormContainer>
        <FormTitle>ورود به حساب کاربری</FormTitle>
        <FormDescription>
          برای شروع، شماره موبایل خود را وارد کنید
        </FormDescription>

        <InputWrapper>
          <InputLabel>
            <Phone size={18} />
            شماره موبایل
          </InputLabel>
          <PhoneInput
            type="tel"
            inputMode="numeric"
            placeholder="0912 345 6789"
            value={formatPhoneDisplay(phone)}
            onChange={handlePhoneChange}
            $hasError={!!error}
            autoFocus
          />
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </InputWrapper>

        <SubmitButton
          onClick={handleSubmit}
          $disabled={!isValid || isLoading}
          $loading={isLoading}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            'در حال ارسال...'
          ) : (
            <>
              دریافت کد تایید
              <ArrowLeft size={20} />
            </>
          )}
        </SubmitButton>

        <FeaturesContainer>
          <FeaturesTitle>با ورود به گلدان می‌توانید:</FeaturesTitle>
          <FeaturesList>
            <FeatureItem>
              <FeatureIcon $color="#4CAF50">
                <Leaf />
              </FeatureIcon>
              <FeatureText>گیاهان خود را مدیریت و پیگیری کنید</FeatureText>
            </FeatureItem>
            <FeatureItem>
              <FeatureIcon $color="#FF9800">
                <Sparkles />
              </FeatureIcon>
              <FeatureText>از هوش مصنوعی برای شناسایی گیاهان استفاده کنید</FeatureText>
            </FeatureItem>
            <FeatureItem>
              <FeatureIcon $color="#2196F3">
                <Shield />
              </FeatureIcon>
              <FeatureText>اطلاعات شما امن و محفوظ خواهد بود</FeatureText>
            </FeatureItem>
          </FeaturesList>
        </FeaturesContainer>
      </FormContainer>
    </ScreenContainer>
  );
};

export default LoginScreen;
