import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';

const AnalyticsContext = createContext({
  filters: {
    dateRange: { preset: 'last90' },
    siteIds: [],
    incidentTypeIds: [],
    severities: []
  },
  summary: null,
  incidentTimeSeries: [],
  incidentsBySite: [],
  incidentsByType: [],
  inspectionsTimeSeries: [],
  inspectionsBySite: [],
  actionsTimeSeries: [],
  overdueActionsBySite: [],
  riskScores: [],
  topRiskSites: [],
  savedViews: [],
  activeViewId: null,
  loading: false,
  error: null,
  setFilters: () => {},
  loadView: () => {},
  saveView: () => {},
  updateView: () => {},
  deleteView: () => {},
  refreshData: () => {},
  clearFilters: () => {}
});

const DEBOUNCE_DELAY = 300;

export const AnalyticsProvider = ({ children }) => {
  const { user } = useAuth();
  const [filters, setFiltersState] = useState({
    dateRange: { preset: 'last90' },
    siteIds: [],
    incidentTypeIds: [],
    severities: []
  });

  const [summary, setSummary] = useState(null);
  const [incidentTimeSeries, setIncidentTimeSeries] = useState([]);
  const [incidentsBySite, setIncidentsBySite] = useState([]);
  const [incidentsByType, setIncidentsByType] = useState([]);
  const [inspectionsTimeSeries, setInspectionsTimeSeries] = useState([]);
  const [inspectionsBySite, setInspectionsBySite] = useState([]);
  const [actionsTimeSeries, setActionsTimeSeries] = useState([]);
  const [overdueActionsBySite, setOverdueActionsBySite] = useState([]);
  const [riskScores, setRiskScores] = useState([]);
  const [topRiskSites, setTopRiskSites] = useState([]);
  const [savedViews, setSavedViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debounceRef = useRef(null);

  // Build query params from filters
  const buildQueryParams = useCallback((f = filters) => {
    const params = {};

    if (f.dateRange?.preset) {
      params.preset = f.dateRange.preset;
    } else if (f.dateRange?.startDate && f.dateRange?.endDate) {
      params.startDate = f.dateRange.startDate;
      params.endDate = f.dateRange.endDate;
    }

    if (f.siteIds?.length > 0) {
      params.siteIds = f.siteIds;
    }
    if (f.incidentTypeIds?.length > 0) {
      params.incidentTypeIds = f.incidentTypeIds;
    }
    if (f.severities?.length > 0) {
      params.severities = f.severities;
    }

    return params;
  }, [filters]);

  // Fetch all analytics data
  const refreshData = useCallback(async (f = filters) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const params = buildQueryParams(f);

    try {
      const [
        summaryRes,
        incidentTSRes,
        incidentSiteRes,
        incidentTypeRes,
        inspectionTSRes,
        inspectionSiteRes,
        actionTSRes,
        overdueRes,
        riskRes,
        topRiskRes,
        viewsRes
      ] = await Promise.all([
        api.get('/analytics/summary', { params }),
        api.get('/analytics/incidents/time-series', { params }),
        api.get('/analytics/incidents/by-site', { params }),
        api.get('/analytics/incidents/by-type', { params }),
        api.get('/analytics/inspections/time-series', { params }),
        api.get('/analytics/inspections/by-site', { params }),
        api.get('/analytics/actions/time-series', { params }),
        api.get('/analytics/actions/overdue-by-site', { params }),
        api.get('/analytics/risk-scores'),
        api.get('/analytics/risk-scores/top', { params: { limit: 5 } }),
        api.get('/analytics/views')
      ]);

      setSummary(summaryRes.data);
      setIncidentTimeSeries(incidentTSRes.data.data || []);
      setIncidentsBySite(incidentSiteRes.data.data || []);
      setIncidentsByType(incidentTypeRes.data.data || []);
      setInspectionsTimeSeries(inspectionTSRes.data.data || []);
      setInspectionsBySite(inspectionSiteRes.data.data || []);
      setActionsTimeSeries(actionTSRes.data.data || []);
      setOverdueActionsBySite(overdueRes.data.data || []);
      setRiskScores(riskRes.data.data || []);
      setTopRiskSites(topRiskRes.data.data || []);
      setSavedViews(viewsRes.data.data || []);
    } catch (err) {
      console.error('[AnalyticsContext] Failed to fetch analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, buildQueryParams, filters]);

  // Set filters with debounce
  const setFilters = useCallback((newFilters) => {
    const updated = { ...filters, ...newFilters };
    setFiltersState(updated);
    setActiveViewId(null); // Clear active view when filters change

    // Debounce API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      refreshData(updated);
    }, DEBOUNCE_DELAY);
  }, [filters, refreshData]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const defaultFilters = {
      dateRange: { preset: 'last90' },
      siteIds: [],
      incidentTypeIds: [],
      severities: []
    };
    setFiltersState(defaultFilters);
    setActiveViewId(null);
    refreshData(defaultFilters);
  }, [refreshData]);

  // Load a saved view
  const loadView = useCallback(async (viewId) => {
    try {
      const response = await api.get(`/analytics/views/${viewId}`);
      const view = response.data;

      if (view && view.filters) {
        setFiltersState(view.filters);
        setActiveViewId(viewId);
        refreshData(view.filters);
      }
    } catch (err) {
      console.error('[AnalyticsContext] Failed to load view:', err);
      setError('Failed to load saved view');
    }
  }, [refreshData]);

  // Save a new view
  const saveView = useCallback(async (viewData) => {
    try {
      const response = await api.post('/analytics/views', {
        name: viewData.name,
        description: viewData.description,
        filters: filters,
        is_shared: viewData.isShared || false,
        is_default: viewData.isDefault || false
      });

      // Refresh views list
      const viewsRes = await api.get('/analytics/views');
      setSavedViews(viewsRes.data.data || []);

      return response.data;
    } catch (err) {
      console.error('[AnalyticsContext] Failed to save view:', err);
      throw err;
    }
  }, [filters]);

  // Update an existing view
  const updateView = useCallback(async (viewId, viewData) => {
    try {
      const response = await api.put(`/analytics/views/${viewId}`, viewData);

      // Refresh views list
      const viewsRes = await api.get('/analytics/views');
      setSavedViews(viewsRes.data.data || []);

      return response.data;
    } catch (err) {
      console.error('[AnalyticsContext] Failed to update view:', err);
      throw err;
    }
  }, []);

  // Delete a view
  const deleteView = useCallback(async (viewId) => {
    try {
      await api.delete(`/analytics/views/${viewId}`);

      // Refresh views list
      const viewsRes = await api.get('/analytics/views');
      setSavedViews(viewsRes.data.data || []);

      if (activeViewId === viewId) {
        setActiveViewId(null);
      }
    } catch (err) {
      console.error('[AnalyticsContext] Failed to delete view:', err);
      throw err;
    }
  }, [activeViewId]);

  // Initial load
  useEffect(() => {
    if (user && (user.role === 'manager' || user.role === 'admin')) {
      refreshData();
    }
  }, [user]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const value = {
    filters,
    summary,
    incidentTimeSeries,
    incidentsBySite,
    incidentsByType,
    inspectionsTimeSeries,
    inspectionsBySite,
    actionsTimeSeries,
    overdueActionsBySite,
    riskScores,
    topRiskSites,
    savedViews,
    activeViewId,
    loading,
    error,
    setFilters,
    loadView,
    saveView,
    updateView,
    deleteView,
    refreshData,
    clearFilters
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
};

export default AnalyticsContext;
