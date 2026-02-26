import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ArrowRight, MessageSquare, Clock, Calendar, Bot, User, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://130.185.76.46:4380/api';

interface ChatHistoryItem {
  id: number;
  plant_id: number | null;
  plant_name: string;
  question: string;
  answer: string;
  created_at: string;
  is_user_plant: boolean;
}

const ScreenContainer = styled.div`
  min-height: calc(100vh - 90px);
  background: #f8f9fa;
  padding-bottom: 20px;
  direction: rtl;
`;

const Header = styled.div`
  background: #ffffff;
  padding: 16px 20px;
  padding-top: calc(env(safe-area-inset-top, 16px) + 16px);
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
`;

const BackButton = styled.button`
  background: #f5f5f5;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  &:hover {
    background: #eeeeee;
  }
`;

const HeaderTitle = styled.h1`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #2e7d32;
  margin: 0;
  flex: 1;
`;

const ListContainer = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ChatCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: 1px solid #f0f0f0;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f5f5;
`;

const PlantBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: #e8f5e9;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #2e7d32;
`;

const DateText = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #9e9e9e;
`;

const QuestionSection = styled.div`
  margin-bottom: 12px;
`;

const QuestionLabel = styled.div`
  font-size: 12px;
  color: #757575;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const QuestionText = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  font-weight: 600;
  color: #424242;
  font-size: 14px;
  line-height: 1.6;
`;

const AnswerSection = styled.div`
  background: #f1f8e9;
  border-radius: 12px;
  padding: 12px;
  margin-top: 12px;
`;

const AnswerLabel = styled.div`
  font-size: 12px;
  color: #558b2f;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
`;

const AnswerText = styled.div`
  font-family: 'Vazirmatn', sans-serif;
  color: #33691e;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 40px;
  color: #4CAF50;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #9e9e9e;
  
  svg {
    width: 60px;
    height: 60px;
    color: #e0e0e0;
    margin-bottom: 16px;
  }
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #bdbdbd;

  &:hover {
    background: #ffebee;
    color: #e53935;
  }
`;

const ConfirmOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
`;

const ConfirmDialog = styled.div`
  background: white;
  border-radius: 20px;
  padding: 28px 24px;
  width: 85%;
  max-width: 340px;
  text-align: center;
  direction: rtl;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const ConfirmTitle = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;
`;

const ConfirmText = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #757575;
  margin: 0 0 20px 0;
  line-height: 1.6;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
`;

const ConfirmBtn = styled.button<{ $danger?: boolean }>`
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$danger ? 'linear-gradient(135deg, #e53935, #c62828)' : '#f5f5f5'};
  color: ${props => props.$danger ? 'white' : '#616161'};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.$danger ? '0 4px 12px rgba(229, 57, 53, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)'};
  }
`;

const SmartChatScreen: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ChatHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setHistory(response.data.history);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleCardClick = (item: ChatHistoryItem) => {
    if (item.plant_id) {
      const sourceQuery = item.is_user_plant ? '?source=garden' : '';
      navigate(`/plant/${item.plant_id}${sourceQuery}`, { state: { openChat: true } });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, item: ChatHistoryItem) => {
    e.stopPropagation();
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !deleteTarget.plant_id) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_URL}/chat/${deleteTarget.plant_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(prev => prev.filter(h => h.plant_id !== deleteTarget.plant_id));
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <ScreenContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <ArrowRight size={20} />
        </BackButton>
        <HeaderTitle>دستیار هوشمند گلدان</HeaderTitle>
      </Header>

      {loading ? (
        <LoadingSpinner>در حال دریافت مکالمات...</LoadingSpinner>
      ) : history.length === 0 ? (
        <EmptyState>
          <Bot />
          <p>هنوز سوالی از هوش مصنوعی نپرسیده‌اید</p>
        </EmptyState>
      ) : (
        <ListContainer>
          {history.map((item) => (
            <ChatCard key={item.id} onClick={() => handleCardClick(item)} style={{ cursor: item.plant_id ? 'pointer' : 'default' }}>
              <CardHeader>
                <PlantBadge>
                  <Bot size={14} />
                  {item.plant_name || 'سوال کلی'}
                </PlantBadge>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DateText>
                    <Clock size={12} />
                    {formatDate(item.created_at)}
                  </DateText>
                  <DeleteButton onClick={(e) => handleDeleteClick(e, item)}>
                    <Trash2 size={16} />
                  </DeleteButton>
                </div>
              </CardHeader>
              
              <QuestionSection>
                <QuestionText>مشاهده گفتگو درباره {item.plant_name || 'گیاه'}</QuestionText>
              </QuestionSection>

            </ChatCard>
          ))}
        </ListContainer>
      )}

      {deleteTarget && (
        <ConfirmOverlay onClick={() => setDeleteTarget(null)}>
          <ConfirmDialog onClick={(e) => e.stopPropagation()}>
            <ConfirmTitle>حذف گفتگو</ConfirmTitle>
            <ConfirmText>
              آیا از حذف گفتگوی «{deleteTarget.plant_name || 'سوال کلی'}» مطمئن هستید؟
            </ConfirmText>
            <ConfirmButtons>
              <ConfirmBtn onClick={() => setDeleteTarget(null)}>انصراف</ConfirmBtn>
              <ConfirmBtn $danger onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'در حال حذف...' : 'حذف'}
              </ConfirmBtn>
            </ConfirmButtons>
          </ConfirmDialog>
        </ConfirmOverlay>
      )}
    </ScreenContainer>
  );
};

export default SmartChatScreen;
