import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNavigation from './components/BottomNavigation';
import HomeScreen from './screens/HomeScreen';
import DiagnosisScreen from './screens/DiagnosisScreen';
import SearchScreen from './screens/SearchScreen';
import GardenScreen from './screens/GardenScreen';
import ProfileScreen from './screens/ProfileScreen';
import PlantDetailScreen from './screens/PlantDetailScreen';
import WeatherConditionScreen from './screens/WeatherConditionScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import PlantRecommendationScreen from './screens/PlantRecommendationScreen';
import PlantIdentifyScreen from './screens/PlantIdentifyScreen';
import PlantBankScreen from './screens/PlantBankScreen';
import SmartChatScreen from './screens/SmartChatScreen';
import LoginScreen from './screens/LoginScreen';
import OTPVerifyScreen from './screens/OTPVerifyScreen';
import './App.css';

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  direction: rtl;
  text-align: right;
  font-family: 'Vazirmatn', 'Estedad', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
`;

const MainContent = styled.main`
  flex: 1;
  padding-bottom: 90px; /* Space for bottom navigation */
  overflow-x: hidden;
  direction: rtl;
  text-align: right;
`;

const AuthMainContent = styled.main`
  flex: 1;
  overflow-x: hidden;
  direction: rtl;
  text-align: right;
`;

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 30%, #a5d6a7 70%, #81c784 100%);
`;

const LoadingLogo = styled.div`
  width: 100px;
  height: 100px;
  background: white;
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 40px rgba(76, 175, 80, 0.2);
  margin-bottom: 24px;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
`;

const LoadingText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  color: #1b5e20;
  margin: 0;
`;

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingLogo>
          <span style={{ fontSize: 48 }}>🌱</span>
        </LoadingLogo>
        <LoadingText>در حال بارگذاری...</LoadingText>
      </LoadingContainer>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Auth Route Component (for login/otp pages)
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingLogo>
          <span style={{ fontSize: 48 }}>🌱</span>
        </LoadingLogo>
        <LoadingText>در حال بارگذاری...</LoadingText>
      </LoadingContainer>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Main App Content
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // مدیریت دکمه Back اندروید
  useEffect(() => {
    let listenerHandle: any = null;
    
    const setupBackButtonListener = async () => {
      listenerHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
        // صفحات اصلی که نباید از آنها به عقب برگردیم (خروج از برنامه)
        const mainPages = ['/', '/garden', '/login'];
        
        if (mainPages.includes(location.pathname)) {
          // در صفحه اصلی هستیم - از برنامه خارج شو
          CapApp.exitApp();
        } else if (canGoBack || window.history.length > 1) {
          // می‌توانیم به عقب برگردیم
          navigate(-1);
        } else {
          // اگر نمی‌توانیم به عقب برگردیم، به صفحه اصلی برو
          navigate('/');
        }
      });
    };
    
    setupBackButtonListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate, location.pathname]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingLogo>
          <span style={{ fontSize: 48 }}>🌱</span>
        </LoadingLogo>
        <LoadingText>در حال بارگذاری...</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <AppContainer>
      {isAuthenticated ? (
        // Authenticated routes
        <>
          <MainContent>
            <Routes>
              <Route path="/" element={<ProtectedRoute><GardenScreen /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
              <Route path="/diagnosis" element={<ProtectedRoute><DiagnosisScreen /></ProtectedRoute>} />
              <Route path="/identify" element={<ProtectedRoute><PlantIdentifyScreen /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><SearchScreen /></ProtectedRoute>} />
              <Route path="/garden" element={<ProtectedRoute><GardenScreen /></ProtectedRoute>} />
              <Route path="/plant-bank" element={<ProtectedRoute><PlantBankScreen /></ProtectedRoute>} />
              <Route path="/plant/:id" element={<ProtectedRoute><PlantDetailScreen /></ProtectedRoute>} />
              <Route path="/plant-detail/:id" element={<ProtectedRoute><PlantDetailScreen /></ProtectedRoute>} />
              <Route path="/weather" element={<ProtectedRoute><WeatherConditionScreen /></ProtectedRoute>} />
              <Route path="/analysis" element={<ProtectedRoute><AnalysisScreen /></ProtectedRoute>} />
              <Route path="/recommendation" element={<ProtectedRoute><PlantRecommendationScreen /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
              <Route path="/smart-chat" element={<ProtectedRoute><SmartChatScreen /></ProtectedRoute>} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/verify-otp" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MainContent>
          <BottomNavigation />
        </>
      ) : (
        // Auth routes (no bottom navigation)
        <AuthMainContent>
          <Routes>
            <Route path="/login" element={<AuthRoute><LoginScreen /></AuthRoute>} />
            <Route path="/verify-otp" element={<AuthRoute><OTPVerifyScreen /></AuthRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthMainContent>
      )}
    </AppContainer>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
