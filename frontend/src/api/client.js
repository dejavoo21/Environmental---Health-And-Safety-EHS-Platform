import axios from 'axios';

// Use relative API path for production deployment
const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl
});

const TRUSTED_DEVICE_STORAGE_KEY = 'ehs_trusted_device_token';

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const setTrustedDeviceToken = (token) => {
  if (token) {
    localStorage.setItem(TRUSTED_DEVICE_STORAGE_KEY, token);
    api.defaults.headers.common['x-trusted-device-token'] = token;
  } else {
    localStorage.removeItem(TRUSTED_DEVICE_STORAGE_KEY);
    delete api.defaults.headers.common['x-trusted-device-token'];
  }
};

const trustedDeviceToken = localStorage.getItem(TRUSTED_DEVICE_STORAGE_KEY);
if (trustedDeviceToken) {
  api.defaults.headers.common['x-trusted-device-token'] = trustedDeviceToken;
}

export default api;
