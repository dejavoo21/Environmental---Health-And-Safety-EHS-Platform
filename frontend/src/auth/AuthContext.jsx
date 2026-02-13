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
  
  // Force password change state
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  const loadUser = async (storedToken) => {
    try {
      setAuthToken(storedToken);
      const res = await api.get('/auth/me');
      setUser(res.data);
      setToken(storedToken);
      // Check if user needs to change password
      if (res.data.forcePasswordChange) {
        setForcePasswordChange(true);
      }
    } catch (err) {
      setAuthToken(null);
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh user data (e.g., after password change)
  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (storedToken) {
      try {
        setAuthToken(storedToken);
        const res = await api.get('/auth/me');
        setUser(res.data);
        // Clear force password change if it's no longer required
        if (!res.data.forcePasswordChange) {
          setForcePasswordChange(false);
        }
      } catch (err) {
        console.error('Failed to refresh user:', err);
      }
    }
  }, []);

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
    
    // Check if password change is required
    if (res.data.user.forcePasswordChange) {
      setForcePasswordChange(true);
      return { requires2FA: false, forcePasswordChange: true };
    }
    
    return { requires2FA: false, forcePasswordChange: false };
  };

  const complete2FALogin = useCallback((response) => {
    const nextToken = response.token;
    localStorage.setItem(STORAGE_KEY, nextToken);
    setAuthToken(nextToken);
    setUser(response.user);
    setToken(nextToken);
    setTwoFactorRequired(false);
    setTempToken(null);
    
    // Check if password change is required after 2FA
    if (response.user.forcePasswordChange) {
      setForcePasswordChange(true);
    }
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
    setForcePasswordChange(false);
  };

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    logout,
    refreshUser,
    // 2FA
    twoFactorRequired,
    tempToken,
    complete2FALogin,
    cancel2FA,
    // Force password change
    forcePasswordChange
  }), [user, token, loading, twoFactorRequired, tempToken, complete2FALogin, cancel2FA, forcePasswordChange, refreshUser]);

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
