import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { CheckCircle, XCircle, ArrowRight, RefreshCw, Home } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://188.212.99.240:4380/api';

// ===================================
// انیمیشن‌ها
// ===================================
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const bounceIn = keyframes`
  0% { opacity: 0; transform: scale(0.3); }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ===================================
// استایل‌ها
// ===================================
const ScreenContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fdf4 0%, #f8fafc 40%, #ffffff 100%);
  direction: rtl;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ResultCard = styled.div`
  background: white;
  border-radius: 24px;
  padding: 40px 24px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08);
  text-align: center;
  animation: ${fadeIn} 0.5s ease;
`;

const IconWrapper = styled.div<{ $success: boolean }>`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: ${p => p.$success ? '#e8f5e9' : '#ffebee'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  animation: ${bounceIn} 0.6s ease;
  
  svg {
    color: ${p => p.$success ? '#4CAF50' : '#F44336'};
  }
`;

const Title = styled.h1<{ $success: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: ${p => p.$success ? '#2e7d32' : '#c62828'};
  margin: 0 0 12px;
`;

const Message = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #757575;
  line-height: 2;
  margin: 0 0 24px;
`;

const InfoBox = styled.div`
  background: #f8fdf8;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid rgba(76,175,80,0.1);
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child { border-bottom: none; }
`;

const InfoLabel = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #9e9e9e;
  font-weight: 500;
`;

const InfoValue = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #212121;
  font-weight: 700;
  direction: ltr;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  background: ${p => p.$variant === 'primary' 
    ? 'linear-gradient(135deg, #4CAF50, #66BB6A)' 
    : '#f5f5f5'};
  color: ${p => p.$variant === 'primary' ? 'white' : '#616161'};
  box-shadow: ${p => p.$variant === 'primary' ? '0 4px 16px rgba(76,175,80,0.3)' : 'none'};
  
  &:active { transform: scale(0.97); }
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(76,175,80,0.1);
  border-top-color: #4CAF50;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  margin: 0 auto 20px;
`;

const LoadingText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  color: #4CAF50;
  font-weight: 600;
`;

// ===================================
// کامپوننت اصلی
// ===================================
const PaymentResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'checking'>('checking');
  const [refId, setRefId] = useState<string>('');
  const [cardPan, setCardPan] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('');

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    setLoading(true);

    // زرین‌پال این پارامترها رو به URL اضافه می‌کنه
    const authority = searchParams.get('Authority');
    const status = searchParams.get('Status');

    if (!authority) {
      setPaymentStatus('failed');
      setMessage('اطلاعات پرداخت یافت نشد.');
      setLoading(false);
      return;
    }

    try {
      // ارسال به بکند برای وریفای
      const response = await axios.post(`${API_URL}/payment/verify`, {
        authority,
        status,
      });

      if (response.data.success) {
        setPaymentStatus('success');
        setRefId(response.data.ref_id || '');
        setCardPan(response.data.card_pan || '');
        setMessage(response.data.message || 'پرداخت با موفقیت انجام شد.');
        setPaymentType(response.data.payment_type || '');
      } else {
        setPaymentStatus('failed');
        setMessage(response.data.message || 'پرداخت ناموفق بود.');
      }
    } catch (error: any) {
      setPaymentStatus('failed');
      setMessage(error?.response?.data?.message || 'خطا در بررسی وضعیت پرداخت.');
    }

    // پاک کردن authority ذخیره شده
    localStorage.removeItem('pending_payment_authority');
    setLoading(false);
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ResultCard>
          <LoadingSpinner />
          <LoadingText>در حال بررسی وضعیت پرداخت...</LoadingText>
        </ResultCard>
      </ScreenContainer>
    );
  }

  const isSuccess = paymentStatus === 'success';

  return (
    <ScreenContainer>
      <ResultCard>
        <IconWrapper $success={isSuccess}>
          {isSuccess 
            ? <CheckCircle size={44} /> 
            : <XCircle size={44} />
          }
        </IconWrapper>

        <Title $success={isSuccess}>
          {isSuccess ? 'پرداخت موفق! 🎉' : 'پرداخت ناموفق'}
        </Title>

        <Message>{message}</Message>

        {isSuccess && (refId || cardPan) && (
          <InfoBox>
            {refId && (
              <InfoRow>
                <InfoLabel>شماره تراکنش</InfoLabel>
                <InfoValue>{refId}</InfoValue>
              </InfoRow>
            )}
            {cardPan && (
              <InfoRow>
                <InfoLabel>شماره کارت</InfoLabel>
                <InfoValue>{cardPan}</InfoValue>
              </InfoRow>
            )}
          </InfoBox>
        )}

        <ButtonGroup>
          {isSuccess ? (
            <>
              <ActionButton $variant="primary" onClick={() => navigate('/')}>
                <Home size={18} />
                بازگشت به باغچه
              </ActionButton>
              <ActionButton $variant="secondary" onClick={() => navigate('/subscription')}>
                مشاهده اشتراک
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton $variant="primary" onClick={() => navigate('/subscription')}>
                <RefreshCw size={18} />
                تلاش مجدد
              </ActionButton>
              <ActionButton $variant="secondary" onClick={() => navigate('/')}>
                <Home size={18} />
                بازگشت به باغچه
              </ActionButton>
            </>
          )}
        </ButtonGroup>
      </ResultCard>
    </ScreenContainer>
  );
};

export default PaymentResultScreen;
