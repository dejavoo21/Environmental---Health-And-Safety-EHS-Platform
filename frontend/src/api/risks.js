/**
 * Risk Register API Client - Phase 9
 * Handles all risk-related API calls
 */

import api from './client';

// ==================== RISKS ====================

/**
 * List risks with filters and pagination
 */
export const listRisks = async (params = {}) => {
  const response = await api.get('/risks', { params });
  return response.data;
};

/**
 * Get a single risk by ID
 */
export const getRisk = async (id) => {
  const response = await api.get(`/risks/${id}`);
  return response.data;
};

/**
 * Create a new risk
 */
export const createRisk = async (data) => {
  const response = await api.post('/risks', data);
  return response.data;
};

/**
 * Update an existing risk
 */
export const updateRisk = async (id, data) => {
  const response = await api.put(`/risks/${id}`, data);
  return response.data;
};

/**
 * Change risk status
 */
export const changeRiskStatus = async (id, status, justification) => {
  const response = await api.post(`/risks/${id}/status`, { status, justification });
  return response.data;
};

/**
 * Delete a risk (soft delete, Admin only)
 */
export const deleteRisk = async (id) => {
  const response = await api.delete(`/risks/${id}`);
  return response.data;
};

// ==================== CATEGORIES ====================

/**
 * List risk categories
 */
export const listCategories = async (includeInactive = false) => {
  const response = await api.get('/risk-categories', { params: { includeInactive } });
  return response.data;
};

/**
 * Get a category by ID
 */
export const getCategory = async (id) => {
  const response = await api.get(`/risk-categories/${id}`);
  return response.data;
};

/**
 * Create a new category (Admin only)
 */
export const createCategory = async (data) => {
  const response = await api.post('/risk-categories', data);
  return response.data;
};

/**
 * Update a category (Admin only)
 */
export const updateCategory = async (id, data) => {
  const response = await api.put(`/risk-categories/${id}`, data);
  return response.data;
};

/**
 * Delete a category (Admin only)
 */
export const deleteCategory = async (id) => {
  const response = await api.delete(`/risk-categories/${id}`);
  return response.data;
};

// ==================== CONTROLS ====================

/**
 * List controls for a risk
 */
export const listControls = async (riskId, includeInactive = false) => {
  const response = await api.get(`/risks/${riskId}/controls`, { params: { includeInactive } });
  return response.data;
};

/**
 * Add a control to a risk
 */
export const addControl = async (riskId, data) => {
  const response = await api.post(`/risks/${riskId}/controls`, data);
  return response.data;
};

/**
 * Update a control
 */
export const updateControl = async (riskId, controlId, data) => {
  const response = await api.put(`/risks/${riskId}/controls/${controlId}`, data);
  return response.data;
};

/**
 * Delete a control
 */
export const deleteControl = async (riskId, controlId) => {
  const response = await api.delete(`/risks/${riskId}/controls/${controlId}`);
  return response.data;
};

/**
 * Verify a control
 */
export const verifyControl = async (riskId, controlId, data) => {
  const response = await api.post(`/risks/${riskId}/controls/${controlId}/verify`, data);
  return response.data;
};

// ==================== LINKS ====================

/**
 * List links for a risk
 */
export const listLinks = async (riskId, entityType = null) => {
  const params = entityType ? { entityType } : {};
  const response = await api.get(`/risks/${riskId}/links`, { params });
  return response.data;
};

/**
 * Create a link between risk and entity
 */
export const createLink = async (riskId, data) => {
  const response = await api.post(`/risks/${riskId}/links`, data);
  return response.data;
};

/**
 * Delete a link
 */
export const deleteLink = async (riskId, linkId) => {
  const response = await api.delete(`/risks/${riskId}/links/${linkId}`);
  return response.data;
};

// ==================== REVIEWS ====================

/**
 * List reviews for a risk
 */
export const listReviews = async (riskId, params = {}) => {
  const response = await api.get(`/risks/${riskId}/reviews`, { params });
  return response.data;
};

/**
 * Record a review
 */
export const recordReview = async (riskId, data) => {
  const response = await api.post(`/risks/${riskId}/reviews`, data);
  return response.data;
};

// ==================== ANALYTICS ====================

/**
 * Get heatmap data
 */
export const getHeatmap = async (params = {}) => {
  const response = await api.get('/risks/heatmap', { params });
  return response.data;
};

/**
 * Get top risks
 */
export const getTopRisks = async (params = {}) => {
  const response = await api.get('/risks/top', { params });
  return response.data;
};

/**
 * Get upcoming reviews
 */
export const getUpcomingReviews = async (days = 30, limit = 20) => {
  const response = await api.get('/risks/upcoming-reviews', { params: { days, limit } });
  return response.data;
};

/**
 * Get overdue reviews
 */
export const getOverdueReviews = async () => {
  const response = await api.get('/risks/overdue-reviews');
  return response.data;
};

/**
 * Get review compliance metrics
 */
export const getReviewCompliance = async () => {
  const response = await api.get('/risks/review-compliance');
  return response.data;
};

/**
 * Get control effectiveness
 */
export const getControlEffectiveness = async () => {
  const response = await api.get('/risks/control-effectiveness');
  return response.data;
};

/**
 * Get risk trends
 */
export const getRiskTrends = async (months = 6) => {
  const response = await api.get('/risks/trends', { params: { months } });
  return response.data;
};

/**
 * Get risks by dimension
 */
export const getRisksByDimension = async (dimension) => {
  const response = await api.get(`/risks/analytics/${dimension}`);
  return response.data;
};

// ==================== SETTINGS ====================

/**
 * Get scoring matrix
 */
export const getScoringMatrix = async () => {
  const response = await api.get('/risk-settings/scoring-matrix');
  return response.data;
};

/**
 * Update scoring matrix (Admin only)
 */
export const updateScoringMatrix = async (matrix) => {
  const response = await api.put('/risk-settings/scoring-matrix', { matrix });
  return response.data;
};

/**
 * Get risk tolerances
 */
export const getTolerances = async () => {
  const response = await api.get('/risk-settings/tolerances');
  return response.data;
};

/**
 * Update risk tolerances (Admin only)
 */
export const updateTolerances = async (tolerances) => {
  const response = await api.put('/risk-settings/tolerances', { tolerances });
  return response.data;
};

/**
 * Get organisation risk config
 */
export const getRiskConfig = async () => {
  const response = await api.get('/risk-settings/config');
  return response.data;
};

/**
 * Update organisation risk config (Admin only)
 */
export const updateRiskConfig = async (config) => {
  const response = await api.put('/risk-settings/config', config);
  return response.data;
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate risk level from score
 */
export const calculateLevel = (score) => {
  if (score >= 17) return 'extreme';
  if (score >= 10) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
};

/**
 * Get level colour
 */
export const getLevelColor = (level) => {
  switch (level) {
    case 'extreme': return '#F44336';
    case 'high': return '#FF9800';
    case 'medium': return '#FFEB3B';
    case 'low': return '#4CAF50';
    default: return '#9E9E9E';
  }
};

/**
 * Get level background colour (lighter)
 */
export const getLevelBgColor = (level) => {
  switch (level) {
    case 'extreme': return '#FFEBEE';
    case 'high': return '#FFF3E0';
    case 'medium': return '#FFFDE7';
    case 'low': return '#E8F5E9';
    default: return '#F5F5F5';
  }
};

/**
 * Format likelihood label
 */
export const getLikelihoodLabel = (value) => {
  const labels = {
    1: 'Rare',
    2: 'Unlikely',
    3: 'Possible',
    4: 'Likely',
    5: 'Almost Certain'
  };
  return labels[value] || value;
};

/**
 * Format impact label
 */
export const getImpactLabel = (value) => {
  const labels = {
    1: 'Negligible',
    2: 'Minor',
    3: 'Moderate',
    4: 'Major',
    5: 'Catastrophic'
  };
  return labels[value] || value;
};

/**
 * Format status label
 */
export const getStatusLabel = (status) => {
  const labels = {
    emerging: 'Emerging',
    active: 'Active',
    under_review: 'Under Review',
    closed: 'Closed',
    accepted: 'Accepted'
  };
  return labels[status] || status;
};

/**
 * Format review frequency label
 */
export const getFrequencyLabel = (frequency) => {
  const labels = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    semi_annual: 'Semi-Annual',
    annual: 'Annual'
  };
  return labels[frequency] || frequency;
};

export default {
  listRisks,
  getRisk,
  createRisk,
  updateRisk,
  changeRiskStatus,
  deleteRisk,
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listControls,
  addControl,
  updateControl,
  deleteControl,
  verifyControl,
  listLinks,
  createLink,
  deleteLink,
  listReviews,
  recordReview,
  getHeatmap,
  getTopRisks,
  getUpcomingReviews,
  getOverdueReviews,
  getReviewCompliance,
  getControlEffectiveness,
  getRiskTrends,
  getRisksByDimension,
  getScoringMatrix,
  updateScoringMatrix,
  getTolerances,
  updateTolerances,
  getRiskConfig,
  updateRiskConfig,
  calculateLevel,
  getLevelColor,
  getLevelBgColor,
  getLikelihoodLabel,
  getImpactLabel,
  getStatusLabel,
  getFrequencyLabel
};
