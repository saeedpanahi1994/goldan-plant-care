import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
interface User {
  phone: string;
  isVerified: boolean;
  createdAt?: string;
  lastLogin?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

// Default context value
const defaultContext: AuthContextType = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  checkAuth: async () => false,
};

// Create context
const AuthContext = createContext<AuthContextType>(defaultContext);

// Storage keys
const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

// API base URL
const API_BASE = 'http://130.185.76.46:4380/api';

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        // Verify token with server
        const isValid = await verifyToken(storedToken);
        
        if (isValid) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } else {
          // Token invalid, clear storage
          clearStorage();
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Verify token with server
  const verifyToken = async (tokenToVerify: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenToVerify }),
      });

      const data = await response.json();
      return data.success && data.valid;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  };

  // Clear storage
  const clearStorage = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('pendingPhone');
  };

  // Login function
  const login = (newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
  };

  // Logout function
  const logout = async () => {
    // Call server logout (optional, clears server-side token)
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear local state
    clearStorage();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Check auth status (can be called manually)
  const checkAuth = async (): Promise<boolean> => {
    if (!token) return false;
    
    const isValid = await verifyToken(token);
    
    if (!isValid) {
      clearStorage();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
    
    return isValid;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Protected route component
interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    // Will be handled by App.tsx navigation
    return null;
  }

  return <>{children}</>;
};

// Loading screen component
const LoadingScreen: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 30%, #a5d6a7 70%, #81c784 100%)',
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          background: 'white',
          borderRadius: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 40px rgba(76, 175, 80, 0.2)',
          marginBottom: 24,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      >
        <span style={{ fontSize: 48 }}>🌱</span>
      </div>
      <p
        style={{
          fontFamily: 'Vazirmatn, sans-serif',
          fontSize: 16,
          color: '#1b5e20',
          margin: 0,
        }}
      >
        در حال بارگذاری...
      </p>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}
      </style>
    </div>
  );
};

export default AuthContext;
