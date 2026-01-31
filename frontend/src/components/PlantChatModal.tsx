import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Send, Bot, User, Sparkles, MessageCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://130.185.76.46:4380/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface PlantChatProps {
  isOpen: boolean;
  onClose: () => void;
  plantName: string;
  plantId: number;
  plantContext?: any; // اطلاعات گیاه برای ارسال به هوش مصنوعی
}

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: flex-end;
  justify-content: center;
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.3s ease;
`;

const Container = styled.div`
  width: 100%;
  height: 95vh;
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideUp} 0.3s ease-out;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 10000;
  
  @media (min-width: 768px) {
    width: 400px;
    height: 600px;
    border-radius: 24px;
    margin-bottom: 20px;
  }
`;

const Header = styled.div`
  padding: 16px 20px;
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
  box-shadow: 0 2px 10px rgba(76, 175, 80, 0.2);
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Vazirmatn', sans-serif;
  font-weight: 700;
  font-size: 16px;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ChatArea = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f5f9f5;
  
  /* اسکرول بار زیبا */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0,0,0,0.1);
    border-radius: 3px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #757575;
  text-align: center;
  padding: 0 40px;
  gap: 16px;
`;

const EmptyStateIcon = styled.div`
  width: 80px;
  height: 80px;
  background: #e8f5e9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 40px;
    height: 40px;
    color: #4CAF50;
  }
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 16px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
  align-self: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  
  background: ${props => props.$isUser 
    ? 'linear-gradient(135deg, #4CAF50 0%, #43A047 100%)' 
    : '#ffffff'};
  
  color: ${props => props.$isUser ? '#ffffff' : '#424242'};
  
  border-bottom-right-radius: ${props => props.$isUser ? '4px' : '16px'};
  border-bottom-left-radius: ${props => props.$isUser ? '16px' : '4px'};
  
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);

  ${props => !props.$isUser && `
    border: 1px solid #e0e0e0;
  `}
`;

const LoadingBubble = styled(MessageBubble)`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 16px;
  min-width: 60px;
  justify-content: center;
`;

const Dot = styled.div`
  width: 6px;
  height: 6px;
  background: #9e9e9e;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
  
  &:nth-child(1) { animation-delay: -0.32s; }
  &:nth-child(2) { animation-delay: -0.16s; }
  
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
`;

const SuggestionContainer = styled.div`
  padding: 12px 20px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const SuggestionChip = styled.button`
  padding: 8px 16px;
  background: #f1f8e9;
  border: 1px solid #c8e6c9;
  border-radius: 20px;
  white-space: nowrap;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 12px;
  color: #2e7d32;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #e8f5e9;
    border-color: #4CAF50;
  }
`;

const InputArea = styled.div`
  padding: 16px 20px;
  background: #ffffff;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  direction: rtl;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #4CAF50;
  }
  
  &::placeholder {
    color: #bdbdbd;
  }
`;

const SendButton = styled.button`
  width: 44px;
  height: 44px;
  background: #4CAF50;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: transform 0.2s, background 0.2s;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);

  &:hover {
    background: #43A047;
    transform: scale(1.05);
  }
  
  &:disabled {
    background: #e0e0e0;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  svg {
    margin-right: 2px; /* اصلاح نشانه بصری آیکون ارسال */
  }
`;

const PlantChatModal: React.FC<PlantChatProps> = ({ isOpen, onClose, plantName, plantId, plantContext }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const defaultQuestions = [
    'نحوه آبیاری این گیاه؟',
    'نور مناسب چقدره؟',
    'چه کودی بدم؟',
    'مشکلات رایجش چیه؟'
  ];

  // Fetch History on Open
  useEffect(() => {
    if (isOpen && plantId) {
      fetchHistory();
    }
  }, [isOpen, plantId]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_URL}/chat/plant/${plantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Convert format to Message
        const historyMessages: Message[] = [];
        response.data.messages.forEach((item: any) => {
          historyMessages.push({
            id: `q-${item.id}`,
            text: item.question,
            sender: 'user',
            timestamp: new Date(item.created_at)
          });
          historyMessages.push({
            id: `a-${item.id}`,
            text: item.answer,
            sender: 'ai',
            timestamp: new Date(item.created_at)
          });
        });
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Error fetching chat history', error);
    }
  };

  // اسکرول اتوماتیک به پایین
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      // ارسال درخواست به سرور
      const response = await axios.post(`${API_URL}/chat/ask`, {
        plantId,
        plantName,
        question: text,
        context: plantContext
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.data.answer,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'متأسفانه مشکلی در ارتباط با هوش مصنوعی پیش آمد. لطفاً دوباره تلاش کنید.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay $isOpen={isOpen} onClick={onClose}>
      <Container onClick={e => e.stopPropagation()}>
        <Header>
          <HeaderTitle>
            <Sparkles size={20} />
            دستیار هوشمند گلدان
          </HeaderTitle>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </Header>

        <ChatArea>
          {messages.length === 0 ? (
            <EmptyState>
              <EmptyStateIcon>
                <Bot />
              </EmptyStateIcon>
              <p style={{ fontWeight: 700, color: '#424242' }}>دستیار شما درباره {plantName}</p>
              <p style={{ fontSize: '14px' }}>هر سوالی دارید بپرسید، هوش مصنوعی گلدان پاسخ می‌دهد.</p>
            </EmptyState>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} $isUser={msg.sender === 'user'}>
                {msg.text}
              </MessageBubble>
            ))
          )}
          {isLoading && (
            <LoadingBubble $isUser={false}>
              <Dot /><Dot /><Dot />
            </LoadingBubble>
          )}
          <div ref={chatEndRef} />
        </ChatArea>

        <SuggestionContainer>
          {defaultQuestions.map((q, index) => (
            <SuggestionChip key={index} onClick={() => handleSendMessage(q)}>
              {q}
            </SuggestionChip>
          ))}
        </SuggestionContainer>

        <InputArea>
          <SendButton 
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
          >
            <Send size={20} />
          </SendButton>
          <Input 
            placeholder="پیام خود را بنویسید..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
          />
        </InputArea>
      </Container>
    </Overlay>
  );
};

export default PlantChatModal;
