import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  loading?: boolean;
}

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 24px;
  width: 100%;
  max-width: 340px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 8px 24px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  padding: 24px 24px 0 24px;
  display: flex;
  justify-content: flex-end;
`;

const CloseButton = styled.button`
  background: #f5f5f5;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #eeeeee;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    color: #757575;
  }
`;

const ModalBody = styled.div`
  padding: 0 24px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const IconContainer = styled.div<{ $isDestructive?: boolean }>`
  width: 64px;
  height: 64px;
  background: ${props => props.$isDestructive 
    ? 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)' 
    : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: ${props => props.$isDestructive 
    ? '0 4px 12px rgba(244, 67, 54, 0.2)' 
    : '0 4px 12px rgba(255, 152, 0, 0.2)'};

  svg {
    color: ${props => props.$isDestructive ? '#c62828' : '#f57c00'};
  }
`;

const Title = styled.h3`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #212121;
  margin: 0 0 8px 0;
`;

const Message = styled.p`
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  color: #616161;
  line-height: 1.7;
  margin: 0 0 24px 0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
`;

const CancelButton = styled.button`
  flex: 1;
  background: linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%);
  border: none;
  border-radius: 14px;
  padding: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #616161;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ConfirmButton = styled.button<{ $isDestructive?: boolean; disabled?: boolean }>`
  flex: 1;
  background: ${props => props.$isDestructive 
    ? 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)' 
    : 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)'};
  border: none;
  border-radius: 14px;
  padding: 14px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isDestructive 
    ? '0 4px 12px rgba(244, 67, 54, 0.3)' 
    : '0 4px 12px rgba(76, 175, 80, 0.3)'};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${props => props.$isDestructive 
      ? '0 6px 16px rgba(244, 67, 54, 0.4)' 
      : '0 6px 16px rgba(76, 175, 80, 0.4)'};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-left: 8px;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأیید',
  cancelText = 'انصراف',
  isDestructive = false,
  loading = false,
}) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  return (
    <ModalOverlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <CloseButton onClick={onClose} disabled={loading}>
            <X size={18} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <IconContainer $isDestructive={isDestructive}>
            <AlertTriangle size={28} />
          </IconContainer>
          
          <Title>{title}</Title>
          <Message>{message}</Message>

          <ActionButtons>
            <CancelButton onClick={onClose} disabled={loading}>
              {cancelText}
            </CancelButton>
            <ConfirmButton 
              $isDestructive={isDestructive} 
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  در حال حذف
                  <LoadingSpinner />
                </>
              ) : confirmText}
            </ConfirmButton>
          </ActionButtons>
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default ConfirmModal;
