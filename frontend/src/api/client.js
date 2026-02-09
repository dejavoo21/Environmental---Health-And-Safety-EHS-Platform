import axios from 'axios';

// Use relative API path for production deployment
const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export default api;
