import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    isAuthenticated: false,
    loading: true,
  });

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState({ user: null, accessToken: null, isAuthenticated: false, loading: false });
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      if (localStorage.getItem('accessToken') !== token) {
        return;
      }
      setState({
        user: { ...data, fullName: data.full_name },
        accessToken: token,
        isAuthenticated: true,
        loading: false,
      });
    } catch {
      if (localStorage.getItem('accessToken') === token) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      setState({ user: null, accessToken: null, isAuthenticated: false, loading: false });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setState({
      user: { ...data.user, fullName: data.user.fullName || data.user.full_name },
      accessToken: data.accessToken,
      isAuthenticated: true,
      loading: false,
    });
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setState({ user: null, accessToken: null, isAuthenticated: false, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
