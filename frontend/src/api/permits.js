import api from './client';

/**
 * Permit Management API
 * Phase 7 - Permits, Permit Types, Lifecycle
 */

// ==================== Permit Types ====================

export const getPermitTypes = async (params = {}) => {
  const response = await api.get('/permit-types', { params });
  return response.data;
};

export const getPermitType = async (id) => {
  const response = await api.get(`/permit-types/${id}`);
  return response.data;
};

export const createPermitType = async (data) => {
  const response = await api.post('/permit-types', data);
  return response.data;
};

export const updatePermitType = async (id, data) => {
  const response = await api.put(`/permit-types/${id}`, data);
  return response.data;
};

export const deletePermitType = async (id) => {
  const response = await api.delete(`/permit-types/${id}`);
  return response.data;
};

// ==================== Permits ====================

export const getPermits = async (params = {}) => {
  const response = await api.get('/permits', { params });
  return response.data;
};

export const getPermit = async (id) => {
  const response = await api.get(`/permits/${id}`);
  return response.data;
};

export const createPermit = async (data) => {
  const response = await api.post('/permits', data);
  return response.data;
};

export const updatePermit = async (id, data) => {
  const response = await api.put(`/permits/${id}`, data);
  return response.data;
};

export const deletePermit = async (id) => {
  const response = await api.delete(`/permits/${id}`);
  return response.data;
};

// ==================== Permit Lifecycle ====================

export const submitPermit = async (id) => {
  const response = await api.post(`/permits/${id}/submit`);
  return response.data;
};

export const approvePermit = async (id, notes) => {
  const response = await api.post(`/permits/${id}/approve`, { notes });
  return response.data;
};

export const rejectPermit = async (id, reason) => {
  const response = await api.post(`/permits/${id}/reject`, { reason });
  return response.data;
};

export const activatePermit = async (id, actualStartTime) => {
  const response = await api.post(`/permits/${id}/activate`, { actualStartTime });
  return response.data;
};

export const suspendPermit = async (id, reason) => {
  const response = await api.post(`/permits/${id}/suspend`, { reason });
  return response.data;
};

export const resumePermit = async (id, notes) => {
  const response = await api.post(`/permits/${id}/resume`, { notes });
  return response.data;
};

export const closePermit = async (id, notes, actualEndTime) => {
  const response = await api.post(`/permits/${id}/close`, { notes, actualEndTime });
  return response.data;
};

export const cancelPermit = async (id, reason) => {
  const response = await api.post(`/permits/${id}/cancel`, { reason });
  return response.data;
};

// ==================== Permit Controls ====================

export const getPermitControls = async (permitId) => {
  const response = await api.get(`/permits/${permitId}/controls`);
  return response.data;
};

export const completeControl = async (permitId, controlId, notes) => {
  const response = await api.post(`/permits/${permitId}/controls/${controlId}/complete`, { notes });
  return response.data;
};

export const uncompleteControl = async (permitId, controlId) => {
  const response = await api.post(`/permits/${permitId}/controls/${controlId}/uncomplete`);
  return response.data;
};

// ==================== Permit Workers ====================

export const getPermitWorkers = async (permitId) => {
  const response = await api.get(`/permits/${permitId}/workers`);
  return response.data;
};

export const addPermitWorker = async (permitId, data) => {
  const response = await api.post(`/permits/${permitId}/workers`, data);
  return response.data;
};

export const removePermitWorker = async (permitId, workerId) => {
  const response = await api.delete(`/permits/${permitId}/workers/${workerId}`);
  return response.data;
};

// ==================== Permit Board ====================

export const getPermitBoard = async (params = {}) => {
  const response = await api.get('/permits/board', { params });
  return response.data;
};

// ==================== Conflict Detection ====================

export const checkPermitConflicts = async (data) => {
  const response = await api.post('/permits/check-conflicts', data);
  return response.data;
};

// ==================== State History ====================

export const getPermitHistory = async (permitId) => {
  const response = await api.get(`/permits/${permitId}/history`);
  return response.data;
};

// ==================== Linked Entities ====================

export const getPermitIncidents = async (permitId) => {
  const response = await api.get(`/permits/${permitId}/incidents`);
  return response.data;
};

export const getPermitInspections = async (permitId) => {
  const response = await api.get(`/permits/${permitId}/inspections`);
  return response.data;
};

export const linkPermitToIncident = async (permitId, incidentId, notes) => {
  const response = await api.post(`/permits/${permitId}/incidents`, { incidentId, notes });
  return response.data;
};

export const linkPermitToInspection = async (permitId, inspectionId, notes) => {
  const response = await api.post(`/permits/${permitId}/inspections`, { inspectionId, notes });
  return response.data;
};

// ==================== Permit Status Constants ====================

export const PERMIT_STATUSES = {
  draft: { label: 'Draft', color: '#6C757D', bgColor: '#E9ECEF' },
  submitted: { label: 'Submitted', color: '#0D6EFD', bgColor: '#CFE2FF' },
  approved: { label: 'Approved', color: '#20C997', bgColor: '#D1F2EB' },
  active: { label: 'Active', color: '#198754', bgColor: '#D1E7DD' },
  suspended: { label: 'Suspended', color: '#FD7E14', bgColor: '#FFE5D0' },
  closed: { label: 'Closed', color: '#6C757D', bgColor: '#E9ECEF' },
  expired: { label: 'Expired', color: '#DC3545', bgColor: '#F5C6CB' },
  cancelled: { label: 'Cancelled', color: '#495057', bgColor: '#DEE2E6' }
};

export const PERMIT_TYPE_ICONS = {
  hot_work: '🔥',
  confined_space: '🏗️',
  work_at_height: '🪜',
  electrical: '⚡',
  excavation: '🚧',
  lifting: '🏗️',
  radiation: '☢️',
  default: '📋'
};

export const getPermitTypeIcon = (typeCode) => {
  return PERMIT_TYPE_ICONS[typeCode] || PERMIT_TYPE_ICONS.default;
};
