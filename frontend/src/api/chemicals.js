import api from './client';

/**
 * Chemical Management API
 * Phase 7 - Chemical Register, SDS, Locations
 */

// ==================== Chemical Register ====================

export const getChemicals = async (params = {}) => {
  const response = await api.get('/chemicals', { params });
  return response.data;
};

export const getChemical = async (id) => {
  const response = await api.get(`/chemicals/${id}`);
  return response.data;
};

export const createChemical = async (data) => {
  const response = await api.post('/chemicals', data);
  return response.data;
};

export const updateChemical = async (id, data) => {
  const response = await api.put(`/chemicals/${id}`, data);
  return response.data;
};

export const deleteChemical = async (id) => {
  const response = await api.delete(`/chemicals/${id}`);
  return response.data;
};

// ==================== SDS Documents ====================

export const uploadSDS = async (chemicalId, file, sdsVersion, expiryDate, setAsCurrent = true) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sdsVersion', sdsVersion);
  formData.append('expiryDate', expiryDate);
  formData.append('setAsCurrent', setAsCurrent);

  const response = await api.post(`/chemicals/${chemicalId}/sds`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const downloadSDS = async (chemicalId, attachmentId) => {
  const response = await api.get(`/chemicals/${chemicalId}/sds/${attachmentId}/download`, {
    responseType: 'blob'
  });
  return response.data;
};

export const getSDSDocuments = async (chemicalId) => {
  const response = await api.get(`/chemicals/${chemicalId}/sds`);
  return response.data;
};

// ==================== Storage Locations ====================

export const getChemicalLocations = async (chemicalId) => {
  const response = await api.get(`/chemicals/${chemicalId}/locations`);
  return response.data;
};

export const addChemicalLocation = async (chemicalId, data) => {
  const response = await api.post(`/chemicals/${chemicalId}/locations`, data);
  return response.data;
};

export const updateChemicalLocation = async (chemicalId, locationId, data) => {
  const response = await api.put(`/chemicals/${chemicalId}/locations/${locationId}`, data);
  return response.data;
};

export const deleteChemicalLocation = async (chemicalId, locationId) => {
  const response = await api.delete(`/chemicals/${chemicalId}/locations/${locationId}`);
  return response.data;
};

export const updateChemicalInventory = async (chemicalId, locationId, data) => {
  const response = await api.put(`/chemicals/${chemicalId}/locations/${locationId}/inventory`, data);
  return response.data;
};

// ==================== Linked Entities ====================

export const getChemicalIncidents = async (chemicalId) => {
  const response = await api.get(`/chemicals/${chemicalId}/incidents`);
  return response.data;
};

export const getChemicalActions = async (chemicalId) => {
  const response = await api.get(`/chemicals/${chemicalId}/actions`);
  return response.data;
};

export const linkChemicalToIncident = async (chemicalId, incidentId, notes) => {
  const response = await api.post(`/chemicals/${chemicalId}/incidents`, { incidentId, notes });
  return response.data;
};

export const linkChemicalToAction = async (chemicalId, actionId, notes) => {
  const response = await api.post(`/chemicals/${chemicalId}/actions`, { actionId, notes });
  return response.data;
};

// ==================== GHS Hazard Classes ====================

export const GHS_HAZARD_CLASSES = [
  { id: 'explosive', name: 'Explosive', pictogram: '💣', icon: 'exploding_bomb', color: '#DC3545' },
  { id: 'flammable', name: 'Flammable', pictogram: '🔥', icon: 'flame', color: '#FF6B35' },
  { id: 'oxidizer', name: 'Oxidizer', pictogram: '⭕', icon: 'flame_over_circle', color: '#FFC107' },
  { id: 'compressed_gas', name: 'Gas Under Pressure', pictogram: '💨', icon: 'gas_cylinder', color: '#6C757D' },
  { id: 'corrosive', name: 'Corrosive', pictogram: '⚗️', icon: 'corrosion', color: '#0D6EFD' },
  { id: 'toxic', name: 'Acute Toxicity', pictogram: '☠️', icon: 'skull_crossbones', color: '#DC3545' },
  { id: 'irritant', name: 'Irritant / Harmful', pictogram: '⚠️', icon: 'exclamation', color: '#FD7E14' },
  { id: 'health_hazard', name: 'Health Hazard', pictogram: '⚕️', icon: 'health_hazard', color: '#6C757D' },
  { id: 'environmental', name: 'Environmental Hazard', pictogram: '🌿', icon: 'environment', color: '#198754' }
];

export const getGHSClass = (id) => GHS_HAZARD_CLASSES.find((c) => c.id === id);
