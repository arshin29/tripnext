'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  AuthResponseData,
  LoginInput,
  RegisterInput,
  SafeUser,
  UpdateProfileInput,
} from '@tripnest/shared';
import { apiClient, ApiError } from '../lib/api-client';

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on mount via HTTP-only cookie
  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient<AuthResponseData>('/auth/me', {
        method: 'GET',
      });
      if (res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      // 401 or network error — session not present or expired
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (input: LoginInput): Promise<void> => {
    const res = await apiClient<AuthResponseData>('/auth/login', {
      method: 'POST',
      body: input,
    });
    if (res.data?.user) {
      setUser(res.data.user);
    }
  };

  const register = async (input: RegisterInput): Promise<void> => {
    const res = await apiClient<AuthResponseData>('/auth/register', {
      method: 'POST',
      body: input,
    });
    if (res.data?.user) {
      setUser(res.data.user);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Proceed with clearing local state even if logout request fails
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (input: UpdateProfileInput): Promise<void> => {
    const res = await apiClient<AuthResponseData>('/auth/profile', {
      method: 'PATCH',
      body: input,
    });
    if (res.data?.user) {
      setUser(res.data.user);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
