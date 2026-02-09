import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';

const OrgContext = createContext(null);

export const OrgProvider = ({ children }) => {
  const { user, token } = useAuth();
  const authUserId = user?.id || null;
  const [organisation, setOrganisation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrganisation = useCallback(async () => {
    if (!token || !authUserId) {
      setOrganisation(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/organisation');
      setOrganisation(res.data.data);
    } catch (err) {
      setError('Failed to load organisation');
      setOrganisation(null);
    } finally {
      setLoading(false);
    }
  }, [token, authUserId]);

  useEffect(() => {
    if (token && authUserId) {
      fetchOrganisation();
    } else {
      setOrganisation(null);
    }
  }, [token, authUserId, fetchOrganisation]);

  const refreshOrganisation = useCallback(() => {
    return fetchOrganisation();
  }, [fetchOrganisation]);

  const thresholds = useMemo(() => {
    const defaults = {
      openIncidentsWarning: 5,
      openIncidentsCritical: 10,
      overdueActionsWarning: 3,
      overdueActionsCritical: 5,
      failedInspectionsWarning: 2,
      failedInspectionsCritical: 5
    };
    return organisation?.settings?.dashboard || defaults;
  }, [organisation]);

  const value = useMemo(() => ({
    organisation,
    loading,
    error,
    thresholds,
    refreshOrganisation
  }), [organisation, loading, error, thresholds, refreshOrganisation]);

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrg must be used within OrgProvider');
  }
  return ctx;
};
