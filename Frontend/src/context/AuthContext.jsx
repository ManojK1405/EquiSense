import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  
  // Configure axios defaults
  axios.defaults.withCredentials = true;

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.log('No active session found');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    setUser(response.data.user);
    setShowAuthModal(false);
    toast.success(`Welcome back, ${response.data.user.name}!`);
  };

  const signup = async (name, email, password) => {
    const response = await axios.post(`${API_URL}/auth/signup`, { name, email, password });
    setUser(response.data.user);
    setShowAuthModal(false);
    toast.success(`Welcome to EquiTrade, ${response.data.user.name}!`);
  };

  const googleLogin = async (tokenId) => {
    const response = await axios.post(`${API_URL}/auth/google`, { tokenId });
    setUser(response.data.user);
    setShowAuthModal(false);
    toast.success(`Welcome back, ${response.data.user.name}!`);
  };

  const logout = async () => {
    try {
        await axios.post(`${API_URL}/auth/logout`);
        toast.success('Successfully logged out.');
    } catch (e) {
        console.error('Logout error', e);
    } finally {
        setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      signup, 
      googleLogin, 
      logout, 
      showAuthModal, 
      setShowAuthModal,
      refreshUser: fetchUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
