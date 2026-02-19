import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api, { setAuthToken, setTrustedDeviceToken } from '../api/client';

const AuthContext = createContext(null);
const STORAGE_KEY = 'ehs_token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [revalidationRequired, setRevalidationRequired] = useState(false);
  const [revalidationToken, setRevalidationToken] = useState(null);
  const [revalidationChannels, setRevalidationChannels] = useState({ email: true, phone: false });
  
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

    if (res.data.requiresRevalidation) {
      setRevalidationRequired(true);
      setRevalidationToken(res.data.revalidationToken);
      setRevalidationChannels(res.data.channels || { email: true, phone: false });
      return { requiresRevalidation: true };
    }

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
    if (res.data.trustedDeviceToken) {
      setTrustedDeviceToken(res.data.trustedDeviceToken);
    }
    setUser(res.data.user);
    setToken(nextToken);
    
    // Check if password change is required
    if (res.data.user.forcePasswordChange) {
      setForcePasswordChange(true);
      return { requires2FA: false, forcePasswordChange: true };
    }
    
    return { requires2FA: false, requiresRevalidation: false, forcePasswordChange: false };
  };

  const completeRevalidation = useCallback((response) => {
    setRevalidationRequired(false);
    setRevalidationToken(null);
    setRevalidationChannels({ email: true, phone: false });

    if (response.requires2FA && response.tempToken) {
      setTwoFactorRequired(true);
      setTempToken(response.tempToken);
      return { requires2FA: true };
    }

    const nextToken = response.token;
    localStorage.setItem(STORAGE_KEY, nextToken);
    setAuthToken(nextToken);
    if (response.trustedDeviceToken) {
      setTrustedDeviceToken(response.trustedDeviceToken);
    }
    setUser(response.user);
    setToken(nextToken);
    return { requires2FA: false, forcePasswordChange: Boolean(response.user?.forcePasswordChange) };
  }, []);

  const cancelRevalidation = useCallback(() => {
    setRevalidationRequired(false);
    setRevalidationToken(null);
    setRevalidationChannels({ email: true, phone: false });
  }, []);

  const complete2FALogin = useCallback((response) => {
    const nextToken = response.token;
    localStorage.setItem(STORAGE_KEY, nextToken);
    setAuthToken(nextToken);
    if (response.trustedDeviceToken) {
      setTrustedDeviceToken(response.trustedDeviceToken);
    }
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
    setRevalidationRequired(false);
    setRevalidationToken(null);
    setRevalidationChannels({ email: true, phone: false });
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
    // Revalidation
    revalidationRequired,
    revalidationToken,
    revalidationChannels,
    completeRevalidation,
    cancelRevalidation,
    // Force password change
    forcePasswordChange
  }), [user, token, loading, twoFactorRequired, tempToken, complete2FALogin, cancel2FA, revalidationRequired, revalidationToken, revalidationChannels, completeRevalidation, cancelRevalidation, forcePasswordChange, refreshUser]);

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
