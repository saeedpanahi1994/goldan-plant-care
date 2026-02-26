import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { 
  ArrowRight, Camera, Image, X, Heart, HeartPulse, 
  AlertCircle, CheckCircle, Clock, Shield, ShieldAlert, 
  ShieldCheck, ChevronDown, ChevronUp, Leaf, Check, Circle,
  Bug, Zap, Droplets, Thermometer, Activity
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { diagnoseHealthFromBase64, identifyPlantFromBase64 } from '../services/plantApiService';
import QuotaExhaustedModal from '../components/QuotaExhaustedModal';

const API_URL = 'http://130.185.76.46:4380/api';
const SERVER_URL = 'http://130.185.76.46:4380';

const getFullImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `${SERVER_URL}${imagePath}`;
};

interface HealthRecord {
  id: number;
  user_plant_id: number;
  disease_name: string;
  disease_name_en: string;
  health_status: string;
  description: string;
  treatment: string;
  care_tips: string[];
  confidence: number;
  image_url: string;
  is_resolved: boolean;
  resolved_at: string | null;
  notes: string | null;
  diagnosed_at: string;
}

// ===== Animations =====
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
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

// ===== Styled Components =====
const ScreenContainer = styled.div`
  min-height: calc(100vh - 90px);
  background: linear-gradient(135deg, #f5f9f5 0%, #e8f5e9 50%, #f1f8f4 100%);
  padding-bottom: 100px;
`;

const Header = styled.div`
  background: #ffffff;
  padding: 16px 20px;
  padding-top: calc(env(safe-area-inset-top, 16px) + 16px);
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #424242;
  display: flex;
  border-radius: 12px;
  transition: background 0.2s;
  &:hover { background: #f5f5f5; }
`;

const HeaderTitle = styled.h1`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #1B5E20;
  margin: 0;
  flex: 1;
`;

// Health Status Card
const HealthStatusCard = styled.div<{ $status: string }>`
  margin: 16px 20px;
  padding: 20px;
  border-radius: 20px;
  background: ${props => {
    switch (props.$status) {
      case 'healthy': return 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)';
      case 'needs_attention': return 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)';
      case 'sick': return 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)';
      case 'recovering': return 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)';
      default: return 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)';
    }
  }};
  border: 2px solid ${props => {
    switch (props.$status) {
      case 'healthy': return '#4CAF50';
      case 'needs_attention': return '#FFB300';
      case 'sick': return '#EF5350';
      case 'recovering': return '#42A5F5';
      default: return '#4CAF50';
    }
  }};
  display: flex;
  align-items: center;
  gap: 16px;
  animation: ${fadeIn} 0.5s ease;
`;

const HealthStatusIcon = styled.div<{ $status: string }>`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.$status) {
      case 'healthy': return '#4CAF50';
      case 'needs_attention': return '#FFB300';
      case 'sick': return '#EF5350';
      case 'recovering': return '#42A5F5';
      default: return '#4CAF50';
    }
  }};
  color: white;
  flex-shrink: 0;
`;

const HealthStatusInfo = styled.div`
  flex: 1;
`;

const HealthStatusTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 800;
  margin: 0 0 4px 0;
  color: #212121;
`;

const HealthStatusText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #616161;
  margin: 0;
  line-height: 1.6;
`;

// Upload Section
const ScanSection = styled.div`
  margin: 16px 20px;
  background: #ffffff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  animation: ${fadeIn} 0.5s ease 0.1s both;
`;

const ScanTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #1B5E20;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ScanDescription = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #757575;
  margin: 0 0 16px 0;
  line-height: 1.6;
`;

const HiddenInput = styled.input`
  display: none;
`;

const UploadArea = styled.div<{ $hasImage: boolean }>`
  width: 100%;
  height: ${props => props.$hasImage ? '240px' : '160px'};
  border-radius: 16px;
  border: ${props => props.$hasImage ? 'none' : '2px dashed #C8E6C9'};
  background: ${props => props.$hasImage ? 'transparent' : '#f1f8f4'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  margin-bottom: 12px;

  &:hover {
    border-color: ${props => props.$hasImage ? 'none' : '#4CAF50'};
    background: ${props => props.$hasImage ? 'transparent' : '#e8f5e9'};
  }
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
`;

const UploadIcon = styled.div`
  color: #81C784;
  margin-bottom: 8px;
`;

const UploadText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #4CAF50;
  margin: 0;
  font-weight: 600;
`;

const UploadHint = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #9E9E9E;
  margin: 4px 0 0 0;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 10px;
`;

const ActionButton = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  flex: 1;
  padding: 12px 16px;
  border-radius: 14px;
  border: none;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  
  background: ${props => props.$danger 
    ? 'linear-gradient(135deg, #EF5350 0%, #E53935 100%)'
    : props.$primary 
    ? 'linear-gradient(135deg, #EF5350 0%, #FF7043 100%)' 
    : '#f5f5f5'};
  color: ${props => (props.$primary || props.$danger) ? '#ffffff' : '#424242'};
  box-shadow: ${props => (props.$primary || props.$danger) ? '0 4px 12px rgba(239, 83, 80, 0.3)' : 'none'};

  &:hover {
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// Progress Steps
const ProgressContainer = styled.div`
  margin: 20px;
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
`;

const StepItem = styled.div<{ $completed: boolean; $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  color: ${props => props.$completed ? '#4CAF50' : props.$active ? '#EF5350' : '#BDBDBD'};
`;

const StepSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid #FFE0B2;
  border-top: 2px solid #EF5350;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const StepText = styled.span<{ $completed: boolean; $active: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: ${props => props.$active ? 700 : 500};
  color: ${props => props.$completed ? '#4CAF50' : props.$active ? '#212121' : '#BDBDBD'};
`;

// Diagnosis Result Section
const DiagnosisResultCard = styled.div`
  margin: 16px 20px;
  background: #ffffff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  animation: ${fadeIn} 0.5s ease;
`;

const DiagnosisHeader = styled.div<{ $isSick: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
`;

const DiagnosisIcon = styled.div<{ $isSick: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$isSick 
    ? 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)' 
    : 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)'};
  color: ${props => props.$isSick ? '#EF5350' : '#4CAF50'};
`;

const DiagnosisTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #212121;
  margin: 0;
`;

const DiagnosisSubtitle = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #9E9E9E;
  margin: 2px 0 0 0;
`;

const DiagnosisField = styled.div`
  margin-bottom: 16px;
`;

const FieldLabel = styled.h4`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #757575;
  margin: 0 0 6px 0;
`;

const FieldValue = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #424242;
  margin: 0;
  line-height: 1.8;
  background: #fafafa;
  padding: 12px 14px;
  border-radius: 12px;
`;

const CareTipsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const CareTipItem = styled.li`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #424242;
  padding: 8px 12px;
  background: #f1f8f4;
  border-radius: 10px;
  margin-bottom: 6px;
  line-height: 1.6;
  display: flex;
  align-items: flex-start;
  gap: 8px;

  &::before {
    content: '🌿';
    flex-shrink: 0;
  }
`;

// Disease-focused styled components
const SeverityBadge = styled.span<{ $level: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 700;
  background: ${props => 
    props.$level === 'شدید' ? '#FFEBEE' :
    props.$level === 'متوسط' ? '#FFF3E0' :
    props.$level === 'خفیف' ? '#E8F5E9' : '#F5F5F5'};
  color: ${props => 
    props.$level === 'شدید' ? '#C62828' :
    props.$level === 'متوسط' ? '#E65100' :
    props.$level === 'خفیف' ? '#2E7D32' : '#757575'};
`;

const DiseaseTypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 600;
  background: #EDE7F6;
  color: #5E35B1;
`;

const ContagiousBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 600;
  background: #FCE4EC;
  color: #C62828;
`;

const BadgesRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const SymptomsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SymptomItem = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #D32F2F;
  padding: 8px 12px;
  background: #FFF8F8;
  border-radius: 10px;
  border-right: 3px solid #EF5350;
  line-height: 1.6;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TreatmentStepsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TreatmentStep = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #1B5E20;
  padding: 10px 14px;
  background: linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%);
  border-radius: 12px;
  border-right: 3px solid #4CAF50;
  line-height: 1.7;
  display: flex;
  align-items: flex-start;
  gap: 10px;
`;

const StepNumber = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #4CAF50;
  color: white;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
  margin-top: 1px;
`;

const PreventionItem = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #1565C0;
  padding: 8px 12px;
  background: #E3F2FD;
  border-radius: 10px;
  line-height: 1.6;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '🛡️';
    flex-shrink: 0;
  }
`;

const RecoveryBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
  border-radius: 14px;
  margin-bottom: 16px;
`;

const RecoveryIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 152, 0, 0.2);
  color: #E65100;
`;

const RecoveryText = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #E65100;
  font-weight: 600;
  line-height: 1.5;
`;

const SectionDivider = styled.div`
  height: 1px;
  background: linear-gradient(to right, transparent, #E0E0E0, transparent);
  margin: 16px 0;
`;

const SaveButton = styled.button`
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #EF5350 0%, #FF7043 100%);
  box-shadow: 0 4px 16px rgba(239, 83, 80, 0.3);

  &:hover { transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
`;

// Health History Section
const HistorySection = styled.div`
  margin: 16px 20px;
  animation: ${fadeIn} 0.5s ease 0.2s both;
`;

const HistoryTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #1B5E20;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HistoryCard = styled.div<{ $isResolved: boolean }>`
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border-right: 4px solid ${props => props.$isResolved ? '#4CAF50' : '#EF5350'};
  opacity: ${props => props.$isResolved ? 0.85 : 1};
`;

const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const HistoryDiseaseName = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #212121;
`;

const HistoryBadge = styled.span<{ $isResolved: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  background: ${props => props.$isResolved 
    ? 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)' 
    : 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)'};
  color: ${props => props.$isResolved ? '#2E7D32' : '#C62828'};
`;

const HistoryDate = styled.span`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #9E9E9E;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const HistoryImage = styled.img`
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 12px;
  margin: 8px 0;
`;

const HistoryTreatment = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #616161;
  margin: 8px 0 0 0;
  line-height: 1.7;
`;

const HistoryToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 6px 0;
  margin-top: 6px;
  cursor: pointer;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #42A5F5;
  transition: color 0.2s;
  &:hover { color: #1E88E5; }
`;

const HistoryDetails = styled.div<{ $isOpen: boolean }>`
  max-height: ${props => props.$isOpen ? '1000px' : '0'};
  overflow: hidden;
  transition: max-height 0.4s ease;
`;

const HistoryDetailField = styled.div`
  margin-top: 10px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 10px;
`;

const HistoryDetailLabel = styled.h5`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #757575;
  margin: 0 0 4px 0;
`;

const HistoryDetailValue = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #424242;
  margin: 0;
  line-height: 1.8;
`;

const HistoryCareTipItem = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #424242;
  padding: 6px 10px;
  background: #f1f8f4;
  border-radius: 8px;
  margin-top: 4px;
  line-height: 1.5;
`;

const ResolveButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
  cursor: pointer;
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;

  &:hover { transform: translateY(-1px); }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: #4CAF50;
`;

const EmptyText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #9E9E9E;
  margin: 0;
  line-height: 1.6;
`;

const ErrorCard = styled.div`
  margin: 20px;
  background: white;
  border-radius: 20px;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
`;

const ErrorText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 15px;
  color: #E53935;
  font-weight: 700;
  margin: 12px 0 4px 0;
`;

const ErrorHint = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 13px;
  color: #9E9E9E;
  margin: 0;
`;

// ===== Component =====
const PlantHealthScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [plantName, setPlantName] = useState<string>('');
  const [plantScientificName, setPlantScientificName] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<string>('healthy');
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  // Scan states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaUsageInfo, setQuotaUsageInfo] = useState<any>(null);

  const healthStatusLabels: Record<string, string> = {
    healthy: '🌿 سالم',
    needs_attention: '⚠️ نیاز به توجه',
    sick: '🏥 بیمار',
    recovering: '💊 در حال بهبود',
  };

  const healthStatusDescriptions: Record<string, string> = {
    healthy: 'گیاه شما سالم است و مشکلی مشاهده نشده',
    needs_attention: 'گیاه شما نیاز به توجه بیشتر دارد',
    sick: 'بیماری در گیاه شناسایی شده، لطفاً درمان را دنبال کنید',
    recovering: 'گیاه شما در حال بهبود است، مراقبت ادامه دهید',
  };

  // Fetch health data
  useEffect(() => {
    const fetchHealthData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');

        // Get plant info
        const plantRes = await axios.get(`${API_URL}/plants/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (plantRes.data.success) {
          const p = plantRes.data.plant;
          setPlantName(p.plant_name_fa || p.nickname || 'گیاه');
          setPlantScientificName(p.plant_scientific_name || '');
        }

        // Get health records
        const healthRes = await axios.get(`${API_URL}/plants/${id}/health`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (healthRes.data.success) {
          setHealthStatus(healthRes.data.healthStatus);
          setRecords(healthRes.data.records);
        }
      } catch (err) {
        console.error('خطا در دریافت اطلاعات سلامت:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHealthData();
  }, [id]);

  // Camera
  const takePhoto = async () => {
    try {
      if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
        const photo = await CapCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          width: 1024,
          height: 1024,
        });
        if (photo.base64String) {
          setBase64Image(photo.base64String);
          setSelectedImage(`data:image/jpeg;base64,${photo.base64String}`);
          setDiagnosisResult(null);
          setScanError(null);
          setSaved(false);
        }
      } else {
        fileInputRef.current?.click();
      }
    } catch (err) {
      console.log('دوربین لغو شد');
    }
  };

  const pickFromGallery = async () => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: 1024,
        height: 1024,
      });
      if (photo.base64String) {
        setBase64Image(photo.base64String);
        setSelectedImage(`data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`);
        setDiagnosisResult(null);
        setScanError(null);
        setSaved(false);
      }
    } catch (err: any) {
      if (err.message !== 'User cancelled photos app') {
        console.error('خطا در دسترسی به گالری:', err);
        // Fallback to file input
        fileInputRef.current?.click();
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSelectedImage(result);
        // Extract base64 from data URL
        const base64 = result.split(',')[1];
        setBase64Image(base64);
        setDiagnosisResult(null);
        setScanError(null);
        setSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setBase64Image(null);
    setDiagnosisResult(null);
    setScanError(null);
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // بررسی سهمیه قبل از اسکن
  const checkQuotaBeforeScan = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return true; // کاربر لاگین نکرده، بک‌اند خودش هندل می‌کنه
      const response = await axios.get(`${API_URL}/subscription/check/disease`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success && !response.data.allowed) {
        setQuotaUsageInfo(response.data);
        setShowQuotaModal(true);
        return false;
      }
      return true;
    } catch {
      return true; // در صورت خطا اجازه بده بک‌اند خودش هندل کنه
    }
  };

  // Disease scan with plant verification
  const handleScan = async () => {
    if (!base64Image) return;

    // بررسی سهمیه قبل از شروع اسکن
    const quotaOk = await checkQuotaBeforeScan();
    if (!quotaOk) return;

    setIsScanning(true);
    setScanError(null);
    setDiagnosisResult(null);
    setProgressStep(1);

    const progressTimer = setInterval(() => {
      setProgressStep(prev => prev < 3 ? prev + 1 : prev);
    }, 2500);

    try {
      // مرحله 1: بررسی اینکه تصویر مربوط به همین گیاه باشد
      if (plantScientificName) {
        const verifyResponse = await identifyPlantFromBase64(base64Image, 'image/jpeg', 'normal');
        if (verifyResponse.success && verifyResponse.data) {
          const identifiedName = verifyResponse.data.scientificName?.toLowerCase() || '';
          const expectedName = plantScientificName.toLowerCase();
          const confidence = verifyResponse.data.confidence || 0;

          // بررسی تطابق نام علمی یا جنس گیاه
          const expectedGenus = expectedName.split(' ')[0];
          const identifiedGenus = identifiedName.split(' ')[0];
          const isMatch = identifiedName.includes(expectedName) || 
                          expectedName.includes(identifiedName) ||
                          expectedGenus === identifiedGenus;

          if (!isMatch && confidence < 0.5) {
            clearInterval(progressTimer);
            setScanError(`تصویر ارسالی مربوط به ${plantName} نیست. لطفاً عکس همین گیاه را ارسال کنید.`);
            setIsScanning(false);
            return;
          }
        }
      }

      // مرحله 2: تشخیص تخصصی بیماری
      setProgressStep(2);
      const response = await diagnoseHealthFromBase64(base64Image, 'image/jpeg');

      clearInterval(progressTimer);
      setProgressStep(4);

      setTimeout(() => {
        if (response.success && response.data) {
          setDiagnosisResult(response.data);
        } else if ((response as any).upgradeRequired || (response as any).usageInfo) {
          // سهمیه در حین درخواست تمام شد (race condition)
          setQuotaUsageInfo((response as any).usageInfo || {
            used: 1, limit: 1, period: 'هفتگی', remaining: 0, tier: 'free'
          });
          setShowQuotaModal(true);
        } else {
          setScanError(response.message || 'خطا در تشخیص بیماری');
        }
        setIsScanning(false);
      }, 800);
    } catch (err) {
      clearInterval(progressTimer);
      setScanError('خطا در اتصال به سرور');
      setIsScanning(false);
    }
  };

  // Save health record
  const handleSaveRecord = async () => {
    if (!diagnosisResult || !id) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');

      const response = await axios.post(`${API_URL}/plants/${id}/health/diagnose`, {
        diagnosisResult: {
          disease: diagnosisResult.disease,
          disease_en: diagnosisResult.disease_en || null,
          healthStatus: diagnosisResult.healthStatus,
          description: diagnosisResult.description,
          treatment: diagnosisResult.treatment,
          careTips: diagnosisResult.careTips,
          confidence: diagnosisResult.confidence,
          // اطلاعات تخصصی بیماری
          disease_type: diagnosisResult.disease_type || null,
          severity: diagnosisResult.severity || null,
          is_contagious: diagnosisResult.is_contagious || false,
          symptoms: diagnosisResult.symptoms || [],
          cause: diagnosisResult.cause || null,
          treatment_steps: diagnosisResult.treatment_steps || [],
          prevention: diagnosisResult.prevention || [],
          recovery_time: diagnosisResult.recovery_time || null
        },
        imageBase64: base64Image
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSaved(true);
        setHealthStatus(response.data.healthStatus);
        // Refresh records
        const healthRes = await axios.get(`${API_URL}/plants/${id}/health`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (healthRes.data.success) {
          setRecords(healthRes.data.records);
        }
      }
    } catch (err) {
      console.error('خطا در ذخیره:', err);
    } finally {
      setSaving(false);
    }
  };

  // Resolve health issue
  const handleResolve = async (recordId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(`${API_URL}/plants/${id}/health/${recordId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setHealthStatus(response.data.healthStatus);
        setRecords(prev => prev.map(r => 
          r.id === recordId ? { ...r, is_resolved: true, resolved_at: new Date().toISOString() } : r
        ));
      }
    } catch (err) {
      console.error('خطا در رفع بیماری:', err);
    }
  };

  const toPersianDigits = (str: string): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.replace(/[0-9]/g, (d) => persianDigits[parseInt(d)]);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return toPersianDigits(date.toLocaleDateString('fa-IR', options));
  };

  const isSick = diagnosisResult && diagnosisResult.disease && 
    diagnosisResult.disease !== 'ندارد' && diagnosisResult.disease !== 'بدون بیماری';

  if (loading) {
    return (
      <ScreenContainer>
        <Header>
          <BackButton onClick={() => navigate(-1)}><ArrowRight size={24} /></BackButton>
          <HeaderTitle>پرونده سلامت</HeaderTitle>
        </Header>
        <ProgressContainer>
          <StepItem $completed={false} $active={true}>
            <StepSpinner />
            <StepText $completed={false} $active={true}>در حال بارگذاری...</StepText>
          </StepItem>
        </ProgressContainer>
      </ScreenContainer>
    );
  }

  return (
    <>
    <ScreenContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <ArrowRight size={24} />
        </BackButton>
        <HeaderTitle>پرونده سلامت {plantName}</HeaderTitle>
      </Header>

      {/* Health Status Card */}
      <HealthStatusCard $status={healthStatus}>
        <HealthStatusIcon $status={healthStatus}>
          {healthStatus === 'healthy' && <ShieldCheck size={28} />}
          {healthStatus === 'needs_attention' && <ShieldAlert size={28} />}
          {healthStatus === 'sick' && <HeartPulse size={28} />}
          {healthStatus === 'recovering' && <Shield size={28} />}
        </HealthStatusIcon>
        <HealthStatusInfo>
          <HealthStatusTitle>{healthStatusLabels[healthStatus] || 'نامشخص'}</HealthStatusTitle>
          <HealthStatusText>{healthStatusDescriptions[healthStatus]}</HealthStatusText>
        </HealthStatusInfo>
      </HealthStatusCard>

      {/* Scan Section */}
      {!isScanning && !diagnosisResult && (
        <ScanSection>
          <ScanTitle>
            <Camera size={18} />
            بررسی سلامت گیاه
          </ScanTitle>
          <ScanDescription>
            از قسمت بیمار یا مشکوک گیاه عکس بگیرید تا هوش مصنوعی آن را بررسی کند
          </ScanDescription>

          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
          />

          {selectedImage ? (
            <UploadArea $hasImage={true}>
              <PreviewImage src={selectedImage} alt="Preview" />
              <RemoveImageButton onClick={handleRemoveImage}>
                <X size={20} />
              </RemoveImageButton>
            </UploadArea>
          ) : (
            <UploadArea $hasImage={false} onClick={takePhoto}>
              <UploadIcon><Camera size={32} /></UploadIcon>
              <UploadText>عکس قسمت بیمار را بگیرید</UploadText>
              <UploadHint>دوربین گوشی شما باز می‌شود</UploadHint>
            </UploadArea>
          )}

          {!selectedImage ? (
            <ButtonsContainer>
              <ActionButton $primary onClick={takePhoto}>
                <Camera size={18} /> دوربین
              </ActionButton>
              <ActionButton onClick={pickFromGallery}>
                <Image size={18} /> گالری
              </ActionButton>
            </ButtonsContainer>
          ) : (
            <ButtonsContainer>
              <ActionButton $primary onClick={handleScan}>
                <HeartPulse size={18} /> بررسی بیماری
              </ActionButton>
              <ActionButton onClick={handleRemoveImage}>
                <X size={18} /> حذف
              </ActionButton>
            </ButtonsContainer>
          )}
        </ScanSection>
      )}

      {/* Scanning Progress */}
      {isScanning && (
        <ProgressContainer>
          <StepItem $completed={progressStep > 1} $active={progressStep === 1}>
            {progressStep > 1 ? <Check size={20} /> : progressStep === 1 ? <StepSpinner /> : <Circle size={20} />}
            <StepText $completed={progressStep > 1} $active={progressStep === 1}>
              ارسال تصویر برای بررسی
            </StepText>
          </StepItem>
          <StepItem $completed={progressStep > 2} $active={progressStep === 2}>
            {progressStep > 2 ? <Check size={20} /> : progressStep === 2 ? <StepSpinner /> : <Circle size={20} />}
            <StepText $completed={progressStep > 2} $active={progressStep === 2}>
              تحلیل علائم و نشانه‌ها
            </StepText>
          </StepItem>
          <StepItem $completed={progressStep > 3} $active={progressStep === 3}>
            {progressStep > 3 ? <Check size={20} /> : progressStep === 3 ? <StepSpinner /> : <Circle size={20} />}
            <StepText $completed={progressStep > 3} $active={progressStep === 3}>
              یافتن راهکارهای درمانی
            </StepText>
          </StepItem>
          <StepItem $completed={progressStep > 4} $active={progressStep === 4}>
            {progressStep > 4 ? <Check size={20} /> : progressStep === 4 ? <StepSpinner /> : <Circle size={20} />}
            <StepText $completed={progressStep > 4} $active={progressStep === 4}>
              آماده‌سازی گزارش
            </StepText>
          </StepItem>
        </ProgressContainer>
      )}

      {/* Scan Error */}
      {scanError && !isScanning && (
        <ErrorCard>
          <AlertCircle size={40} color="#E53935" />
          <ErrorText>خطا در بررسی</ErrorText>
          <ErrorHint>{scanError}</ErrorHint>
          <ActionButton $primary style={{ marginTop: 16 }} onClick={() => { setScanError(null); }}>
            تلاش مجدد
          </ActionButton>
        </ErrorCard>
      )}

      {/* Diagnosis Result */}
      {diagnosisResult && !isScanning && (
        <DiagnosisResultCard>
          {/* Header */}
          <DiagnosisHeader $isSick={isSick}>
            <DiagnosisIcon $isSick={isSick}>
              {isSick ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
            </DiagnosisIcon>
            <div>
              <DiagnosisTitle>
                {isSick ? `🦠 ${diagnosisResult.disease}` : 'گیاه سالم است ✓'}
              </DiagnosisTitle>
              <DiagnosisSubtitle>
                دقت تشخیص: {toPersianDigits(Math.round(diagnosisResult.confidence * 100).toString())}%
              </DiagnosisSubtitle>
            </div>
          </DiagnosisHeader>

          {/* Badges: Disease Type + Severity + Contagious */}
          {isSick && (
            <BadgesRow>
              {diagnosisResult.disease_type && diagnosisResult.disease_type !== 'ندارد' && (
                <DiseaseTypeBadge>
                  <Bug size={12} />
                  {diagnosisResult.disease_type}
                </DiseaseTypeBadge>
              )}
              {diagnosisResult.severity && diagnosisResult.severity !== 'ندارد' && (
                <SeverityBadge $level={diagnosisResult.severity}>
                  <Activity size={12} />
                  شدت: {diagnosisResult.severity}
                </SeverityBadge>
              )}
              {diagnosisResult.is_contagious && (
                <ContagiousBadge>
                  <AlertCircle size={12} />
                  مسری
                </ContagiousBadge>
              )}
            </BadgesRow>
          )}

          {/* Disease image */}
          {selectedImage && (
            <PreviewImage 
              src={selectedImage} 
              alt="Disease" 
              style={{ height: 180, borderRadius: 14, marginBottom: 16, objectFit: 'cover', width: '100%' }}
            />
          )}

          {/* Symptoms */}
          {isSick && diagnosisResult.symptoms && diagnosisResult.symptoms.length > 0 && (
            <DiagnosisField>
              <FieldLabel>⚠️ علائم مشاهده شده</FieldLabel>
              <SymptomsList>
                {diagnosisResult.symptoms.map((symptom: string, index: number) => (
                  <SymptomItem key={index}>
                    <Circle size={6} fill="#EF5350" />
                    {symptom}
                  </SymptomItem>
                ))}
              </SymptomsList>
            </DiagnosisField>
          )}

          {/* Cause */}
          {isSick && diagnosisResult.cause && (
            <DiagnosisField>
              <FieldLabel>🔍 علت بیماری</FieldLabel>
              <FieldValue>{diagnosisResult.cause}</FieldValue>
            </DiagnosisField>
          )}

          {/* Disease Description */}
          {diagnosisResult.description && (
            <DiagnosisField>
              <FieldLabel>📋 توضیحات بیماری</FieldLabel>
              <FieldValue>{diagnosisResult.description}</FieldValue>
            </DiagnosisField>
          )}

          <SectionDivider />

          {/* Treatment Steps */}
          {isSick && diagnosisResult.treatment_steps && diagnosisResult.treatment_steps.length > 0 && (
            <DiagnosisField>
              <FieldLabel>🩺 مراحل درمان</FieldLabel>
              <TreatmentStepsList>
                {diagnosisResult.treatment_steps.map((step: string, index: number) => (
                  <TreatmentStep key={index}>
                    <StepNumber>{toPersianDigits((index + 1).toString())}</StepNumber>
                    <span>{step.replace(/^مرحله\s*[۰-۹0-9]+\s*:\s*/i, '')}</span>
                  </TreatmentStep>
                ))}
              </TreatmentStepsList>
            </DiagnosisField>
          )}

          {/* General Treatment (fallback) */}
          {diagnosisResult.treatment && diagnosisResult.treatment !== 'نیاز به درمان خاصی ندارد' && 
           (!diagnosisResult.treatment_steps || diagnosisResult.treatment_steps.length === 0) && (
            <DiagnosisField>
              <FieldLabel>🩺 راهکار درمانی</FieldLabel>
              <FieldValue>{diagnosisResult.treatment}</FieldValue>
            </DiagnosisField>
          )}

          {/* Recovery Time */}
          {isSick && diagnosisResult.recovery_time && (
            <RecoveryBadge>
              <RecoveryIcon>
                <Clock size={18} />
              </RecoveryIcon>
              <RecoveryText>
                ⏱️ زمان تقریبی بهبودی: {diagnosisResult.recovery_time}
              </RecoveryText>
            </RecoveryBadge>
          )}

          {/* Prevention */}
          {diagnosisResult.prevention && diagnosisResult.prevention.length > 0 && (
            <DiagnosisField>
              <FieldLabel>🛡️ پیشگیری از تکرار</FieldLabel>
              <SymptomsList>
                {diagnosisResult.prevention.map((tip: string, index: number) => (
                  <PreventionItem key={index}>{tip}</PreventionItem>
                ))}
              </SymptomsList>
            </DiagnosisField>
          )}

          {/* Care Tips */}
          {diagnosisResult.careTips && diagnosisResult.careTips.length > 0 && (
            <DiagnosisField>
              <FieldLabel>🌿 نکات مراقبتی</FieldLabel>
              <CareTipsList>
                {diagnosisResult.careTips.map((tip: string, index: number) => (
                  <CareTipItem key={index}>{tip}</CareTipItem>
                ))}
              </CareTipsList>
            </DiagnosisField>
          )}

          {/* Save Button */}
          {!saved ? (
            <SaveButton onClick={handleSaveRecord} disabled={saving}>
              {saving ? 'در حال ذخیره...' : (
                <>
                  <Heart size={18} />
                  ثبت در پرونده سلامت
                </>
              )}
            </SaveButton>
          ) : (
            <SaveButton disabled style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)', boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)' }}>
              <CheckCircle size={18} />
              در پرونده ثبت شد ✓
            </SaveButton>
          )}

          {/* New Scan Button */}
          <ActionButton 
            style={{ marginTop: 10, width: '100%' }} 
            onClick={() => { handleRemoveImage(); setDiagnosisResult(null); }}
          >
            <Camera size={16} /> بررسی مجدد
          </ActionButton>
        </DiagnosisResultCard>
      )}

      {/* Health History */}
      <HistorySection>
        <HistoryTitle>
          <Clock size={18} />
          تاریخچه سلامت
        </HistoryTitle>

        {records.length === 0 ? (
          <EmptyState>
            <EmptyIcon><ShieldCheck size={36} /></EmptyIcon>
            <EmptyText>هنوز رکوردی در پرونده سلامت ثبت نشده</EmptyText>
          </EmptyState>
        ) : (
          records.map(record => {
            const isExpanded = expandedRecordId === record.id;
            // پارس کردن اطلاعات تخصصی از notes
            let extraData: any = null;
            try {
              if (record.notes) extraData = JSON.parse(record.notes);
            } catch {}
            return (
              <HistoryCard key={record.id} $isResolved={record.is_resolved}>
                <HistoryHeader>
                  <HistoryDiseaseName>
                    {record.disease_name === 'ندارد' ? '✅ سالم' : `🏥 ${record.disease_name}`}
                  </HistoryDiseaseName>
                  <HistoryBadge $isResolved={record.is_resolved}>
                    {record.is_resolved ? 'رفع شده' : 'فعال'}
                  </HistoryBadge>
                </HistoryHeader>

                <HistoryDate>
                  <Clock size={12} />
                  {formatDate(record.diagnosed_at)}
                </HistoryDate>

                {/* Severity & Type Badges */}
                {extraData && (extraData.severity || extraData.disease_type) && record.disease_name !== 'ندارد' && (
                  <BadgesRow style={{ marginTop: 8, marginBottom: 4 }}>
                    {extraData.disease_type && extraData.disease_type !== 'ندارد' && (
                      <DiseaseTypeBadge><Bug size={11} />{extraData.disease_type}</DiseaseTypeBadge>
                    )}
                    {extraData.severity && extraData.severity !== 'ندارد' && (
                      <SeverityBadge $level={extraData.severity}><Activity size={11} />شدت: {extraData.severity}</SeverityBadge>
                    )}
                    {extraData.is_contagious && (
                      <ContagiousBadge><AlertCircle size={11} />مسری</ContagiousBadge>
                    )}
                  </BadgesRow>
                )}

                {record.image_url && (
                  <HistoryImage src={getFullImageUrl(record.image_url)} alt="Disease" />
                )}

                {/* Toggle Details */}
                <HistoryToggle onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}
                </HistoryToggle>

                {/* Expandable Details */}
                <HistoryDetails $isOpen={isExpanded}>
                  {/* علائم */}
                  {extraData?.symptoms && extraData.symptoms.length > 0 && (
                    <HistoryDetailField>
                      <HistoryDetailLabel>⚠️ علائم مشاهده شده</HistoryDetailLabel>
                      {extraData.symptoms.map((s: string, i: number) => (
                        <HistoryCareTipItem key={i} style={{ background: '#FFF8F8', color: '#D32F2F', borderRight: '3px solid #EF5350' }}>
                          • {s}
                        </HistoryCareTipItem>
                      ))}
                    </HistoryDetailField>
                  )}

                  {/* علت */}
                  {extraData?.cause && (
                    <HistoryDetailField>
                      <HistoryDetailLabel>🔍 علت بیماری</HistoryDetailLabel>
                      <HistoryDetailValue>{extraData.cause}</HistoryDetailValue>
                    </HistoryDetailField>
                  )}

                  {/* توضیحات بیماری */}
                  {record.description && (
                    <HistoryDetailField>
                      <HistoryDetailLabel>📋 توضیحات</HistoryDetailLabel>
                      <HistoryDetailValue>{record.description}</HistoryDetailValue>
                    </HistoryDetailField>
                  )}

                  {/* مراحل درمان */}
                  {extraData?.treatment_steps && extraData.treatment_steps.length > 0 && (
                    <HistoryDetailField>
                      <HistoryDetailLabel>🩺 مراحل درمان</HistoryDetailLabel>
                      {extraData.treatment_steps.map((step: string, i: number) => (
                        <HistoryCareTipItem key={i} style={{ background: '#E8F5E9', color: '#1B5E20', borderRight: '3px solid #4CAF50' }}>
                          {toPersianDigits((i + 1).toString())}. {step.replace(/^مرحله\s*[\u06F0-\u06F90-9]+\s*:\s*/i, '')}
                        </HistoryCareTipItem>
                      ))}
                    </HistoryDetailField>
                  )}

                  {/* درمان خلاصه (اگر مراحل نبود) */}
                  {record.treatment && record.treatment !== 'نیاز به درمان خاصی ندارد' && 
                   (!extraData?.treatment_steps || extraData.treatment_steps.length === 0) && (
                    <HistoryDetailField>
                      <HistoryDetailLabel>🩺 راهکار درمانی</HistoryDetailLabel>
                      <HistoryDetailValue>{record.treatment}</HistoryDetailValue>
                    </HistoryDetailField>
                  )}

                  {/* زمان بهبودی */}
                  {extraData?.recovery_time && (
                    <HistoryDetailField>
                      <HistoryDetailLabel>⏱️ زمان بهبودی</HistoryDetailLabel>
                      <HistoryDetailValue style={{ background: '#FFF3E0', color: '#E65100' }}>
                        {extraData.recovery_time}
                      </HistoryDetailValue>
                    </HistoryDetailField>
                  )}

                  {/* پیشگیری */}
                  {extraData?.prevention && extraData.prevention.length > 0 && (
                    <HistoryDetailField>
                      <HistoryDetailLabel>🛡️ پیشگیری</HistoryDetailLabel>
                      {extraData.prevention.map((tip: string, i: number) => (
                        <HistoryCareTipItem key={i} style={{ background: '#E3F2FD', color: '#1565C0' }}>
                          🛡️ {tip}
                        </HistoryCareTipItem>
                      ))}
                    </HistoryDetailField>
                  )}

                  {/* نکات مراقبتی */}
                  {record.care_tips && record.care_tips.length > 0 && (
                    <HistoryDetailField>
                      <HistoryDetailLabel>🌿 نکات مراقبتی</HistoryDetailLabel>
                      {record.care_tips.map((tip, i) => (
                        <HistoryCareTipItem key={i}>🌿 {tip}</HistoryCareTipItem>
                      ))}
                    </HistoryDetailField>
                  )}
                </HistoryDetails>

                {!record.is_resolved && record.disease_name !== 'ندارد' && (
                  <ResolveButton onClick={() => handleResolve(record.id)}>
                    <CheckCircle size={14} />
                    بیماری رفع شد
                  </ResolveButton>
                )}
              </HistoryCard>
            );
          })
        )}
      </HistorySection>
    </ScreenContainer>

    {/* Quota Exhausted Modal */}
    <QuotaExhaustedModal
      isOpen={showQuotaModal}
      onClose={() => setShowQuotaModal(false)}
      usageInfo={quotaUsageInfo || { used: 1, limit: 1, period: 'هفتگی', remaining: 0, tier: 'free' }}
      featureType="disease"
    />
    </>
  );
};

export default PlantHealthScreen;
