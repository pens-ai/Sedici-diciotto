import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth.api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        // Token invalid or expired
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authApi.login({ email, password });

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      setUser(data.user);
      setIsAuthenticated(true);

      toast.success('Accesso effettuato con successo');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Errore durante il login';
      toast.error(message);
      return { success: false, error: message, code: error.response?.data?.code };
    }
  }, []);

  const register = useCallback(async (data) => {
    try {
      const result = await authApi.register(data);
      toast.success(result.message || 'Registrazione completata. Controlla la tua email.');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Errore durante la registrazione';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore errors during logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Logout effettuato');
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    try {
      const result = await authApi.forgotPassword(email);
      toast.success(result.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Errore durante la richiesta';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    try {
      const result = await authApi.resetPassword(token, password);
      toast.success(result.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Errore durante il reset';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const verifyEmail = useCallback(async (token) => {
    try {
      const result = await authApi.verifyEmail(token);
      toast.success(result.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Errore durante la verifica';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const resendVerification = useCallback(async (email) => {
    try {
      const result = await authApi.resendVerification(email);
      toast.success(result.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Errore durante l\'invio';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
