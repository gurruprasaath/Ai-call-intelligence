import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  const { user, loading, login, register, logout, isAuthenticated, initialized } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const result = isLogin 
        ? await login({ email: formData.email, password: formData.password })
        : await register(formData);
      
      if (!result.success) {
        setError(result.error);
      } else {
        // Clear form on success
        setFormData({
          email: '',
          password: '',
          firstName: '',
          lastName: ''
        });
      }
    } catch (error) {
      setError('Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Show loading state while checking authentication
  if (!initialized) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-gray-600 dark:text-gray-400">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // If user is already logged in, show welcome message
  if (isAuthenticated && user) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                Logged in as {user.firstName} {user.lastName}
              </h3>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              📧 {user.email}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center">
              <span className="mr-1">✅</span>
              Email notifications enabled - you'll receive updates about your uploads
            </p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Show login/register form
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {isLogin ? 'Login' : 'Register'} for Email Notifications
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isLogin 
            ? 'Login to receive email notifications about your uploads'
            : 'Create an account to get personalized email notifications'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required={!isLogin}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required={!isLogin}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 mr-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
          >
            {submitting ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
          
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            {isLogin ? 'Need account?' : 'Have account?'}
          </button>
        </div>
      </form>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 <strong>Why register?</strong> Get email notifications for upload completion, 
          transcription ready, and analysis complete directly to your inbox!
        </p>
      </div>
    </div>
  );
};

export default Auth;