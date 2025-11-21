import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Auto-login on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          console.log('🔍 Found existing token, verifying...');
          
          // Verify token and get user info
          const response = await api.get('/auth/profile');
          setUser(response.data.user);
          console.log('✅ Auto-login successful:', response.data.user.email);
        } else {
          console.log('ℹ️ No existing token found');
        }
      } catch (error) {
        console.warn('⚠️ Auto-login failed:', error.response?.data?.error || error.message);
        // Remove invalid token
        localStorage.removeItem('authToken');
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { user: userData, token } = response.data;
      
      // Store token
      localStorage.setItem('authToken', token);
      setUser(userData);
      
      console.log('✅ Login successful:', userData.email);
      return { success: true, user: userData };
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { user: newUser, token } = response.data;
      
      // Store token
      localStorage.setItem('authToken', token);
      setUser(newUser);
      
      console.log('✅ Registration successful:', newUser.email);
      return { success: true, user: newUser };
      
    } catch (error) {
      console.error('❌ Registration failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    console.log('👋 User logged out');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    initialized,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;