import api from './client';

/**
 * Safety Advisor API module
 * Phase 11 - Safety Advisor & Site Intelligence
 */

// Get safety summary for a site
export const getSiteSafetySummary = async (siteId) => {
  const res = await api.get(`/safety-advisor/sites/${siteId}/summary`);
  return res.data;
};

// Get weather for a site
export const getSiteWeather = async (siteId) => {
  const res = await api.get(`/safety-advisor/sites/${siteId}/weather`);
  return res.data;
};

// Get weather forecast for a site
export const getSiteForecast = async (siteId) => {
  const res = await api.get(`/safety-advisor/sites/${siteId}/forecast`);
  return res.data;
};

// Get safety summary for a task (incident, inspection, permit, action, training)
export const getTaskSafetySummary = async (entityType, entityId) => {
  const res = await api.get(`/safety-advisor/tasks/${entityType}/${entityId}/summary`);
  return res.data;
};

// Record safety acknowledgement for a task
export const acknowledgeSafetyAdvisor = async (entityType, entityId, metadata = {}) => {
  const res = await api.put(`/safety-advisor/tasks/${entityType}/${entityId}/acknowledge`, metadata);
  return res.data;
};

// Check acknowledgement status for a task
export const getAcknowledgementStatus = async (entityType, entityId) => {
  const res = await api.get(`/safety-advisor/tasks/${entityType}/${entityId}/acknowledgement-status`);
  return res.data;
};

// Get user's safety overview (for dashboard)
export const getMySafetyOverview = async (siteId = null) => {
  const params = siteId ? `?siteId=${siteId}` : '';
  const res = await api.get(`/safety-advisor/my/overview${params}`);
  return res.data;
};

// Get missing acknowledgements for current user
export const getMissingAcknowledgements = async () => {
  const res = await api.get('/safety-advisor/missing-acknowledgements');
  return res.data;
};

// Get safety advisor analytics
export const getSafetyAnalytics = async (params = {}) => {
  const res = await api.get('/safety-advisor/analytics', { params });
  return res.data;
};

// Admin: Safety Moments
export const getSafetyMoments = async (params = {}) => {
  const res = await api.get('/admin/safety/moments', { params });
  return res.data;
};

export const getSafetyMoment = async (id) => {
  const res = await api.get(`/admin/safety/moments/${id}`);
  return res.data;
};

export const createSafetyMoment = async (data) => {
  const res = await api.post('/admin/safety/moments', data);
  return res.data;
};

export const updateSafetyMoment = async (id, data) => {
  const res = await api.put(`/admin/safety/moments/${id}`, data);
  return res.data;
};

export const archiveSafetyMoment = async (id) => {
  const res = await api.delete(`/admin/safety/moments/${id}`);
  return res.data;
};

export const getSafetyMomentAnalytics = async () => {
  const res = await api.get('/admin/safety/moments/analytics');
  return res.data;
};

// Admin: Legislation References
export const getLegislationRefs = async (params = {}) => {
  const res = await api.get('/admin/safety/legislation', { params });
  return res.data;
};

export const createLegislationRef = async (data) => {
  const res = await api.post('/admin/safety/legislation', data);
  return res.data;
};

export const updateLegislationRef = async (id, data) => {
  const res = await api.put(`/admin/safety/legislation/${id}`, data);
  return res.data;
};

export const deleteLegislationRef = async (id) => {
  const res = await api.delete(`/admin/safety/legislation/${id}`);
  return res.data;
};

// Admin: PPE Rules
export const getPPERules = async (params = {}) => {
  const res = await api.get('/admin/safety/ppe-rules', { params });
  return res.data;
};

export const createPPERule = async (data) => {
  const res = await api.post('/admin/safety/ppe-rules', data);
  return res.data;
};

export const updatePPERule = async (id, data) => {
  const res = await api.put(`/admin/safety/ppe-rules/${id}`, data);
  return res.data;
};

export const deletePPERule = async (id) => {
  const res = await api.delete(`/admin/safety/ppe-rules/${id}`);
  return res.data;
};

export default {
  getSiteSafetySummary,
  getSiteWeather,
  getSiteForecast,
  getTaskSafetySummary,
  acknowledgeSafetyAdvisor,
  getAcknowledgementStatus,
  getMySafetyOverview,
  getMissingAcknowledgements,
  getSafetyAnalytics,
  getSafetyMoments,
  getSafetyMoment,
  createSafetyMoment,
  updateSafetyMoment,
  archiveSafetyMoment,
  getSafetyMomentAnalytics,
  getLegislationRefs,
  createLegislationRef,
  updateLegislationRef,
  deleteLegislationRef,
  getPPERules,
  createPPERule,
  updatePPERule,
  deletePPERule
};
