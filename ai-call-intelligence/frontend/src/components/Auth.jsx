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
      <div className="card p-8 mb-6 flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <span className="text-slate-600 dark:text-slate-400 font-medium">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // If user is already logged in, show welcome message
  if (isAuthenticated && user) {
    return (
      <div className="card p-8 mb-6 border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Welcome back, {user.firstName}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
              <span className="opacity-75 mr-2">📧</span> {user.email}
            </p>
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-green-100/50 dark:bg-green-900/30 text-xs font-medium text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
              <span className="mr-1">✅</span>
              Notifications Active
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors duration-200 border border-red-200 dark:border-red-900/50"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Show login/register form
  return (
    <div className="card p-8 mb-6">
      <div className="mb-8 text-center">
        <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-primary-400 dark:to-indigo-400 mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {isLogin 
            ? 'Access your unified communication intelligence platform'
            : 'Join the platform to unlock advanced call analytics'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {!isLogin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required={!isLogin}
                className="input-field"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required={!isLogin}
                className="input-field"
                placeholder="Doe"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="name@company.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-900/30 flex items-center">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex justify-center items-center py-3 text-lg shadow-primary-500/25"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Processing...
              </>
            ) : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </div>
        
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary-600 dark:text-primary-400 text-sm hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Auth;