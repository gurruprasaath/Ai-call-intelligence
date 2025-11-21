import React, { createContext, useContext, useReducer, useEffect } from 'react';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Auth Context
const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token') || localStorage.getItem('authToken'), // Support both token keys
  isAuthenticated: false,
  loading: true,
  initialized: false,
  error: null
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    
    case 'LOAD_USER_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        initialized: true,
        error: null
      };
    
    case 'LOAD_USER_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        initialized: true,
        error: null
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    default:
      return state;
  }
};

// Auth service functions
const authService = {
  // Register user
  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Login user
  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get user profile
  async getProfile(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update user profile
  async updateProfile(token, updateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Profile update failed');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Change password
  async changePassword(token, passwordData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password change failed');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Check token validity
  async checkToken(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token validation failed');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Logout
  async logout(token) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on app start - check both token keys
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      if (token) {
        try {
          console.log('🔍 Auto-loading user with existing token...');
          
          // Use direct API call instead of authService for now
          const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Auto-login successful:', data.user.email);
            
            // Ensure token is stored in both locations
            localStorage.setItem('token', token);
            localStorage.setItem('authToken', token);
            
            dispatch({
              type: 'LOAD_USER_SUCCESS',
              payload: data.user
            });
          } else {
            console.warn('⚠️ Token validation failed, removing invalid tokens');
            // Token is invalid, remove both
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            dispatch({ type: 'LOAD_USER_FAILURE' });
          }
        } catch (error) {
          console.error('❌ Auto-login error:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
          dispatch({ type: 'LOAD_USER_FAILURE' });
        }
      } else {
        console.log('ℹ️ No existing token found');
        dispatch({ type: 'LOAD_USER_FAILURE' });
      }
    };

    loadUser();
  }, []);

  // Auth actions
  const login = async (credentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    const result = await authService.login(credentials);
    
    if (result.success) {
      const { user, token } = result.data;
      
      // Store token in both localStorage keys for compatibility
      localStorage.setItem('token', token);
      localStorage.setItem('authToken', token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      });
      
      return { success: true };
    } else {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: result.error
      });
      
      return { success: false, error: result.error };
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    const result = await authService.register(userData);
    
    if (result.success) {
      const { user, token } = result.data;
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      });
      
      return { success: true };
    } else {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: result.error
      });
      
      return { success: false, error: result.error };
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('token');
    
    if (token) {
      await authService.logout(token);
    }
    
    // Remove tokens from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfile = async (updateData) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return { success: false, error: 'No authentication token found' };
    }
    
    const result = await authService.updateProfile(token, updateData);
    
    if (result.success) {
      dispatch({
        type: 'UPDATE_USER',
        payload: result.data.user
      });
      
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  };

  const changePassword = async (passwordData) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return { success: false, error: 'No authentication token found' };
    }
    
    const result = await authService.changePassword(token, passwordData);
    
    return result;
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return state.isAuthenticated && state.token && state.user;
  };

  // Get current user
  const getCurrentUser = () => {
    return state.user;
  };

  // Get auth token
  const getToken = () => {
    return state.token || localStorage.getItem('token');
  };

  // Context value
  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
    isAuthenticated: isAuthenticated(),
    getCurrentUser,
    getToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Higher-order component for protected routes
export const withAuth = (WrappedComponent) => {
  return (props) => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      // Redirect to login page
      window.location.href = '/login';
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };
};

export default AuthContext;