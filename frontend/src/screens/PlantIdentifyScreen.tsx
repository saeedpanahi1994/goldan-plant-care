import React, { useState, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { ArrowRight, Camera, Upload, Loader2, CheckCircle, AlertCircle, Droplets, Sun, Thermometer, Wind, Leaf, X, Image, Plus, Heart, ShieldAlert, Check, Circle, Zap, Star } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { identifyPlantFromFile, identifyPlantFromBase64, identifyDiseaseFromFile, identifyDiseaseFromBase64, PlantIdentificationResult, addIdentifiedPlantToGarden, getDefaultGarden } from '../services/plantApiService';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import HeaderComponent from '../components/Header';
import QuotaExhaustedModal from '../components/QuotaExhaustedModal';
import axios from 'axios';

const API_BASE_URL = 'http://130.185.76.46:4380';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components
const ScreenContainer = styled.div`
  min-height: calc(100vh - 90px);
  background: linear-gradient(135deg, #f5f9f5 0%, #e8f5e9 50%, #f1f8f4 100%);
  direction: rtl;
  padding-bottom: 100px;
`;

const Header = styled.header`
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #43A047 100%);
  padding: 10px 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 14px);
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 10px rgba(76, 175, 80, 0.2);
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
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
  font-weight: 700;
  color: white;
  margin: 0;
`;

const Content = styled.div`
  padding: 24px 20px;
  animation: ${fadeIn} 0.5s ease;
`;

const UploadSection = styled.div`
  background: white;
  border-radius: 24px;
  padding: 32px 24px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.1);
  margin-bottom: 24px;
`;

const UploadTitle = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1b5e20;
  margin: 0 0 8px 0;
  text-align: center;
`;

const UploadDescription = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #757575;
  margin: 0 0 24px 0;
  text-align: center;
  line-height: 1.6;
`;

// Mode Selector
const ModeSelector = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  background: #f5f5f5;
  border-radius: 16px;
  padding: 4px;
`;

const ModeButton = styled.button<{ $active: boolean; $isPro?: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  ${props => props.$active ? `
    background: ${props.$isPro 
      ? 'linear-gradient(135deg, #FF6F00 0%, #FFA000 100%)'
      : 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)'};
    color: white;
    box-shadow: ${props.$isPro
      ? '0 4px 16px rgba(255, 111, 0, 0.3)'
      : '0 4px 16px rgba(76, 175, 80, 0.3)'};
  ` : `
    background: transparent;
    color: #757575;
  `}

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ModeDescription = styled.p<{ $isPro?: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: ${props => props.$isPro ? '#FF6F00' : '#4CAF50'};
  text-align: center;
  margin: -12px 0 20px 0;
  line-height: 1.6;
`;

// Low Confidence / Suggest Pro Banner
const SuggestProBanner = styled.div`
  background: linear-gradient(135deg, #FFF8E1 0%, #FFE082 100%);
  border: 2px solid #FFB300;
  border-radius: 20px;
  padding: 16px 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SuggestProText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #E65100;
  line-height: 1.7;
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;

  svg {
    flex-shrink: 0;
    margin-top: 3px;
  }
`;

const SuggestProButton = styled.button`
  padding: 10px 20px;
  background: linear-gradient(135deg, #FF6F00 0%, #FFA000 100%);
  border: none;
  border-radius: 12px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 111, 0, 0.3);
  align-self: flex-start;

  &:hover {
    transform: translateY(-1px);
  }

  svg { width: 16px; height: 16px; }
`;

const UploadArea = styled.label<{ $hasImage: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed ${props => props.$hasImage ? '#4CAF50' : '#c8e6c9'};
  border-radius: 20px;
  padding: ${props => props.$hasImage ? '0' : '40px 20px'};
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.$hasImage ? 'transparent' : 'linear-gradient(135deg, #f1f8e9 0%, #e8f5e9 100%)'};
  min-height: 200px;
  overflow: hidden;
  position: relative;

  &:hover {
    border-color: #4CAF50;
    background: ${props => props.$hasImage ? 'transparent' : 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'};
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const UploadIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);

  svg {
    color: white;
  }
`;

const UploadText = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 8px;
`;

const UploadHint = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #9e9e9e;
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 250px;
  object-fit: cover;
  border-radius: 18px;
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  svg {
    color: white;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
`;

const ActionButton = styled.button<{ $primary?: boolean; $disabled?: boolean }>`
  flex: 1;
  padding: 16px;
  border-radius: 16px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: ${props => props.$disabled ? 0.5 : 1};

  ${props => props.$primary ? `
    background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
    border: none;
    color: white;
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(76, 175, 80, 0.4);
    }
  ` : `
    background: white;
    border: 2px solid #e0e0e0;
    color: #424242;

    &:hover:not(:disabled) {
      border-color: #4CAF50;
      color: #4CAF50;
    }
  `}
`;

const LoadingSpinner = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
`;

// Loading State
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
  animation: ${fadeIn} 0.5s ease;
`;

const LoadingText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #424242;
  margin: 16px 0 8px;
`;

const LoadingHint = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #757575;
  margin: 0 0 24px;
`;

// Result State
const ResultContainer = styled.div`
  animation: ${fadeIn} 0.5s ease;
`;

const PlantCard = styled.div`
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.15);
  margin-bottom: 20px;
`;

const PlantImageContainer = styled.div`
  position: relative;
  height: 200px;
`;

const PlantImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ConfidenceBadge = styled.div<{ $high: boolean }>`
  position: absolute;
  top: 12px;
  left: 12px;
  background: ${props => props.$high ? 'rgba(76, 175, 80, 0.9)' : 'rgba(255, 152, 0, 0.9)'};
  padding: 6px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 4px;

  svg {
    width: 14px;
    height: 14px;
    color: white;
  }

  span {
    font-family: 'Vazirmatn', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: white;
  }
`;

const HealthBadge = styled.div<{ $status: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  background: ${props => 
    props.$status === 'سالم' ? 'rgba(76, 175, 80, 0.9)' : 
    props.$status === 'بیمار' ? 'rgba(244, 67, 54, 0.9)' : 
    'rgba(255, 152, 0, 0.9)'
  };
  padding: 6px 12px;
  border-radius: 20px;

  span {
    font-family: 'Vazirmatn', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: white;
  }
`;

const PlantInfo = styled.div`
  padding: 20px;
`;

const PlantName = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: #1b5e20;
  margin: 0 0 4px 0;
`;

const ScientificName = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #9e9e9e;
  font-style: italic;
  margin: 0 0 4px 0;
`;

const PlantFamily = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #4CAF50;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 4px;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const PlantDescription = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #616161;
  line-height: 1.7;
  margin: 0;
`;

// Needs Section
const NeedsCard = styled.div`
  background: white;
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.1);
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #1b5e20;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NeedsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const NeedItem = styled.div`
  background: linear-gradient(135deg, #f1f8e9 0%, #e8f5e9 100%);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const NeedIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  background: ${props => props.$color};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    color: white;
    width: 20px;
    height: 20px;
  }
`;

const NeedLabel = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #9e9e9e;
`;

const NeedValue = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #424242;
`;

// Disease Section
const DiseaseCard = styled.div<{ $hasProblem: boolean }>`
  background: ${props => props.$hasProblem ? 'linear-gradient(135deg, #fff3e0 0%, #ffecb3 100%)' : 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'};
  border-radius: 24px;
  padding: 20px;
  margin-bottom: 20px;
  border: 2px solid ${props => props.$hasProblem ? '#ffb74d' : '#81c784'};
`;

const DiseaseTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  svg {
    color: #ff9800;
  }
`;

const DiseaseName = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #e65100;
`;

const TreatmentText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #5d4037;
  line-height: 1.7;
  margin: 0;
`;

// Care Tips
const CareTipsCard = styled.div`
  background: white;
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.1);
  margin-bottom: 20px;
`;

const TipItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
`;

const TipNumber = styled.div`
  min-width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: white;
`;

const TipText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #424242;
  line-height: 1.6;
  margin: 0;
`;

// New Scan Button
const NewScanButton = styled.button`
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  border: none;
  border-radius: 20px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(76, 175, 80, 0.4);
  }
`;

// دکمه افزودن به باغچه
const AddToGardenButton = styled.button<{ $added?: boolean; $loading?: boolean }>`
  width: 100%;
  padding: 18px;
  background: ${props => props.$added 
    ? 'linear-gradient(135deg, #66BB6A 0%, #81C784 100%)'
    : 'linear-gradient(135deg, #2196F3 0%, #42A5F5 100%)'};
  border: none;
  border-radius: 20px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: white;
  cursor: ${props => props.$added || props.$loading ? 'default' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
  box-shadow: ${props => props.$added 
    ? '0 8px 24px rgba(102, 187, 106, 0.3)'
    : '0 8px 24px rgba(33, 150, 243, 0.3)'};
  margin-bottom: 12px;
  opacity: ${props => props.$loading ? 0.7 : 1};

  &:hover {
    transform: ${props => props.$added || props.$loading ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.$added || props.$loading
      ? (props.$added ? '0 8px 24px rgba(102, 187, 106, 0.3)' : '0 8px 24px rgba(33, 150, 243, 0.3)')
      : '0 12px 32px rgba(33, 150, 243, 0.4)'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// گالری تصاویر
const ImageGallery = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 12px 0;
  margin-top: 8px;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c8e6c9;
    border-radius: 2px;
  }
`;

const GalleryImage = styled.img<{ $isActive?: boolean }>`
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 12px;
  cursor: pointer;
  border: 3px solid ${props => props.$isActive ? '#4CAF50' : 'transparent'};
  transition: all 0.3s ease;
  flex-shrink: 0;

  &:hover {
    transform: scale(1.05);
    border-color: #81c784;
  }
`;

// اطلاعات اضافی گیاه
const ExtraInfoCard = styled.div`
  background: white;
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.1);
  margin-bottom: 20px;
`;

const ExtraInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const ExtraInfoItem = styled.div<{ $warning?: boolean }>`
  background: ${props => props.$warning 
    ? 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)'
    : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'};
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    color: ${props => props.$warning ? '#ff9800' : '#1976d2'};
  }
`;

const ExtraInfoText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ExtraInfoLabel = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 11px;
  color: #757575;
`;

const ExtraInfoValue = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #424242;
`;

// Error State
const ErrorCard = styled.div`
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border-radius: 24px;
  padding: 32px 24px;
  text-align: center;
  border: 2px solid #ef9a9a;
`;

const ErrorIcon = styled.div`
  width: 80px;
  height: 80px;
  background: #f44336;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;

  svg {
    color: white;
    width: 40px;
    height: 40px;
  }
`;

const ErrorText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #c62828;
  margin: 0 0 8px 0;
`;

const ErrorHint = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #d32f2f;
  margin: 0;
`;

// Progress Steps
const ProgressContainer = styled.div`
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.1);
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: 'Vazirmatn', sans-serif;
`;

interface StepProps {
  $active?: boolean;
  $completed?: boolean;
}

const StepItem = styled.div<StepProps>`
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: ${props => props.$active || props.$completed ? 1 : 0.5};
  transition: all 0.3s ease;
  
  svg {
    color: ${props => props.$completed ? '#4CAF50' : props.$active ? '#2196F3' : '#BDBDBD'};
  }
`;

const StepText = styled.span<StepProps>`
  font-size: 14px;
  color: ${props => props.$active || props.$completed ? '#212121' : '#9E9E9E'};
  font-weight: ${props => props.$active ? '700' : '400'};
`;

const StepSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// =====================
// Component
// =====================
const PlantIdentifyScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDiseaseMode = location.pathname.includes('/diagnosis/disease');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PlantIdentificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  
  // state های جدید برای افزودن به باغچه
  const [addingToGarden, setAddingToGarden] = useState(false);
  const [addedToGarden, setAddedToGarden] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // حالت شناسایی: معمولی یا Pro
  const [identifyMode, setIdentifyMode] = useState<'normal' | 'pro'>('normal');
  const [suggestPro, setSuggestPro] = useState(false);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaUsageInfo, setQuotaUsageInfo] = useState<any>(null);

  // ساخت URL کامل برای تصاویر
  const getFullImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  // دریافت همه تصاویر (تصویر کاربر + تصاویر اضافی)
  const getAllImages = () => {
    if (!result) return [];
    const images = [];
    if (selectedImage) images.push(selectedImage);
    if (result.additionalImages) {
      result.additionalImages.forEach(img => {
        images.push(getFullImageUrl(img));
      });
    }
    return images;
  };

  // افزودن گیاه به باغچه
  const handleAddToGarden = async () => {
    if (!result || addedToGarden || addingToGarden) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('لطفاً ابتدا وارد حساب کاربری خود شوید');
      navigate('/login');
      return;
    }

    try {
      setAddingToGarden(true);

      // دریافت باغچه پیش‌فرض
      const gardenResponse = await getDefaultGarden(token);
      if (!gardenResponse.success || !gardenResponse.data) {
        alert('خطا در دریافت باغچه. لطفاً دوباره تلاش کنید.');
        return;
      }

      // افزودن گیاه به باغچه
      const addResponse = await addIdentifiedPlantToGarden(result, gardenResponse.data.id, token);
      
      if (addResponse.success) {
        setAddedToGarden(true);
        setTimeout(() => {
          alert('🌱 گیاه با موفقیت به باغچه شما اضافه شد!');
        }, 100);
      } else {
        alert(addResponse.message || 'خطا در افزودن گیاه به باغچه');
      }
    } catch (err) {
      console.error('خطا در افزودن گیاه:', err);
      alert('خطا در افزودن گیاه به باغچه');
    } finally {
      setAddingToGarden(false);
    }
  };

  // گرفتن عکس با دوربین Capacitor
  const takePhoto = async () => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera, // مستقیم دوربین را باز می‌کند
      });

      if (photo.base64String) {
        const imageData = `data:image/${photo.format};base64,${photo.base64String}`;
        setSelectedImage(imageData);
        setBase64Image(photo.base64String);
        setSelectedFile(null);
        setError(null);
        setResult(null);
      }
    } catch (err: any) {
      // کاربر لغو کرد یا خطایی رخ داد
      if (err.message !== 'User cancelled photos app') {
        console.error('خطا در دسترسی به دوربین:', err);
        setError('خطا در دسترسی به دوربین. لطفاً از گالری استفاده کنید.');
      }
    }
  };

  // انتخاب عکس از گالری با Capacitor
  const pickFromGallery = async () => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos, // گالری را باز می‌کند
      });

      if (photo.base64String) {
        const imageData = `data:image/${photo.format};base64,${photo.base64String}`;
        setSelectedImage(imageData);
        setBase64Image(photo.base64String);
        setSelectedFile(null);
        setError(null);
        setResult(null);
      }
    } catch (err: any) {
      if (err.message !== 'User cancelled photos app') {
        console.error('خطا در دسترسی به گالری:', err);
        // Fallback به input معمولی
        fileInputRef.current?.click();
      }
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedImage(result);
        // استخراج base64 از data URL
        const base64 = result.split(',')[1];
        setBase64Image(base64);
      };
      reader.readAsDataURL(file);
      setError(null);
      setResult(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setBase64Image(null);
    setResult(null);
    setError(null);
    setAddedToGarden(false);
    setProgressStep(0);
    setActiveImageIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // بررسی سهمیه قبل از شناسایی
  const checkQuotaBeforeIdentify = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return true;
      const actionType = isDiseaseMode ? 'disease' : (identifyMode === 'pro' ? 'identify_pro' : 'identify');
      const response = await axios.get(`${API_BASE_URL}/api/subscription/check/${actionType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success && !response.data.allowed) {
        setQuotaUsageInfo(response.data);
        setShowQuotaModal(true);
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  const handleIdentify = async () => {
    if (!selectedImage && !base64Image) return;

    // بررسی سهمیه قبل از شروع
    const quotaOk = await checkQuotaBeforeIdentify();
    if (!quotaOk) return;

    setIsLoading(true);
    setError(null);
    setSuggestPro(false);
    setLowConfidence(false);
    setProgressStep(1); // شروع مرحله 1: ارسال تصویر

    // تایمر برای شبیه‌سازی مراحل پیشرفت
    const progressTimer = setInterval(() => {
      setProgressStep(prev => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 2500); // هر 2.5 ثانیه یک مرحله جلو برو

    try {
      let response: any;
      
      // اگر از دوربین Capacitor عکس گرفته شده، از Base64 استفاده کن
      if (base64Image && !selectedFile) {
        response = isDiseaseMode
          ? await identifyDiseaseFromBase64(base64Image, 'image/jpeg')
          : await identifyPlantFromBase64(base64Image, 'image/jpeg', identifyMode);
      } else if (selectedFile) {
        // اگر فایل از input انتخاب شده
        response = isDiseaseMode
          ? await identifyDiseaseFromFile(selectedFile)
          : await identifyPlantFromFile(selectedFile, identifyMode);
      } else {
        setError('لطفاً ابتدا یک عکس انتخاب کنید');
        setIsLoading(false);
        clearInterval(progressTimer);
        return;
      }
      
      clearInterval(progressTimer);
      setProgressStep(4); // مرحله آخر: دریافت اطلاعات

      // یک وقفه کوتاه برای نمایش مرحله آخر قبل از نمایش نتیجه
      setTimeout(() => {
        if (response.success && response.data) {
          setResult(response.data);
          // بررسی پیشنهاد Pro و اعتماد پایین
          if (response.suggestPro) setSuggestPro(true);
          if (response.lowConfidence) setLowConfidence(true);
        } else if (response.upgradeRequired || response.usageInfo) {
          // سهمیه تمام شده
          setQuotaUsageInfo(response.usageInfo || {
            used: 1, limit: 1, period: 'هفتگی', remaining: 0, tier: 'free'
          });
          setShowQuotaModal(true);
        } else {
          setError(response.message || (isDiseaseMode ? 'خطا در شناسایی بیماری گیاه' : 'خطا در شناسایی گیاه'));
          // حتی در حالت خطا هم ممکنه پیشنهاد Pro بدهد
          if (response.suggestPro) setSuggestPro(true);
        }
        setIsLoading(false);
      }, 1000);

    } catch (err) {
      clearInterval(progressTimer);
      setError('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.');
      setIsLoading(false);
    }
  };

  const handleNewScan = () => {
    setSuggestPro(false);
    setLowConfidence(false);
    handleRemoveImage();
  };

  // تلاش مجدد با مدل Pro
  const handleRetryWithPro = () => {
    setIdentifyMode('pro');
    setResult(null);
    setError(null);
    setSuggestPro(false);
    setLowConfidence(false);
    // کمی صبر کن تا state بروز شود
    setTimeout(() => {
      handleIdentifyWithMode('pro');
    }, 100);
  };

  // تابع شناسایی با حالت مشخص
  const handleIdentifyWithMode = async (mode: 'normal' | 'pro') => {
    if (!selectedImage && !base64Image) return;

    // بررسی سهمیه
    const quotaOk = await checkQuotaBeforeIdentify();
    if (!quotaOk) return;

    setIsLoading(true);
    setError(null);
    setSuggestPro(false);
    setLowConfidence(false);
    setProgressStep(1);

    const progressTimer = setInterval(() => {
      setProgressStep(prev => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 2500);

    try {
      let response: any;
      
      if (base64Image && !selectedFile) {
        response = isDiseaseMode
          ? await identifyDiseaseFromBase64(base64Image, 'image/jpeg')
          : await identifyPlantFromBase64(base64Image, 'image/jpeg', mode);
      } else if (selectedFile) {
        response = isDiseaseMode
          ? await identifyDiseaseFromFile(selectedFile)
          : await identifyPlantFromFile(selectedFile, mode);
      } else {
        setError('لطفاً ابتدا یک عکس انتخاب کنید');
        setIsLoading(false);
        clearInterval(progressTimer);
        return;
      }
      
      clearInterval(progressTimer);
      setProgressStep(4);

      setTimeout(() => {
        if (response.success && response.data) {
          setResult(response.data);
          if (response.suggestPro) setSuggestPro(true);
          if (response.lowConfidence) setLowConfidence(true);
        } else if (response.upgradeRequired || response.usageInfo) {
          setQuotaUsageInfo(response.usageInfo || {
            used: 1, limit: 1, period: 'هفتگی', remaining: 0, tier: 'free'
          });
          setShowQuotaModal(true);
        } else {
          setError(response.message || (isDiseaseMode ? 'خطا در شناسایی بیماری گیاه' : 'خطا در شناسایی گیاه'));
          if (response.suggestPro) setSuggestPro(true);
        }
        setIsLoading(false);
      }, 1000);

    } catch (err) {
      clearInterval(progressTimer);
      setError('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.');
      setIsLoading(false);
    }
  };

  const toPersianDigits = (num: number): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().split('').map(d => persianDigits[parseInt(d)] || d).join('');
  };

  return (
    <>
    <ScreenContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <ArrowRight size={24} />
        </BackButton>
        <HeaderTitle>{isDiseaseMode ? 'شناسایی بیماری گیاه' : 'شناسایی گیاه'}</HeaderTitle>
      </Header>

      <Content>
        {/* Loading State */}
        {isLoading && (
          <ProgressContainer>
            <StepItem $completed={progressStep > 1} $active={progressStep === 1}>
              {progressStep > 1 ? <Check size={20} /> : progressStep === 1 ? <StepSpinner /> : <Circle size={20} />}
              <StepText $completed={progressStep > 1} $active={progressStep === 1}>
                {isDiseaseMode ? 'ارسال تصویر برگ بیمار' : 'ارسال تصویر به سرور'}
              </StepText>
            </StepItem>

            <StepItem $completed={progressStep > 2} $active={progressStep === 2}>
              {progressStep > 2 ? <Check size={20} /> : progressStep === 2 ? <StepSpinner /> : <Circle size={20} />}
              <StepText $completed={progressStep > 2} $active={progressStep === 2}>
                {isDiseaseMode ? 'تحلیل علائم بیماری' : 'شناسایی هوشمند گیاه'}
              </StepText>
            </StepItem>

            <StepItem $completed={progressStep > 3} $active={progressStep === 3}>
              {progressStep > 3 ? <Check size={20} /> : progressStep === 3 ? <StepSpinner /> : <Circle size={20} />}
              <StepText $completed={progressStep > 3} $active={progressStep === 3}>
                {isDiseaseMode ? 'یافتن راهکارهای درمانی' : 'جستجو در بانک اطلاعاتی گیاهان'}
              </StepText>
            </StepItem>

            <StepItem $completed={progressStep > 4} $active={progressStep === 4}>
              {progressStep > 4 ? <Check size={20} /> : progressStep === 4 ? <StepSpinner /> : <Circle size={20} />}
              <StepText $completed={progressStep > 4} $active={progressStep === 4}>
                آماده‌سازی و نمایش اطلاعات
              </StepText>
            </StepItem>
          </ProgressContainer>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorCard>
            <ErrorIcon>
              <AlertCircle />
            </ErrorIcon>
            <ErrorText>خطا در شناسایی</ErrorText>
            <ErrorHint>{error}</ErrorHint>
            {suggestPro && identifyMode === 'normal' && (
              <SuggestProBanner>
                <SuggestProText>
                  <Star size={18} />
                  با استفاده از مدل Pro می‌توانید شناسایی دقیق‌تری داشته باشید
                </SuggestProText>
                <SuggestProButton onClick={handleRetryWithPro}>
                  <Star size={16} />
                  تلاش با مدل Pro
                </SuggestProButton>
              </SuggestProBanner>
            )}
            <ActionButton $primary style={{ marginTop: 20 }} onClick={handleNewScan}>
              تلاش مجدد
            </ActionButton>
          </ErrorCard>
        )}

        {/* Result State */}
        {result && !isLoading && (
          <ResultContainer>
            <PlantCard>
              <PlantImageContainer>
                {getAllImages().length > 0 && (
                  <PlantImage 
                    src={getAllImages()[activeImageIndex] || selectedImage || ''} 
                    alt={result.name} 
                  />
                )}
                <ConfidenceBadge $high={result.confidence >= 0.7}>
                  {result.confidence >= 0.7 ? <CheckCircle /> : <AlertCircle />}
                  <span>{toPersianDigits(Math.round(result.confidence * 100))}% اطمینان</span>
                </ConfidenceBadge>
                <HealthBadge $status={result.healthStatus}>
                  <span>{result.healthStatus}</span>
                </HealthBadge>
              </PlantImageContainer>
              
              {/* گالری تصاویر */}
              {getAllImages().length > 1 && (
                <ImageGallery>
                  {getAllImages().map((img, index) => (
                    <GalleryImage
                      key={index}
                      src={img}
                      alt={`${result.name} ${index + 1}`}
                      $isActive={activeImageIndex === index}
                      onClick={() => setActiveImageIndex(index)}
                    />
                  ))}
                </ImageGallery>
              )}
              
              <PlantInfo>
                <PlantName>{result.name}</PlantName>
                <ScientificName>{result.scientificName}</ScientificName>
                <PlantFamily>
                  <Leaf />
                  خانواده: {result.family}
                </PlantFamily>
                <PlantDescription>{result.description}</PlantDescription>
              </PlantInfo>
            </PlantCard>

            {/* پیشنهاد Pro در صورت اطمینان پایین */}
            {suggestPro && identifyMode === 'normal' && (
              <SuggestProBanner>
                <SuggestProText>
                  <Star size={18} />
                  دقت شناسایی پایین است. برای نتیجه دقیق‌تر از مدل Pro استفاده کنید
                </SuggestProText>
                <SuggestProButton onClick={handleRetryWithPro}>
                  <Star size={16} />
                  تلاش با مدل Pro
                </SuggestProButton>
              </SuggestProBanner>
            )}

            {/* Plant Needs */}
            <NeedsCard>
              <SectionTitle>
                <Leaf size={20} color="#4CAF50" />
                نیازهای گیاه
              </SectionTitle>
              <NeedsGrid>
                <NeedItem>
                  <NeedIcon $color="#FFB300">
                    <Sun />
                  </NeedIcon>
                  <NeedLabel>نور</NeedLabel>
                  <NeedValue>{result.needs.light}</NeedValue>
                </NeedItem>
                <NeedItem>
                  <NeedIcon $color="#29B6F6">
                    <Droplets />
                  </NeedIcon>
                  <NeedLabel>آبیاری</NeedLabel>
                  <NeedValue>{result.needs.water}</NeedValue>
                </NeedItem>
                <NeedItem>
                  <NeedIcon $color="#EF5350">
                    <Thermometer />
                  </NeedIcon>
                  <NeedLabel>دما</NeedLabel>
                  <NeedValue>{result.needs.temperature}</NeedValue>
                </NeedItem>
                <NeedItem>
                  <NeedIcon $color="#66BB6A">
                    <Wind />
                  </NeedIcon>
                  <NeedLabel>رطوبت</NeedLabel>
                  <NeedValue>{result.needs.humidity}</NeedValue>
                </NeedItem>
              </NeedsGrid>
            </NeedsCard>

            {/* اطلاعات اضافی */}
            <ExtraInfoCard>
              <SectionTitle>
                📋 اطلاعات تکمیلی
              </SectionTitle>
              <ExtraInfoGrid>
                <ExtraInfoItem>
                  <Droplets size={20} />
                  <ExtraInfoText>
                    <ExtraInfoLabel>دوره آبیاری</ExtraInfoLabel>
                    <ExtraInfoValue>هر {toPersianDigits(result.watering_interval_days || 7)} روز</ExtraInfoValue>
                  </ExtraInfoText>
                </ExtraInfoItem>
                <ExtraInfoItem>
                  <Leaf size={20} />
                  <ExtraInfoText>
                    <ExtraInfoLabel>دوره کوددهی</ExtraInfoLabel>
                    <ExtraInfoValue>هر {toPersianDigits(result.fertilizer_interval_days || 30)} روز</ExtraInfoValue>
                  </ExtraInfoText>
                </ExtraInfoItem>
                <ExtraInfoItem $warning={result.is_toxic_to_pets}>
                  <ShieldAlert size={20} />
                  <ExtraInfoText>
                    <ExtraInfoLabel>سمی برای حیوانات</ExtraInfoLabel>
                    <ExtraInfoValue>{result.is_toxic_to_pets ? 'بله ⚠️' : 'خیر ✓'}</ExtraInfoValue>
                  </ExtraInfoText>
                </ExtraInfoItem>
                <ExtraInfoItem>
                  <Heart size={20} />
                  <ExtraInfoText>
                    <ExtraInfoLabel>تصفیه‌کننده هوا</ExtraInfoLabel>
                    <ExtraInfoValue>{result.is_air_purifying ? 'بله 🌿' : 'خیر'}</ExtraInfoValue>
                  </ExtraInfoText>
                </ExtraInfoItem>
              </ExtraInfoGrid>
            </ExtraInfoCard>

            {/* Disease Info */}
            {result.disease !== 'ندارد' && (
              <DiseaseCard $hasProblem={true}>
                <DiseaseTitle>
                  <AlertCircle size={24} />
                  <DiseaseName>{result.disease}</DiseaseName>
                </DiseaseTitle>
                <TreatmentText>
                  <strong>درمان: </strong>{result.treatment}
                </TreatmentText>
              </DiseaseCard>
            )}

            {result.disease === 'ندارد' && (
              <DiseaseCard $hasProblem={false}>
                <DiseaseTitle>
                  <CheckCircle size={24} color="#4CAF50" />
                  <DiseaseName style={{ color: '#2e7d32' }}>گیاه سالم است! 🌱</DiseaseName>
                </DiseaseTitle>
                <TreatmentText style={{ color: '#388e3c' }}>
                  این گیاه نشانه‌ای از بیماری ندارد و در شرایط خوبی قرار دارد.
                </TreatmentText>
              </DiseaseCard>
            )}

            {/* Care Tips */}
            <CareTipsCard>
              <SectionTitle>
                💡 نکات مراقبتی
              </SectionTitle>
              {result.careTips.map((tip, index) => (
                <TipItem key={index}>
                  <TipNumber>{toPersianDigits(index + 1)}</TipNumber>
                  <TipText>{tip}</TipText>
                </TipItem>
              ))}
            </CareTipsCard>

            {/* دکمه افزودن به باغچه */}
            <AddToGardenButton 
              onClick={handleAddToGarden}
              $added={addedToGarden}
              $loading={addingToGarden}
              disabled={addingToGarden || addedToGarden}
            >
              {addingToGarden ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  در حال افزودن...
                </>
              ) : addedToGarden ? (
                <>
                  <CheckCircle size={22} />
                  به باغچه اضافه شد ✓
                </>
              ) : (
                <>
                  <Plus size={22} />
                  افزودن به باغچه من
                </>
              )}
            </AddToGardenButton>

            <NewScanButton onClick={handleNewScan}>
              <Camera size={22} />
              شناسایی گیاه جدید
            </NewScanButton>
          </ResultContainer>
        )}

        {/* Upload Section */}
        {!isLoading && !result && !error && (
          <UploadSection>
            {/* Mode Selector - فقط در حالت شناسایی گیاه (نه بیماری) */}
            {!isDiseaseMode && (
              <>
                <ModeSelector>
                  <ModeButton 
                    $active={identifyMode === 'normal'} 
                    onClick={() => setIdentifyMode('normal')}
                  >
                    <Zap size={18} />
                    معمولی
                  </ModeButton>
                  <ModeButton 
                    $active={identifyMode === 'pro'} 
                    $isPro 
                    onClick={() => setIdentifyMode('pro')}
                  >
                    <Star size={18} />
                    Pro
                  </ModeButton>
                </ModeSelector>
                <ModeDescription $isPro={identifyMode === 'pro'}>
                  {identifyMode === 'normal' 
                    ? 'شناسایی معمولی با هوش مصنوعی معمولی'
                    : '✨ شناسایی دقیق‌تر با هوش مصنوعی پیشرفته'}
                </ModeDescription>
              </>
            )}

            <UploadTitle>{isDiseaseMode ? 'عکس بخش بیمار گیاه را آپلود کنید' : 'عکس گیاه خود را آپلود کنید'}</UploadTitle>
            <UploadDescription>
              {isDiseaseMode
                ? 'از قسمت آسیب‌دیده یا بیمار عکس واضح بگیرید تا درمان مناسب پیشنهاد شود'
                : 'یک عکس واضح از گیاه خود بگیرید تا هوش مصنوعی آن را شناسایی کند'}
            </UploadDescription>

            {/* Hidden file input for fallback */}
            <HiddenInput
              ref={fileInputRef}
              type="file"
              id="plant-image"
              accept="image/*"
              onChange={handleImageSelect}
            />

            {/* Preview Area */}
            {selectedImage ? (
              <UploadArea $hasImage={true} as="div">
                <PreviewImage src={selectedImage} alt="Preview" />
                <RemoveImageButton onClick={handleRemoveImage}>
                  <X size={20} />
                </RemoveImageButton>
              </UploadArea>
            ) : (
              <UploadArea $hasImage={false} as="div" onClick={takePhoto}>
                <UploadIcon>
                  <Camera size={36} />
                </UploadIcon>
                <UploadText>برای گرفتن عکس کلیک کنید</UploadText>
                <UploadHint>دوربین گوشی شما باز می‌شود</UploadHint>
              </UploadArea>
            )}

            {/* Action Buttons */}
            {!selectedImage ? (
              <ButtonsContainer>
                <ActionButton $primary onClick={takePhoto}>
                  <Camera size={20} />
                  دوربین
                </ActionButton>
                <ActionButton onClick={pickFromGallery}>
                  <Image size={20} />
                  گالری
                </ActionButton>
              </ButtonsContainer>
            ) : (
              <ButtonsContainer>
                <ActionButton 
                  $primary 
                  onClick={handleIdentify}
                >
                  <Leaf size={20} />
                  {isDiseaseMode ? 'شناسایی بیماری' : 'شناسایی گیاه'}
                </ActionButton>
                <ActionButton onClick={handleRemoveImage}>
                  <X size={20} />
                  حذف عکس
                </ActionButton>
              </ButtonsContainer>
            )}
          </UploadSection>
        )}
      </Content>
    </ScreenContainer>

    {/* Quota Exhausted Modal */}
    <QuotaExhaustedModal
      isOpen={showQuotaModal}
      onClose={() => setShowQuotaModal(false)}
      usageInfo={quotaUsageInfo || { used: 1, limit: 1, period: 'هفتگی', remaining: 0, tier: 'free' }}
      featureType={isDiseaseMode ? 'disease' : 'identify'}
    />
    </>
  );
};

export default PlantIdentifyScreen;
