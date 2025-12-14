import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
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

function App() {
  return (
    <Router>
      <AppContainer>
        <MainContent>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/diagnosis" element={<DiagnosisScreen />} />
            <Route path="/search" element={<SearchScreen />} />
            <Route path="/garden" element={<GardenScreen />} />
            <Route path="/plant/:id" element={<PlantDetailScreen />} />
            <Route path="/weather" element={<WeatherConditionScreen />} />
            <Route path="/analysis" element={<AnalysisScreen />} />
            <Route path="/recommendation" element={<PlantRecommendationScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
          </Routes>
        </MainContent>
        <BottomNavigation />
      </AppContainer>
    </Router>
  );
}

export default App;
