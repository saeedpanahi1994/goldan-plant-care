import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { ArrowRight, RefreshCw, CheckCircle, Clock, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const success = keyframes`
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
`;

// Styled Components
const ScreenContainer = styled.div`
  /* using dynamic viewport height helps avoid blank space when the keyboard appears on mobile */
  min-height: 100dvh;
  min-height: 100vh; /* fallback for browsers that don't support dvh */
  height: 100%;
  width: 100%;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 30%, #a5d6a7 70%, #81c784 100%);
  display: flex;
  flex-direction: column;
  position: relative; /* use relative positioning like login screen to avoid 100vh issues on mobile keyboards */
  overflow: hidden;
`;

const Header = styled.header`
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;

const BackButton = styled.button`
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  z-index: 10;
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 20px 24px;
  animation: ${fadeIn} 0.5s ease;
  overflow-y: auto; /* allow scroll when keyboard is open */
`;

const IconContainer = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 28px;
  box-shadow: 0 12px 32px rgba(76, 175, 80, 0.2);
  animation: ${pulse} 3s ease-in-out infinite;

  svg {
    width: 40px;
    height: 40px;
    color: #4CAF50;
  }
`;

const Title = styled.h1`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #1b5e20;
  text-align: center;
  margin: 0 0 12px 0;
`;

const PhoneDisplay = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #388e3c;
  text-align: center;
  direction: ltr;
  letter-spacing: 2px;
  margin-bottom: 8px;
`;

const Description = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #666;
  text-align: center;
  margin: 0 0 40px 0;
  line-height: 1.6;
`;

const OTPContainer = styled.div<{ $hasError: boolean }>`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 24px;
  direction: ltr;
  ${props => props.$hasError && css`animation: ${shake} 0.5s ease;`}
`;

const OTPInput = styled.input<{ $filled: boolean; $hasError: boolean }>`
  width: 50px;
  height: 60px;
  border: 2px solid ${props => props.$hasError ? '#f44336' : props.$filled ? '#4CAF50' : '#e0e0e0'};
  border-radius: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #1b5e20;
  text-align: center;
  outline: none;
  transition: all 0.3s ease;
  background: ${props => props.$filled ? 'rgba(76, 175, 80, 0.05)' : 'white'};
  direction: ltr;

  &:focus {
    border-color: #4CAF50;
    box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.1);
    transform: scale(1.05);
  }
`;

const ErrorMessage = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #f44336;
  text-align: center;
  margin: 0 0 20px 0;
`;

const TimerContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
`;

const TimerIcon = styled.div<{ $expired: boolean }>`
  width: 32px;
  height: 32px;
  background: ${props => props.$expired ? '#ffebee' : '#e8f5e9'};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 16px;
    height: 16px;
    color: ${props => props.$expired ? '#f44336' : '#4CAF50'};
  }
`;

const TimerText = styled.span<{ $expired: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: ${props => props.$expired ? '#f44336' : '#666'};
`;

const TimerValue = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #4CAF50;
  direction: ltr;
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SubmitButton = styled.button<{ $disabled: boolean; $loading: boolean; $success: boolean }>`
  width: 100%;
  padding: 18px;
  background: ${props => {
    if (props.$success) return 'linear-gradient(135deg, #66BB6A 0%, #81C784 100%)';
    if (props.$disabled) return 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)';
    return 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #43A047 100%)';
  }};
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
  box-shadow: ${props => props.$disabled ? 'none' : '0 8px 24px rgba(76, 175, 80, 0.3)'};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(76, 175, 80, 0.4);
  }

  svg {
    ${props => props.$loading && css`animation: ${spin} 1s linear infinite;`}
    ${props => props.$success && css`animation: ${success} 0.5s ease;`}
  }
`;

const ResendButton = styled.button<{ $disabled: boolean }>`
  width: 100%;
  padding: 16px;
  background: transparent;
  border: 2px solid ${props => props.$disabled ? '#e0e0e0' : '#4CAF50'};
  border-radius: 16px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$disabled ? '#9e9e9e' : '#4CAF50'};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: rgba(76, 175, 80, 0.05);
  }
`;

const InfoBox = styled.div`
  margin-top: 32px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  text-align: center;
`;

const InfoText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #757575;
  margin: 0;
  line-height: 1.8;
`;

// Component
const OTPVerifyScreen: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timer, setTimer] = useState(120); // 2 دقیقه
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phone = localStorage.getItem('pendingPhone') || '';

  // اگر شماره تلفن موجود نبود، به صفحه ورود برگرد
  useEffect(() => {
    if (!phone) {
      navigate('/login');
    }
  }, [phone, navigate]);

  // تایمر شمارش معکوس
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // فوکوس خودکار روی اولین input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneDisplay = (value: string): string => {
    if (value.length <= 4) return value;
    if (value.length <= 7) return `${value.slice(0, 4)} ${value.slice(4)}`;
    return `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    // فقط اعداد مجاز
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    
    // اگر چند رقم پیست شده
    if (value.length > 1) {
      const digits = value.slice(0, 6 - index).split('');
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newOtp[index] = value;
      setOtp(newOtp);
      
      // فوکوس به input بعدی
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    setError('');
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    
    if (code.length !== 6) {
      setError('لطفاً کد ۶ رقمی را کامل وارد کنید');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://130.185.76.46:4380/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        
        // ذخیره توکن و login
        login(data.token, data.user);
        
        // پاک کردن شماره pending
        localStorage.removeItem('pendingPhone');
        
        // انتقال به صفحه اصلی بعد از کمی تاخیر
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setError(data.message || 'کد وارد شده صحیح نیست');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('خطا در اتصال به سرور');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resendLoading) return;

    setResendLoading(true);
    setError('');

    try {
      const response = await fetch('http://130.185.76.46:4380/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        setTimer(120);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(data.message || 'خطا در ارسال مجدد کد');
      }
    } catch (err) {
      setError('خطا در اتصال به سرور');
    } finally {
      setResendLoading(false);
    }
  };

  const isComplete = otp.every(digit => digit !== '');

  return (
    <ScreenContainer>
      <Header>
        <BackButton onClick={() => navigate('/login')}>
          <ArrowRight size={22} />
        </BackButton>
      </Header>

      <ContentArea>
        <IconContainer>
          {isSuccess ? <CheckCircle /> : <Smartphone />}
        </IconContainer>

        <Title>{isSuccess ? 'ورود موفق!' : 'کد تایید را وارد کنید'}</Title>
        <PhoneDisplay>{formatPhoneDisplay(phone)}</PhoneDisplay>
        <Description>
          {isSuccess 
            ? 'در حال انتقال به صفحه اصلی...'
            : 'کد ۶ رقمی ارسال شده به شماره بالا را وارد کنید'
          }
        </Description>

        {!isSuccess && (
          <>
            <OTPContainer $hasError={!!error}>
              {otp.map((digit, index) => (
                <OTPInput
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  $filled={!!digit}
                  $hasError={!!error}
                />
              ))}
            </OTPContainer>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <TimerContainer>
              <TimerIcon $expired={timer === 0}>
                <Clock />
              </TimerIcon>
              {timer > 0 ? (
                <>
                  <TimerText $expired={false}>اعتبار کد:</TimerText>
                  <TimerValue>{formatTime(timer)}</TimerValue>
                </>
              ) : (
                <TimerText $expired={true}>کد منقضی شده است</TimerText>
              )}
            </TimerContainer>

            <ButtonsContainer>
              <SubmitButton
                onClick={handleSubmit}
                $disabled={!isComplete || isLoading}
                $loading={isLoading}
                $success={isSuccess}
                disabled={!isComplete || isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={20} />
                    در حال بررسی...
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle size={20} />
                    ورود موفق!
                  </>
                ) : (
                  'تایید و ورود'
                )}
              </SubmitButton>

              <ResendButton
                onClick={handleResend}
                $disabled={!canResend || resendLoading}
                disabled={!canResend || resendLoading}
              >
                {resendLoading ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    در حال ارسال...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    ارسال مجدد کد
                  </>
                )}
              </ResendButton>
            </ButtonsContainer>

            <InfoBox>
              <InfoText>
                کد تایید به شماره {formatPhoneDisplay(phone)} پیامک شده است.
                <br />
                اگر کد را دریافت نکردید، پس از پایان زمان، دکمه ارسال مجدد را بزنید.
              </InfoText>
            </InfoBox>
          </>
        )}
      </ContentArea>
    </ScreenContainer>
  );
};

export default OTPVerifyScreen;
