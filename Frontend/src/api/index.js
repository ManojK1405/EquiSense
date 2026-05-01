import axios from 'axios';

export const getBaseURL = () => {
  if (import.meta.env.VITE_BACKEND_URL) return `${import.meta.env.VITE_BACKEND_URL}/api`;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  const isProduction = window.location.hostname.includes('equisense.vercel.app') || 
                       window.location.hostname.includes('equisense.shop');
  
  // If we are on production domains but backend URL is missing, 
  // assume it's on Render based on the user's project setup
  if (isProduction) return 'https://equisense.onrender.com/api';
  
  return 'http://localhost:5001/api';
};

const API_URL = getBaseURL();

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
