import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        fetchUser();
    } else {
        setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.log('No active session found');
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, token } = response.data;
    localStorage.setItem('token', token);
    setUser(user);
    setShowAuthModal(false);
    toast.success(`Welcome back, ${user.name}!`);
  };

  const signup = async (name, email, password) => {
    const response = await api.post('/auth/signup', { name, email, password });
    const { user, token } = response.data;
    localStorage.setItem('token', token);
    setUser(user);
    setShowAuthModal(false);
    toast.success(`Welcome to EquiTrade, ${user.name}!`);
  };

  const googleLogin = async (tokenId) => {
    const response = await api.post('/auth/google', { tokenId });
    const { user, token } = response.data;
    localStorage.setItem('token', token);
    setUser(user);
    setShowAuthModal(false);
    toast.success(`Welcome back, ${user.name}!`);
  };

  const logout = async () => {
    try {
        await api.post('/auth/logout');
        toast.success('Successfully logged out.');
    } catch (e) {
        console.error('Logout error', e);
    } finally {
        localStorage.removeItem('token');
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
