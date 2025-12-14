import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { 
  Home, 
  Search, 
  Camera, 
  Leaf, 
  MessageCircle 
} from 'lucide-react';

const NavContainer = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 252, 255, 0.95) 100%);
  border-top: 1px solid rgba(76, 175, 80, 0.08);
  box-shadow: 0 -6px 30px rgba(76, 175, 80, 0.06), 0 -2px 8px rgba(0, 0, 0, 0.04);
  z-index: 1000;
  backdrop-filter: blur(20px);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: 0 20px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.1), transparent);
  }
`;

const NavList = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 10px 12px 16px;
  max-width: 400px;
  margin: 0 auto;
  direction: rtl;
  text-align: right;
`;

const NavItem = styled.button<{ $active: boolean; $camera?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 8px 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  min-width: 48px;
  
  ${props => props.$camera && `
    background: linear-gradient(135deg, #FF9500 0%, #FF7043 50%, #FF6B35 100%);
    border-radius: 50%;
    width: 60px;
    height: 60px;
    margin-top: -18px;
    margin-bottom: -10px;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(255, 149, 0, 0.3), 0 4px 8px rgba(255, 149, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.8);
    
    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      right: 2px;
      bottom: 2px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
      border-radius: 50%;
      pointer-events: none;
    }
    
    &:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 12px 32px rgba(255, 149, 0, 0.4), 0 6px 12px rgba(255, 149, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }
  `}
  
  ${props => !props.$camera && props.$active && `
    background: rgba(76, 175, 80, 0.08);
  `}
  
  svg {
    color: ${props => 
      props.$camera ? 'white' : 
      props.$active ? '#4CAF50' : '#B0B0B0'
    };
    transition: all 0.3s ease;
  }
  
  &:hover:not(:disabled) {
    ${props => !props.$camera && `
      background: rgba(76, 175, 80, 0.06);
    `}
  }
  
  &:hover svg {
    color: ${props => 
      props.$camera ? 'white' : '#4CAF50'
    };
    transform: ${props => props.$camera ? 'none' : 'scale(1.05)'};
  }
`;

const NavLabel = styled.span<{ $active: boolean; $camera?: boolean }>`
  font-size: 10px;
  color: ${props => 
    props.$camera ? 'transparent' : 
    props.$active ? '#4CAF50' : '#B0B0B0'
  };
  font-weight: ${props => props.$active ? '500' : '400'};
  transition: all 0.3s ease;
  font-family: 'Vazirmatn', sans-serif;
  text-align: center;
  letter-spacing: 0.1px;
`;

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'home',
      icon: Home,
      label: 'خانه', 
      path: '/'
    },
    {
      id: 'garden',
      icon: Leaf, 
      label: 'باغچه',
      path: '/garden'
    },
    {
      id: 'camera',
      icon: Camera,
      label: 'دوربین',
      path: '/diagnosis',
      camera: true
    },
    {
      id: 'bank', 
      icon: Search,
      label: 'بانک',
      path: '/search'
    },
    {
      id: 'chat',
      icon: MessageCircle,
      label: 'چت هوشمند',
      path: '/chat'
    }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <NavContainer>
      <NavList>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavItem
              key={item.id}
              $active={isActive}
              $camera={item.camera}
              onClick={() => handleNavigation(item.path)}
            >
              <Icon size={item.camera ? 28 : 24} />
              <NavLabel $active={isActive} $camera={item.camera}>
                {item.label}
              </NavLabel>
            </NavItem>
          );
        })}
      </NavList>
    </NavContainer>
  );
};

export default BottomNavigation;