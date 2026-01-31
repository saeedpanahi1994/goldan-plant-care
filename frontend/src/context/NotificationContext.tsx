import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import WateringModal from '../components/WateringModal';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  hasReminders: boolean;
  refreshReminders: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const API_URL = 'http://130.185.76.46:4380/api';
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const COMPLETED_STORAGE_KEY = 'wateringCompletedMap';

const getTodayKey = () => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const readCompletedMap = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasReminders, setHasReminders] = useState(false);
  const { isAuthenticated } = useAuth();

  const checkForReminders = async () => {
    if (!isAuthenticated) return;
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Check plants locally like the modal does, or use a specific endpoint
        // Since we want to know if there are reminders without fetching EVERYTHING if possible,
        // but currently we probably need to fetch plants.
        // For efficiency, let's just assume we check the same logic or the endpoint provides a summary.
        // Re-using the logic from WateringModal is best done by having shared state or the Modal handling it.
        // Actually, let's simplify: 
        // We will fetch the plants here to determine the badge status.
        
        const response = await axios.get(`${API_URL}/plants`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          const plants: any[] = response.data.plants;
          const completedMap = readCompletedMap();
          const todayKey = getTodayKey();
          const needsWater = plants.some(p => {
            const completedToday = completedMap[p.id] === todayKey;
            if (completedToday) return false;
                const nextWatering = new Date(p.next_watering_at);
                const now = new Date();
                const diffMs = toStartOfDay(nextWatering).getTime() - toStartOfDay(now).getTime();
                const diffDays = Math.round(diffMs / MS_PER_DAY);
            return diffDays <= 1; // Past, Today, Tomorrow
          });
            
            setHasReminders(needsWater);
            
            // Auto-open logic (transferred from App.tsx)
            // Only auto-open if there ARE reminders
            if (needsWater) {
                const hasShown = sessionStorage.getItem('wateringModalShown');
                if (!hasShown) {
                    setIsModalOpen(true);
                    sessionStorage.setItem('wateringModalShown', 'true');
                }
            }
        }
    } catch (error) {
        console.error('Error checking reminders', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
        checkForReminders();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = () => {
      if (isAuthenticated) {
        checkForReminders();
      }
    };
    window.addEventListener('watering-updated', handler);
    return () => window.removeEventListener('watering-updated', handler);
  }, [isAuthenticated]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const refreshReminders = () => checkForReminders();

  return (
    <NotificationContext.Provider value={{ isModalOpen, openModal, closeModal, hasReminders, refreshReminders }}>
      {children}
      {isAuthenticated && (
          <WateringModal 
            isOpen={isModalOpen} 
            onClose={closeModal} 
          />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
