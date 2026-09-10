import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { 
  ArrowRight, Crown, Zap, Leaf, Camera, MessageCircle, 
  Shield, Check, Star, Sparkles, ShoppingCart, ChevronDown,
  ChevronUp, AlertCircle, Package, CreditCard, X, Droplets,
  CheckCircle, XCircle, Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Browser } from '@capacitor/browser';

const API_URL = 'http://188.212.99.240:4380/api';

// ===================================
// انیمیشن‌ها
// ===================================
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
`;

// ===================================
// استایل‌ها
// ===================================
const ScreenContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fdf4 0%, #f8fafc 40%, #ffffff 100%);
  direction: rtl;
  animation: ${fadeIn} 0.4s ease;
`;

const TopHeader = styled.div`
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 40%, #388e3c 100%);
  padding: 16px 20px 24px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 16px);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
    border-radius: 50%;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BackButton = styled.button`
  background: rgba(255,255,255,0.15);
  border: none;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  backdrop-filter: blur(10px);
  transition: all 0.2s;

  &:active { transform: scale(0.92); }
`;

const HeaderTitle = styled.h1`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: white;
  margin: 0;
  flex: 1;
`;

const CurrentPlanBadge = styled.div<{ $isPro?: boolean }>`
  background: ${p => p.$isPro 
    ? 'linear-gradient(135deg, #FFD700, #FFA000)' 
    : 'rgba(255,255,255,0.2)'};
  color: ${p => p.$isPro ? '#1b5e20' : 'white'};
  padding: 6px 14px;
  border-radius: 20px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ContentArea = styled.div`
  padding: 20px 16px 120px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

// ===================================
// سکشن: وضعیت مصرف فعلی
// ===================================
const UsageSection = styled.div`
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  border: 1px solid rgba(76,175,80,0.08);
  animation: ${fadeIn} 0.5s ease 0.1s both;
`;

const SectionTitle = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #1b5e20;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UsageGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const UsageItem = styled.div`
  background: #f8fdf8;
  border-radius: 14px;
  padding: 14px;
  border: 1px solid rgba(76,175,80,0.06);
`;

const UsageLabel = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 11px;
  color: #757575;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const UsageBar = styled.div`
  height: 6px;
  background: #e8f5e9;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
`;

const UsageFill = styled.div<{ $percent: number; $warning?: boolean }>`
  height: 100%;
  width: ${p => Math.min(100, p.$percent)}%;
  background: ${p => p.$warning 
    ? 'linear-gradient(90deg, #FF9800, #F44336)' 
    : 'linear-gradient(90deg, #4CAF50, #66BB6A)'};
  border-radius: 3px;
  transition: width 0.5s ease;
`;

const UsageNumbers = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #2e7d32;
  text-align: left;
  direction: ltr;
`;

// ===================================
// سکشن: پلن‌های اشتراک
// ===================================
const PlansSection = styled.div`
  animation: ${fadeIn} 0.5s ease 0.2s both;
`;

const PlanToggle = styled.div`
  display: flex;
  background: #e8f5e9;
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 16px;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 12px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  background: ${p => p.$active ? 'white' : 'transparent'};
  color: ${p => p.$active ? '#1b5e20' : '#757575'};
  box-shadow: ${p => p.$active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'};
  position: relative;
`;

const SaveBadge = styled.span`
  position: absolute;
  top: -6px;
  left: 8px;
  background: linear-gradient(135deg, #FF6B35, #FF9800);
  color: white;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
`;

const PlanCard = styled.div<{ $highlight?: boolean }>`
  background: ${p => p.$highlight 
    ? 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 60%, #388e3c 100%)' 
    : 'white'};
  border-radius: 24px;
  padding: 24px 20px;
  border: ${p => p.$highlight ? 'none' : '1px solid rgba(76,175,80,0.1)'};
  box-shadow: ${p => p.$highlight 
    ? '0 12px 40px rgba(27,94,32,0.25)' 
    : '0 2px 12px rgba(0,0,0,0.04)'};
  position: relative;
  overflow: hidden;
  
  ${p => p.$highlight && css`
    &::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 140px;
      height: 140px;
      background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%);
      border-radius: 50%;
      transform: translate(30%, -30%);
    }
  `}
`;

const PlanHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const PlanName = styled.div<{ $light?: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: ${p => p.$light ? 'white' : '#1b5e20'};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PlanPrice = styled.div<{ $light?: boolean }>`
  text-align: left;
  direction: ltr;
`;

const PriceAmount = styled.div<{ $light?: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 28px;
  font-weight: 900;
  color: ${p => p.$light ? 'white' : '#1b5e20'};
  line-height: 1;
`;

const PriceUnit = styled.div<{ $light?: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: ${p => p.$light ? 'rgba(255,255,255,0.7)' : '#757575'};
  margin-top: 2px;
`;

const PlanFeatures = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
`;

const FeatureRow = styled.div<{ $light?: boolean; $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: ${p => p.$disabled ? 0.5 : 1};
`;

const FeatureIcon = styled.div<{ $type: 'check' | 'cross'; $light?: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${p => p.$type === 'check' 
    ? (p.$light ? 'rgba(255,255,255,0.2)' : '#e8f5e9')
    : (p.$light ? 'rgba(255,255,255,0.1)' : '#ffebee')};
  
  svg {
    width: 13px;
    height: 13px;
    color: ${p => p.$type === 'check' 
      ? (p.$light ? 'white' : '#4CAF50')
      : (p.$light ? 'rgba(255,255,255,0.5)' : '#ef5350')};
  }
`;

const FeatureText = styled.span<{ $light?: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: ${p => p.$light ? 'rgba(255,255,255,0.9)' : '#424242'};
  font-weight: 500;
  line-height: 1.5;
`;

const BuyButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'gold' }>`
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  ${p => p.$variant === 'primary' && css`
    background: white;
    color: #1b5e20;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    
    &:active { transform: scale(0.97); }
  `}

  ${p => p.$variant === 'secondary' && css`
    background: linear-gradient(135deg, #4CAF50, #66BB6A);
    color: white;
    box-shadow: 0 4px 16px rgba(76,175,80,0.3);
    
    &:active { transform: scale(0.97); }
  `}

  ${p => p.$variant === 'gold' && css`
    background: linear-gradient(135deg, #FFD700 0%, #FFA000 50%, #FF8F00 100%);
    color: #3e2723;
    box-shadow: 0 4px 16px rgba(255,152,0,0.3);
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
    
    &:active { transform: scale(0.97); }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ===================================
// سکشن: مقایسه رایگان vs اشتراکی
// ===================================
const ComparisonSection = styled.div`
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  border: 1px solid rgba(76,175,80,0.08);
  animation: ${fadeIn} 0.5s ease 0.3s both;
`;

const ComparisonTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const ComparisonHeaderRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 80px;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 2px solid #e8f5e9;
  margin-bottom: 4px;
`;

const ComparisonHeaderCell = styled.div<{ $highlight?: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 800;
  color: ${p => p.$highlight ? '#1b5e20' : '#757575'};
  text-align: center;
  background: ${p => p.$highlight ? '#e8f5e9' : 'transparent'};
  border-radius: 8px;
  padding: 6px 4px;
`;

const ComparisonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 80px;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  align-items: center;

  &:last-child { border-bottom: none; }
`;

const ComparisonFeature = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #424242;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ComparisonValue = styled.div<{ $highlight?: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  color: ${p => p.$highlight ? '#1b5e20' : '#757575'};
  background: ${p => p.$highlight ? '#f0fdf4' : 'transparent'};
  border-radius: 8px;
  padding: 4px;
`;

// ===================================
// سکشن: خرید اسکن (Pay Per Scan)
// ===================================
const ScanSection = styled.div`
  animation: ${fadeIn} 0.5s ease 0.4s both;
`;

const ScanCard = styled.div<{ $selected?: boolean }>`
  background: white;
  border-radius: 18px;
  padding: 18px;
  border: 2px solid ${p => p.$selected ? '#FF9800' : 'rgba(76,175,80,0.08)'};
  box-shadow: ${p => p.$selected 
    ? '0 4px 16px rgba(255,152,0,0.15)' 
    : '0 2px 8px rgba(0,0,0,0.03)'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.3s;
  
  &:active { transform: scale(0.98); }
`;

const ScanInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ScanIcon = styled.div<{ $variant: 'small' | 'large' }>`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${p => p.$variant === 'large' 
    ? 'linear-gradient(135deg, #FF9800, #FF6B35)' 
    : 'linear-gradient(135deg, #66BB6A, #4CAF50)'};
  
  svg { color: white; }
`;

const ScanDetails = styled.div``;

const ScanTitle = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #212121;
`;

const ScanSubtitle = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #757575;
  margin-top: 2px;
`;

const ScanPrice = styled.div`
  text-align: left;
  direction: ltr;
`;

const ScanPriceAmount = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 900;
  color: #FF6B35;
`;

const ScanPriceUnit = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 10px;
  color: #9e9e9e;
`;

const ScanRadio = styled.div<{ $selected: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid ${p => p.$selected ? '#FF9800' : '#ccc'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  flex-shrink: 0;
  
  &::after {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${p => p.$selected ? '#FF9800' : 'transparent'};
    transition: background 0.2s;
  }
`;

// ===================================
// مودال تأیید خرید
// ===================================
const ModalOverlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: ${p => p.$visible ? 1 : 0};
  pointer-events: ${p => p.$visible ? 'auto' : 'none'};
  transition: opacity 0.3s;
`;

const ModalContent = styled.div<{ $visible: boolean }>`
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 24px 20px 40px;
  width: 100%;
  max-width: 500px;
  transform: translateY(${p => p.$visible ? '0' : '100%'});
  transition: transform 0.3s ease;
`;

const ModalHandle = styled.div`
  width: 40px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin: 0 auto 20px;
`;

const ModalTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #1b5e20;
  margin: 0 0 8px;
  text-align: center;
`;

const ModalDescription = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #757575;
  margin: 0 0 24px;
  text-align: center;
  line-height: 1.6;
`;

const ModalPriceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fdf8;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid rgba(76,175,80,0.1);
`;

const ModalPriceLabel = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #424242;
  font-weight: 600;
`;

const ModalPriceValue = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 20px;
  font-weight: 900;
  color: #1b5e20;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 10px;
`;

const ModalButton = styled.button<{ $variant: 'confirm' | 'cancel' }>`
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  ${p => p.$variant === 'confirm' && css`
    background: linear-gradient(135deg, #4CAF50, #66BB6A);
    color: white;
    box-shadow: 0 4px 12px rgba(76,175,80,0.3);
  `}

  ${p => p.$variant === 'cancel' && css`
    background: #f5f5f5;
    color: #757575;
  `}

  &:active { transform: scale(0.97); }
`;

// ===================================
// کامپوننت اصلی
// ===================================

interface UsageData {
  plants: { used: number; limit: number };
  identify: { used: number; limit: number; period: string };
  identifyPro: { used: number; limit: number; period: string };
  disease: { used: number; limit: number; period: string; purchasedRemaining: number };
  chat: { used: number; limit: number; period: string };
}

interface SubscriptionData {
  tier: 'free' | 'subscriber';
  plan: { type: string; expiresAt: string; startedAt: string } | null;
}

const toPersianDigits = (num: number): string => {
  return num.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
};

const formatPrice = (price: number): string => {
  return toPersianDigits(Math.floor(price / 1000));
};

const SubscriptionScreen: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedScanPack, setSelectedScanPack] = useState<'5_scans' | '10_scans' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'subscribe' | 'scan'>('subscribe');
  const [purchasing, setPurchasing] = useState(false);
  
  // وضعیت نتیجه پرداخت (نمایش داخل اپ)
  const [paymentResult, setPaymentResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    refId?: string;
    checking: boolean;
  }>({ show: false, success: false, message: '', checking: false });

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSubscription(response.data.subscription);
        setUsage(response.data.usage);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    
    // بررسی پرداخت معلق هنگام بازگشت به صفحه
    const authority = localStorage.getItem('pending_payment_authority');
    if (authority) {
      checkPendingPayment();
    }
  }, [fetchStatus]);

  const handleSubscribe = () => {
    setModalType('subscribe');
    setShowModal(true);
  };

  const handleBuyScanPack = () => {
    if (!selectedScanPack) return;
    setModalType('scan');
    setShowModal(true);
  };

  const handleConfirmPurchase = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    setPurchasing(true);
    try {
      // درخواست پرداخت از طریق زرین‌پال
      const requestBody: any = {
        payment_type: modalType === 'subscribe' ? 'subscription' : 'scan_package',
      };

      if (modalType === 'subscribe') {
        requestBody.plan_type = selectedPlan;
      } else {
        requestBody.package_type = selectedScanPack;
      }

      const response = await axios.post(`${API_URL}/payment/request`, requestBody, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.payment_url) {
        // ذخیره authority برای بررسی بعدی
        localStorage.setItem('pending_payment_authority', response.data.authority);
        
        setShowModal(false);

        // باز کردن درگاه پرداخت در مرورگر درون‌برنامه‌ای
        const listener = await Browser.addListener('browserFinished', async () => {
          // وقتی کاربر مرورگر رو بست، وضعیت پرداخت رو چک کن
          listener.remove();
          await checkPendingPayment();
        });

        await Browser.open({ 
          url: response.data.payment_url,
          presentationStyle: 'popover',
        });
      } else {
        alert('خطا در ایجاد لینک پرداخت. لطفاً دوباره تلاش کنید.');
      }
    } catch (error: any) {
      console.error('Payment request error:', error);
      const message = error?.response?.data?.message || 'خطا در ارتباط با درگاه پرداخت. لطفاً دوباره تلاش کنید.';
      alert(message);
    } finally {
      setPurchasing(false);
    }
  };

  // بررسی وضعیت پرداخت معلق بعد از بسته شدن مرورگر
  const checkPendingPayment = async () => {
    const authority = localStorage.getItem('pending_payment_authority');
    if (!authority) return;

    setPaymentResult({ show: true, success: false, message: '', checking: true });

    // کمی صبر کن تا صفحه وریفای زرین‌پال فرصت اجرا داشته باشد
    await new Promise(resolve => setTimeout(resolve, 2000));

    const token = localStorage.getItem('authToken');
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        // GET /check/:authority خودکار وریفای هم انجام می‌دهد
        const response = await axios.get(`${API_URL}/payment/check/${authority}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          const payment = response.data.payment;
          if (payment.status === 'verified') {
            setPaymentResult({
              show: true,
              success: true,
              message: payment.payment_type === 'subscription' 
                ? 'اشتراک شما با موفقیت فعال شد! 🎉' 
                : 'پکیج تشخیص بیماری با موفقیت خریداری شد! 🎉',
              refId: payment.ref_id,
              checking: false,
            });
            // بازخوانی وضعیت اشتراک
            fetchStatus();
            localStorage.removeItem('pending_payment_authority');
            return;
          } else if (payment.status === 'failed') {
            setPaymentResult({
              show: true,
              success: false,
              message: 'پرداخت ناموفق بود. در صورت کسر مبلغ، ظرف ۷۲ ساعت به حسابتان برگشت داده می‌شود.',
              checking: false,
            });
            localStorage.removeItem('pending_payment_authority');
            return;
          } else if (payment.status === 'pending' && attempts < maxAttempts) {
            // هنوز pending - صبر کن و دوباره تلاش کن
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          } else {
            // آخرین تلاش هم pending بود
            setPaymentResult({
              show: true,
              success: false,
              message: 'پرداخت انجام نشد یا لغو شد.',
              checking: false,
            });
            localStorage.removeItem('pending_payment_authority');
            return;
          }
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          setPaymentResult({
            show: true,
            success: false,
            message: 'خطا در بررسی وضعیت پرداخت.',
            checking: false,
          });
          localStorage.removeItem('pending_payment_authority');
          return;
        }
        // تلاش مجدد
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  const isPro = subscription?.tier === 'subscriber';

  const getUsagePercent = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return (used / limit) * 100;
  };

  const getPlanPrice = () => {
    return selectedPlan === 'monthly' ? 49000 : 499000;
  };

  const getScanPackPrice = () => {
    return selectedScanPack === '5_scans' ? 30000 : 50000;
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'daily': return 'روزانه';
      case 'weekly': return 'هفتگی';
      case 'monthly': return 'ماهانه';
      default: return period;
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <TopHeader>
          <HeaderRow>
            <BackButton onClick={() => navigate(-1)}>
              <ArrowRight size={20} />
            </BackButton>
            <HeaderTitle>اشتراک و خرید</HeaderTitle>
          </HeaderRow>
        </TopHeader>
        <ContentArea>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ 
              width: 50, height: 50, margin: '0 auto 16px',
              border: '4px solid rgba(76,175,80,0.1)', borderTopColor: '#4CAF50',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontFamily: 'Vazirmatn', color: '#4CAF50', fontWeight: 600 }}>
              در حال بارگذاری...
            </p>
          </div>
        </ContentArea>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <TopHeader>
        <HeaderRow>
          <BackButton onClick={() => navigate(-1)}>
            <ArrowRight size={20} />
          </BackButton>
          <HeaderTitle>اشتراک و خرید</HeaderTitle>
          <CurrentPlanBadge $isPro={isPro}>
            {isPro ? <Crown size={14} /> : <Leaf size={14} />}
            {isPro ? 'اشتراکی' : 'رایگان'}
          </CurrentPlanBadge>
        </HeaderRow>
      </TopHeader>

      <ContentArea>
        {/* وضعیت مصرف */}
        {usage && (
          <UsageSection>
            <SectionTitle>
              <AlertCircle size={18} color="#FF9800" />
              وضعیت مصرف شما
            </SectionTitle>
            <UsageGrid>
              <UsageItem>
                <UsageLabel><Leaf size={12} color="#4CAF50" /> گیاهان باغچه</UsageLabel>
                <UsageBar>
                  <UsageFill 
                    $percent={getUsagePercent(usage.plants.used, usage.plants.limit)}
                    $warning={usage.plants.used >= usage.plants.limit}
                  />
                </UsageBar>
                <UsageNumbers>
                  {toPersianDigits(usage.plants.used)} / {toPersianDigits(usage.plants.limit)}
                </UsageNumbers>
              </UsageItem>

              <UsageItem>
                <UsageLabel><Camera size={12} color="#2196F3" /> شناسایی ({getPeriodLabel(usage.identify.period)})</UsageLabel>
                <UsageBar>
                  <UsageFill 
                    $percent={getUsagePercent(usage.identify.used, usage.identify.limit)}
                    $warning={usage.identify.used >= usage.identify.limit * 0.8}
                  />
                </UsageBar>
                <UsageNumbers>
                  {toPersianDigits(usage.identify.used)} / {toPersianDigits(usage.identify.limit)}
                </UsageNumbers>
              </UsageItem>

              <UsageItem>
                <UsageLabel><Shield size={12} color="#F44336" /> تشخیص بیماری ({getPeriodLabel(usage.disease.period)})</UsageLabel>
                <UsageBar>
                  <UsageFill 
                    $percent={getUsagePercent(usage.disease.used, usage.disease.limit)}
                    $warning={usage.disease.used >= usage.disease.limit}
                  />
                </UsageBar>
                <UsageNumbers>
                  {toPersianDigits(usage.disease.used)} / {toPersianDigits(usage.disease.limit)}
                  {usage.disease.purchasedRemaining > 0 && (
                    <span style={{ color: '#FF9800', fontSize: 11 }}>
                      {' '}+{toPersianDigits(usage.disease.purchasedRemaining)}
                    </span>
                  )}
                </UsageNumbers>
              </UsageItem>

              <UsageItem>
                <UsageLabel><MessageCircle size={12} color="#9C27B0" /> چت هوشمند ({getPeriodLabel(usage.chat.period)})</UsageLabel>
                <UsageBar>
                  <UsageFill 
                    $percent={getUsagePercent(usage.chat.used, usage.chat.limit)}
                    $warning={usage.chat.used >= usage.chat.limit * 0.8}
                  />
                </UsageBar>
                <UsageNumbers>
                  {toPersianDigits(usage.chat.used)} / {toPersianDigits(usage.chat.limit)}
                </UsageNumbers>
              </UsageItem>
            </UsageGrid>
          </UsageSection>
        )}

        {/* پلن اشتراکی */}
        <PlansSection>
          <SectionTitle>
            <Crown size={18} color="#FFD700" />
            اشتراک ویژه گل‌دان
          </SectionTitle>

          <PlanToggle>
            <ToggleButton 
              $active={selectedPlan === 'monthly'} 
              onClick={() => setSelectedPlan('monthly')}
            >
              ماهانه
            </ToggleButton>
            <ToggleButton 
              $active={selectedPlan === 'yearly'} 
              onClick={() => setSelectedPlan('yearly')}
            >
              سالیانه
              {selectedPlan !== 'yearly' && <SaveBadge>۴۰٪ تخفیف</SaveBadge>}
            </ToggleButton>
          </PlanToggle>

          <PlanCard $highlight={true}>
            <PlanHeader>
              <PlanName $light>
                <Crown size={22} />
                {selectedPlan === 'monthly' ? 'اشتراک ماهانه' : 'اشتراک سالیانه'}
              </PlanName>
              <PlanPrice $light>
                <PriceAmount $light>
                  {formatPrice(getPlanPrice())}
                </PriceAmount>
                <PriceUnit $light>
                  هزار تومان / {selectedPlan === 'monthly' ? 'ماه' : 'سال'}
                </PriceUnit>
              </PlanPrice>
            </PlanHeader>

            <PlanFeatures>
              <FeatureRow $light>
                <FeatureIcon $type="check" $light><Check /></FeatureIcon>
                <FeatureText $light>تا ۱۰۰ گیاه در باغچه</FeatureText>
              </FeatureRow>
              <FeatureRow $light>
                <FeatureIcon $type="check" $light><Check /></FeatureIcon>
                <FeatureText $light>هفته‌ای ۴۰ شناسایی گیاه</FeatureText>
              </FeatureRow>
              <FeatureRow $light>
                <FeatureIcon $type="check" $light><Check /></FeatureIcon>
                <FeatureText $light>هفته‌ای ۱۰ شناسایی با مدل Pro 🧠</FeatureText>
              </FeatureRow>
              <FeatureRow $light>
                <FeatureIcon $type="check" $light><Check /></FeatureIcon>
                <FeatureText $light>ماهی ۳۰ تشخیص بیماری</FeatureText>
              </FeatureRow>
              <FeatureRow $light>
                <FeatureIcon $type="check" $light><Check /></FeatureIcon>
                <FeatureText $light>روزانه ۲۰ پیام چت هوشمند</FeatureText>
              </FeatureRow>
            </PlanFeatures>

            <BuyButton 
              $variant="primary"
              onClick={handleSubscribe}
              disabled={purchasing}
            >
              <ShoppingCart size={18} />
              {isPro ? 'تمدید اشتراک' : 'خرید اشتراک'}
            </BuyButton>
          </PlanCard>
        </PlansSection>

        {/* مقایسه رایگان و اشتراکی */}
        <ComparisonSection>
          <SectionTitle>
            <Star size={18} color="#FF9800" />
            مقایسه امکانات
          </SectionTitle>

          <ComparisonTable>
            <ComparisonHeaderRow>
              <ComparisonHeaderCell>امکانات</ComparisonHeaderCell>
              <ComparisonHeaderCell>رایگان</ComparisonHeaderCell>
              <ComparisonHeaderCell $highlight>اشتراکی</ComparisonHeaderCell>
            </ComparisonHeaderRow>

            <ComparisonRow>
              <ComparisonFeature><Leaf size={14} color="#4CAF50" /> گیاه در باغچه</ComparisonFeature>
              <ComparisonValue>۶</ComparisonValue>
              <ComparisonValue $highlight>۱۰۰</ComparisonValue>
            </ComparisonRow>

            <ComparisonRow>
              <ComparisonFeature><Camera size={14} color="#2196F3" /> شناسایی گیاه</ComparisonFeature>
              <ComparisonValue>۵ / هفته</ComparisonValue>
              <ComparisonValue $highlight>۴۰ / هفته</ComparisonValue>
            </ComparisonRow>

            <ComparisonRow>
              <ComparisonFeature><Sparkles size={14} color="#9C27B0" />شناسایی گیاه pro </ComparisonFeature>
              <ComparisonValue>❌</ComparisonValue>
              <ComparisonValue $highlight>۱۰ / هفته</ComparisonValue>
            </ComparisonRow>

            <ComparisonRow>
              <ComparisonFeature><Shield size={14} color="#F44336" /> تشخیص بیماری</ComparisonFeature>
              <ComparisonValue>۱ / هفته</ComparisonValue>
              <ComparisonValue $highlight>۳۰ / ماه</ComparisonValue>
            </ComparisonRow>

            <ComparisonRow>
              <ComparisonFeature><MessageCircle size={14} color="#FF9800" /> چت هوشمند</ComparisonFeature>
              <ComparisonValue>۵ / روز</ComparisonValue>
              <ComparisonValue $highlight>۲۰ / روز</ComparisonValue>
            </ComparisonRow>

            <ComparisonRow>
              <ComparisonFeature><Droplets size={14} color="#03A9F4" /> آبیاری هوشمند</ComparisonFeature>
              <ComparisonValue>❌</ComparisonValue>
              <ComparisonValue>❌</ComparisonValue>
            </ComparisonRow>
          </ComparisonTable>
        </ComparisonSection>

        {/* خرید پکیج اسکن بیماری */}
        <ScanSection>
          <SectionTitle>
            <Zap size={18} color="#FF6B35" />
            خرید تشخیص بیماری (بدون اشتراک)
          </SectionTitle>

          <p style={{ 
            fontFamily: 'Vazirmatn', fontSize: 13, color: '#757575', 
            margin: '0 0 16px', lineHeight: 1.6 
          }}>
            بدون نیاز به اشتراک، پکیج تشخیص بیماری گیاه بخرید
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <ScanCard 
              $selected={selectedScanPack === '5_scans'}
              onClick={() => setSelectedScanPack('5_scans')}
            >
              <ScanInfo>
                <ScanRadio $selected={selectedScanPack === '5_scans'} />
                <ScanIcon $variant="small"><Shield size={22} /></ScanIcon>
                <ScanDetails>
                  <ScanTitle>۵ تشخیص بیماری</ScanTitle>
                  <ScanSubtitle>هر اسکن ۶,۰۰۰ تومان</ScanSubtitle>
                </ScanDetails>
              </ScanInfo>
              <ScanPrice>
                <ScanPriceAmount>۳۰</ScanPriceAmount>
                <ScanPriceUnit>هزار تومان</ScanPriceUnit>
              </ScanPrice>
            </ScanCard>

            <ScanCard 
              $selected={selectedScanPack === '10_scans'}
              onClick={() => setSelectedScanPack('10_scans')}
            >
              <ScanInfo>
                <ScanRadio $selected={selectedScanPack === '10_scans'} />
                <ScanIcon $variant="large"><Shield size={22} /></ScanIcon>
                <ScanDetails>
                  <ScanTitle>۱۰ تشخیص بیماری</ScanTitle>
                  <ScanSubtitle>هر اسکن ۵,۰۰۰ تومان — صرفه‌جویی ۱۰ هزار</ScanSubtitle>
                </ScanDetails>
              </ScanInfo>
              <ScanPrice>
                <ScanPriceAmount>۵۰</ScanPriceAmount>
                <ScanPriceUnit>هزار تومان</ScanPriceUnit>
              </ScanPrice>
            </ScanCard>
          </div>

          <BuyButton 
            $variant="gold" 
            onClick={handleBuyScanPack}
            disabled={!selectedScanPack || purchasing}
          >
            <ShoppingCart size={18} />
            خرید پکیج تشخیص بیماری
          </BuyButton>
        </ScanSection>
      </ContentArea>

      {/* مودال تأیید خرید */}
      <ModalOverlay $visible={showModal} onClick={() => !purchasing && setShowModal(false)}>
        <ModalContent $visible={showModal} onClick={e => e.stopPropagation()}>
          <ModalHandle />
          <ModalTitle>
            {modalType === 'subscribe' ? '🎉 فعال‌سازی اشتراک' : '🛒 خرید پکیج'}
          </ModalTitle>
          <ModalDescription>
            {modalType === 'subscribe' 
              ? `آیا از خرید ${selectedPlan === 'monthly' ? 'اشتراک ماهانه' : 'اشتراک سالیانه'} اطمینان دارید؟`
              : `آیا از خرید ${selectedScanPack === '5_scans' ? '۵' : '۱۰'} تشخیص بیماری اطمینان دارید؟`
            }
          </ModalDescription>
          
          <ModalPriceRow>
            <ModalPriceLabel>مبلغ قابل پرداخت</ModalPriceLabel>
            <ModalPriceValue>
              {formatPrice(modalType === 'subscribe' ? getPlanPrice() : getScanPackPrice())} هزار تومان
            </ModalPriceValue>
          </ModalPriceRow>

          <p style={{ 
            fontFamily: 'Vazirmatn', fontSize: 12, color: '#9e9e9e', 
            textAlign: 'center', margin: '0 0 16px', lineHeight: 1.8 
          }}>
            💳 پرداخت امن از طریق درگاه زرین‌پال
          </p>

          <ModalButtons>
            <ModalButton 
              $variant="confirm" 
              onClick={handleConfirmPurchase}
              disabled={purchasing}
            >
              {purchasing ? 'در حال اتصال به درگاه...' : 'تأیید و پرداخت آنلاین'}
            </ModalButton>
            <ModalButton 
              $variant="cancel" 
              onClick={() => setShowModal(false)}
              disabled={purchasing}
            >
              انصراف
            </ModalButton>
          </ModalButtons>
        </ModalContent>
      </ModalOverlay>

      {/* نتیجه پرداخت - نمایش داخل اپ */}
      <ModalOverlay $visible={paymentResult.show} onClick={() => {}}>
        <ModalContent $visible={paymentResult.show} onClick={e => e.stopPropagation()}>
          {paymentResult.checking ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ 
                width: 50, height: 50, margin: '0 auto 16px',
                border: '4px solid rgba(76,175,80,0.1)', borderTopColor: '#4CAF50',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite'
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontFamily: 'Vazirmatn', color: '#4CAF50', fontWeight: 600, fontSize: 15 }}>
                در حال بررسی وضعیت پرداخت...
              </p>
            </div>
          ) : (
            <>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: paymentResult.success ? '#e8f5e9' : '#ffebee',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                {paymentResult.success 
                  ? <CheckCircle size={40} color="#4CAF50" />
                  : <XCircle size={40} color="#F44336" />
                }
              </div>

              <ModalTitle>
                {paymentResult.success ? '🎉 پرداخت موفق!' : '❌ پرداخت ناموفق'}
              </ModalTitle>
              
              <ModalDescription>
                {paymentResult.message}
              </ModalDescription>

              {paymentResult.refId && (
                <ModalPriceRow>
                  <ModalPriceLabel>شماره تراکنش</ModalPriceLabel>
                  <ModalPriceValue style={{ fontSize: 16 }}>{paymentResult.refId}</ModalPriceValue>
                </ModalPriceRow>
              )}

              <ModalButtons>
                {paymentResult.success ? (
                  <ModalButton 
                    $variant="confirm" 
                    onClick={() => {
                      setPaymentResult({ ...paymentResult, show: false });
                    }}
                  >
                    متوجه شدم ✓
                  </ModalButton>
                ) : (
                  <>
                    <ModalButton 
                      $variant="confirm" 
                      onClick={() => {
                        setPaymentResult({ ...paymentResult, show: false });
                      }}
                    >
                      تلاش مجدد
                    </ModalButton>
                    <ModalButton 
                      $variant="cancel" 
                      onClick={() => {
                        setPaymentResult({ ...paymentResult, show: false });
                        navigate('/');
                      }}
                    >
                      بازگشت
                    </ModalButton>
                  </>
                )}
              </ModalButtons>
            </>
          )}
        </ModalContent>
      </ModalOverlay>
    </ScreenContainer>
  );
};

export default SubscriptionScreen;
