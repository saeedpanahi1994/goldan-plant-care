import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { X, Droplets, Check, Calendar, Clock } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://130.185.76.46:4380/api';
const COMPLETED_STORAGE_KEY = 'wateringCompletedMap';
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const toStartOfUTCDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

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

const writeCompletedMap = (map: Record<string, string>) => {
  localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(map));
};

const slideUp = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const ModalOverlay = styled.div<{ $closing: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: ${props => props.$closing ? fadeOut : 'fadeIn'} 0.3s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div<{ $closing: boolean }>`
  background: white;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  animation: ${props => props.$closing ? css`${slideUp} 0.3s ease-in reverse` : css`${slideUp} 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)`};
  overflow: hidden;
`;

const Header = styled.div`
  padding: 20px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 20px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
`;

const CloseButton = styled.button`
  background: #f5f5f5;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #757575;
  
  &:hover {
    background: #eeeeee;
    color: #424242;
  }
`;

const Title = styled.h2`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #2e7d32;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ReminderList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #757575;
  margin: 12px 0 8px 0;
  padding-right: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:first-child {
    margin-top: 0;
  }
`;

const ReminderCard = styled.div<{ $completed?: boolean }>`
  background: ${props => props.$completed ? '#f9f9f9' : '#ffffff'};
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
  opacity: ${props => props.$completed ? 0.6 : 1};
  
  &:hover {
    border-color: #e0e0e0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  }
`;

const PlantImage = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  object-fit: cover;
`;

const PlantInfo = styled.div`
  flex: 1;
`;

const PlantName = styled.div<{ $completed?: boolean }>`
  font-family: 'Vazirmatn', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #424242;
  margin-bottom: 4px;
  text-decoration: ${props => props.$completed ? 'line-through' : 'none'};
`;

const ReminderDetail = styled.div<{ $color: string }>`
  font-size: 11px;
  color: ${props => props.$color};
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
`;

// Droplet logic:
// Tomorrow: Low level (blue/green)
// Today: Empty/Medium (Yellow/Orange)
// Past: Empty/Danger (Red)
const DropletIcon = styled.div<{ $status: 'past' | 'today' | 'tomorrow' }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Removed cursor pointer as action is now separate */
  background: ${props => 
    props.$status === 'past' ? '#ffebee' : 
    props.$status === 'today' ? '#fff3e0' : '#e8f5e9'};
  color: ${props => 
    props.$status === 'past' ? '#ef5350' : 
    props.$status === 'today' ? '#fb8c00' : '#4caf50'};
  transition: all 0.2s;

  svg {
    fill: ${props => 
      props.$status === 'tomorrow' ? 'currentColor' : 'none'};
  }
`;

const ActionButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #f1f8e9;
  color: #4caf50;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 4px;

  &:hover {
    background: #4caf50;
    color: white;
    transform: scale(1.05);
  }
`;

// Custom Droplet SVG to match user request better
const StyledDroplet = ({ status }: { status: 'past' | 'today' | 'tomorrow' }) => {
  const color = status === 'past' ? '#f44336' : status === 'today' ? '#ff9800' : '#4CAF50';
  
  // SVG path for a droplet
  // Fill strategy:
  // Tomorrow: Filled bottom (looks like water)
  // Today: Empty (needs water)
  // Past: Red outlined or very low level
  
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-6-9-7-10.32L5 15a7 7 0 0 0 7 7z" />
      {/* Internal "Water Level" */}
      {status === 'tomorrow' && (
        <path d="M6.3 19 L17.7 19 A 7 7 0 0 1 12 22 A 7 7 0 0 1 6.3 19 Z" fill={color} stroke="none" opacity="0.6" />
      )}
      {status === 'past' && (
         <path d="M12 22a7 7 0 0 0 7-7c0-.2 0-.4-.1-.6H5.1c0 .2-.1.4-.1.6a7 7 0 0 0 7 7z" fill={color} stroke="none" opacity="0.8" />
      )}
    </svg>
  );
};

interface NotificationPlant {
  id: string; // Plant ID
  name: string;
  image: string;
  daysUntil: number;
  status: 'past' | 'today' | 'tomorrow';
  completed?: boolean;
}

const WateringModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [closing, setClosing] = useState(false);
  const [reminders, setReminders] = useState<NotificationPlant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
    }
  }, [isOpen]);

  const fetchReminders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/plants`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const allPlants: any[] = response.data.plants;
        const upcoming: NotificationPlant[] = [];
        const completedMap = readCompletedMap();
        const todayKey = getTodayKey();

        allPlants.forEach(plant => {
            const nextWatering = new Date(plant.next_watering_at);
            const now = new Date();
            const diffMs = toStartOfUTCDay(nextWatering).getTime() - toStartOfUTCDay(now).getTime();
            const diffDays = Math.round(diffMs / MS_PER_DAY);

            let status: 'past' | 'today' | 'tomorrow' | null = null;
            
            if (diffDays < 0) status = 'past';
            else if (diffDays === 0) status = 'today'; // Assuming 0 implies today
            else if (diffDays === 1) status = 'tomorrow';

            if (status) {
              upcoming.push({
                id: plant.id,
                name: plant.nickname || plant.plant_name_fa,
                image: plant.plant_image,
                daysUntil: diffDays,
                status,
                completed: completedMap[plant.id] === todayKey
              });
            }
        });
        
        // Sort: Past first, then Today, then Tomorrow
        upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
        
        setReminders(upcoming);
      }
    } catch (error) {
      console.error('Error fetching reminders', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWater = async (plantId: string) => {
    try {
        const token = localStorage.getItem('authToken');
        await axios.post(`${API_URL}/plants/${plantId}/water`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const completedMap = readCompletedMap();
        completedMap[plantId] = getTodayKey();
        writeCompletedMap(completedMap);

        // Mark as completed locally
        setReminders(prev => {
          const next = prev.map(p =>
            p.id === plantId ? { ...p, completed: true } : p
          );
          const allCompleted = next.every(p => p.completed);
          if (allCompleted) {
            setTimeout(() => handleClose(), 1000);
          }
          return next;
        });

        window.dispatchEvent(new Event('watering-updated'));
    } catch (error) {
        console.error('Error watering plant', error);
        alert('خطا در ثبت آبیاری. لطفا مجددا تلاش کنید.');
    }
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
        setClosing(false);
        onClose();
    }, 300);
  };

  if (!isOpen && !closing) return null;

  const pastReminders = reminders.filter(r => r.status === 'past');
  const todayReminders = reminders.filter(r => r.status === 'today');
  const tmrwReminders = reminders.filter(r => r.status === 'tomorrow');

  return (
    <ModalOverlay $closing={closing} onClick={handleClose}>
      <ModalContent $closing={closing} onClick={e => e.stopPropagation()}>
        <Header>
          <Title>
            <Droplets size={20} />
            یادآوری‌های آبیاری
          </Title>
          <CloseButton onClick={handleClose}>
            <X size={20} />
          </CloseButton>
        </Header>

        {loading ? (
           <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>در حال بررسی وضعیت گیاهان...</div>
        ) : reminders.length === 0 ? (
           <div style={{ padding: 40, textAlign: 'center', color: '#4CAF50' }}>
               <Check size={48} style={{ marginBottom: 16 }} />
               <p>همه گیاهان سیراب هستند! 🌱</p>
           </div>
        ) : (
          <ReminderList>
            
            {pastReminders.length > 0 && (
                <>
                    <SectionTitle>
                        <Clock size={16} />
                        فراموش شده‌ها
                    </SectionTitle>
                    {pastReminders.map(item => (
                        <ReminderCard key={item.id} $completed={item.completed}>
                            <PlantImage src={item.image.startsWith('http') ? item.image : `http://130.185.76.46:4380${item.image}`} />
                            <PlantInfo>
                                <PlantName $completed={item.completed}>{item.name}</PlantName>
                                <ReminderDetail $color={item.completed ? '#9e9e9e' : "#ef5350"}>
                                    {item.completed ? "انجام شد" : `${Math.abs(item.daysUntil)} روز تاخیر`}
                                </ReminderDetail>
                            </PlantInfo>
                            <DropletIcon $status="past">
                                <StyledDroplet status="past" />
                            </DropletIcon>
                            {!item.completed && (
                                <ActionButton onClick={() => handleWater(item.id)}>
                                    <Check size={20} />
                                </ActionButton>
                            )}
                        </ReminderCard>
                    ))}
                </>
            )}

            {todayReminders.length > 0 && (
                <>
                    <SectionTitle>
                        <Calendar size={16} />
                        امروز
                    </SectionTitle>
                    {todayReminders.map(item => (
                        <ReminderCard key={item.id} $completed={item.completed}>
                            <PlantImage src={item.image.startsWith('http') ? item.image : `http://130.185.76.46:4380${item.image}`} />
                            <PlantInfo>
                                <PlantName $completed={item.completed}>{item.name}</PlantName>
                                <ReminderDetail $color={item.completed ? '#9e9e9e' : "#fb8c00"}>
                                    {item.completed ? "انجام شد" : "زمان آبیاری فرا رسیده"}
                                </ReminderDetail>
                            </PlantInfo>
                            <DropletIcon $status="today">
                                <StyledDroplet status="today" />
                            </DropletIcon>
                            {!item.completed && (
                                <ActionButton onClick={() => handleWater(item.id)}>
                                    <Check size={20} />
                                </ActionButton>
                            )}
                        </ReminderCard>
                    ))}
                </>
            )}

            {tmrwReminders.length > 0 && (
                <>
                     <SectionTitle>
                        <Calendar size={16} />
                        فردا
                    </SectionTitle>
                    {tmrwReminders.map(item => (
                        <ReminderCard key={item.id} $completed={item.completed}>
                            <PlantImage src={item.image.startsWith('http') ? item.image : `http://130.185.76.46:4380${item.image}`} />
                            <PlantInfo>
                                <PlantName $completed={item.completed}>{item.name}</PlantName>
                                <ReminderDetail $color={item.completed ? '#9e9e9e' : "#4caf50"}>
                                    {item.completed ? "انجام شد" : "فردا نوبت آبیاری است"}
                                </ReminderDetail>
                            </PlantInfo>
                            <DropletIcon $status="tomorrow">
                                <StyledDroplet status="tomorrow" />
                            </DropletIcon>
                            {!item.completed && (
                                <ActionButton onClick={() => handleWater(item.id)}>
                                    <Check size={20} />
                                </ActionButton>
                            )}
                        </ReminderCard>
                    ))}
                </>
            )}

          </ReminderList>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default WateringModal;
