import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import { 
  Upload, 
  Phone, 
  TrendingUp, 
  Clock,
  FileAudio,
  Calendar,
  ArrowRight,
  Activity
} from 'lucide-react';

const Dashboard = () => {
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalDuration: 0,
    averageSentiment: 'Neutral',
    pendingActions: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const calls = await apiService.getAllCalls();
      
      // Get recent calls (last 5)
      const recent = calls.slice(-5).reverse();
      setRecentCalls(recent);
      
      // Calculate stats
      const totalCalls = calls.length;
      
      // Calculate actual total duration from calls
      const totalDurationSeconds = calls.reduce((acc, call) => {
        return acc + (call.duration || 0);
      }, 0);
      const totalDurationMinutes = Math.round(totalDurationSeconds / 60);
      
      // Calculate average sentiment properly
      const sentiments = calls
        .map(call => call.sentiment)
        .filter(sentiment => sentiment && typeof sentiment === 'string');
      
      let averageSentiment = 'Neutral';
      if (sentiments.length > 0) {
        const sentimentScores = sentiments.map(sentiment => {
          const lowerSentiment = sentiment.toLowerCase();
          if (lowerSentiment.includes('positive')) return 1;
          if (lowerSentiment.includes('negative')) return -1;
          return 0;
        });
        
        const avgScore = sentimentScores.reduce((sum, score) => sum + score, 0) / sentiments.length;
        
        if (avgScore > 0.2) {
          averageSentiment = 'Positive';
        } else if (avgScore < -0.2) {
          averageSentiment = 'Negative';
        } else {
          averageSentiment = 'Neutral';
        }
      }
      
      setStats({
        totalCalls,
        totalDuration: totalDurationMinutes,
        averageSentiment,
        pendingActions: Math.floor(totalCalls * 2.3) // Mock average of 2.3 actions per call
      });

    } catch (err) {
      setError(err.message);
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Welcome back! Here's an overview of your conversation analytics.
          </p>
        </div>
        
        <Link 
          to="/upload" 
          className="mt-4 sm:mt-0 btn-primary inline-flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New Audio</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Phone className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Calls
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalCalls}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Duration
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalDuration >= 60 ? 
                  `${Math.floor(stats.totalDuration / 60)}h ${stats.totalDuration % 60}m` : 
                  `${stats.totalDuration}m`
                }
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg. Sentiment
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.averageSentiment}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Actions
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.pendingActions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Calls
          </h2>
          <Link 
            to="/calls"
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium inline-flex items-center space-x-1"
          >
            <span>View all</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
            <p className="text-red-700 dark:text-red-300">
              Error loading calls: {error}
            </p>
          </div>
        )}

        {recentCalls.length === 0 ? (
          <div className="text-center py-12">
            <FileAudio className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No calls yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Upload your first audio file to get started with conversation analytics.
            </p>
            <Link to="/upload" className="btn-primary">
              Upload Audio File
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentCalls.map((call) => (
              <Link
                key={call.id}
                to={`/calls/${call.id}`}
                className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <FileAudio className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {call.filename}
                      </p>
                      {call.summary && call.summary.length > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {call.summary[0]}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{formatTimeAgo(call.uploadedAt)}</span>
                        </div>
                        {call.sentiment && typeof call.sentiment === 'string' && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            call.sentiment.toLowerCase().includes('positive')
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : call.sentiment.toLowerCase().includes('negative')
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {call.sentiment}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link 
            to="/upload"
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors duration-200 text-center"
          >
            <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Upload Audio</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Drag & drop or select files
            </p>
          </Link>
          
          <Link 
            to="/calls"
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors duration-200 text-center"
          >
            <Phone className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Browse Calls</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              View past conversations
            </p>
          </Link>
          
          <Link 
            to="/settings"
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors duration-200 text-center"
          >
            <TrendingUp className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Analytics</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              View insights & trends
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;