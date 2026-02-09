import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api, { setAuthToken } from '../api/client';

const AuthContext = createContext(null);
const STORAGE_KEY = 'ehs_token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState(null);

  const loadUser = async (storedToken) => {
    try {
      setAuthToken(storedToken);
      const res = await api.get('/auth/me');
      setUser(res.data);
      setToken(storedToken);
    } catch (err) {
      setAuthToken(null);
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      loadUser(stored);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    
    // Check if 2FA is required
    if (res.data.requires2FA) {
      setTwoFactorRequired(true);
      setTempToken(res.data.tempToken);
      return { requires2FA: true };
    }
    
    // Standard login
    const nextToken = res.data.token;
    localStorage.setItem(STORAGE_KEY, nextToken);
    setAuthToken(nextToken);
    setUser(res.data.user);
    setToken(nextToken);
    return { requires2FA: false };
  };

  const complete2FALogin = useCallback((response) => {
    const nextToken = response.token;
    localStorage.setItem(STORAGE_KEY, nextToken);
    setAuthToken(nextToken);
    setUser(response.user);
    setToken(nextToken);
    setTwoFactorRequired(false);
    setTempToken(null);
  }, []);

  const cancel2FA = useCallback(() => {
    setTwoFactorRequired(false);
    setTempToken(null);
  }, []);

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
    setToken(null);
    setTwoFactorRequired(false);
    setTempToken(null);
  };

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    logout,
    // 2FA
    twoFactorRequired,
    tempToken,
    complete2FALogin,
    cancel2FA
  }), [user, token, loading, twoFactorRequired, tempToken, complete2FALogin, cancel2FA]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
