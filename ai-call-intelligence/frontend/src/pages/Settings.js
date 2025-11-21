import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import apiService from '../services/api';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Bell,
  Shield,
  Database,
  Zap,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';

const Settings = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [serverStatus, setServerStatus] = useState('unknown');
  const [notifications, setNotifications] = useState(true);
  const [autoDelete, setAutoDelete] = useState(false);
  const [deleteAfterDays, setDeleteAfterDays] = useState(30);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkServerHealth();
    loadSettings();
  }, []);

  const checkServerHealth = async () => {
    try {
      await apiService.healthCheck();
      setServerStatus('connected');
    } catch (error) {
      setServerStatus('error');
      console.error('Server health check failed:', error);
    }
  };

  const loadSettings = () => {
    // Load settings from localStorage
    const savedNotifications = localStorage.getItem('notifications');
    const savedAutoDelete = localStorage.getItem('autoDelete');
    const savedDeleteDays = localStorage.getItem('deleteAfterDays');
    const savedApiKey = localStorage.getItem('openai_api_key');

    if (savedNotifications !== null) {
      setNotifications(JSON.parse(savedNotifications));
    }
    if (savedAutoDelete !== null) {
      setAutoDelete(JSON.parse(savedAutoDelete));
    }
    if (savedDeleteDays !== null) {
      setDeleteAfterDays(parseInt(savedDeleteDays, 10));
    }
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
    localStorage.setItem('autoDelete', JSON.stringify(autoDelete));
    localStorage.setItem('deleteAfterDays', deleteAfterDays.toString());
    localStorage.setItem('openai_api_key', apiKey);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate saving to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      saveSettings();
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (serverStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>;
    }
  };

  const getStatusText = () => {
    switch (serverStatus) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Checking...';
    }
  };

  const getStatusColor = () => {
    switch (serverStatus) {
      case 'connected':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage your AI Call Intelligence preferences and configurations.
        </p>
      </div>

      {/* System Status */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            System Status
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Backend API
            </span>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              AI Services
            </span>
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                Mock Mode
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Development Mode
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Currently using mock AI services. Configure API keys below to enable real transcription and analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-4">
          {isDarkMode ? (
            <Moon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          ) : (
            <Sun className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          )}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Appearance
          </h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred color theme
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="btn-secondary inline-flex items-center space-x-2"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
          </h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Processing Notifications
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get notified when audio processing is complete
              </p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Data Management
          </h2>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-delete old calls
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically remove calls after a specified period
              </p>
            </div>
            <button
              onClick={() => setAutoDelete(!autoDelete)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoDelete ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoDelete ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {autoDelete && (
            <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Delete after (days)
                </span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={deleteAfterDays}
                  onChange={(e) => setDeleteAfterDays(parseInt(e.target.value, 10))}
                  className="input-field w-32"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* AI Integration */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Integration
          </h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                OpenAI API Key
              </span>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input-field"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Required for real transcription and analysis. Your key is stored locally and never sent to our servers.
              </p>
            </label>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Integration Instructions
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  To enable real AI processing, add your API key and update the backend service files as described in the documentation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="btn-primary px-6 py-2"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default Settings;