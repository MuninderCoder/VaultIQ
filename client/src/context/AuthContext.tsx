import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService, LoginPayload, RegisterPayload } from '../services/authService';
import { TOKEN_STORAGE_KEY } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.getMe();
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        setToken(storedToken);
      } else {
        await logout();
      }
    } catch {
      await logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();

    // Listen for unauthorized 401 events dispatched from axios interceptor
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('vaultiq:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('vaultiq:unauthorized', handleUnauthorized);
    };
  }, [refreshUser, logout]);

  const login = async (credentials: LoginPayload): Promise<void> => {
    const res = await authService.login(credentials);
    if (res.success && res.data) {
      localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } else {
      throw new Error(res.message || 'Login failed');
    }
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    const res = await authService.register(payload);
    if (res.success && res.data) {
      localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } else {
      throw new Error(res.message || 'Registration failed');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
