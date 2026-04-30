import axios from 'axios';

const isProduction = window.location.hostname === 'equisense.vercel.app';
const API_URL = import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : (isProduction 
        ? 'https://your-backend-production-url.com/api' // PLACEHOLDER: User must set VITE_BACKEND_URL in Vercel
        : 'http://localhost:5001/api');

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
