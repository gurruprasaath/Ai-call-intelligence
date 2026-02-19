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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-glow">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Welcome back! Here's an overview of your conversation analytics.
          </p>
        </div>
        
        <Link 
          to="/upload" 
          className="mt-4 sm:mt-0 btn-primary inline-flex items-center space-x-2 shadow-lg shadow-primary-500/20"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New Audio</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 border-l-4 border-l-primary-500">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <Phone className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total Calls
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.totalCalls}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-cyan-500">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Clock className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total Duration
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.totalDuration >= 60 ? 
                  `${Math.floor(stats.totalDuration / 60)}h ${stats.totalDuration % 60}m` : 
                  `${stats.totalDuration}m`
                }
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Avg. Sentiment
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.averageSentiment}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-pink-500">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Activity className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Pending Actions
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.pendingActions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Recent Calls
          </h2>
          <Link 
            to="/calls"
            className="text-primary-600 dark:text-primary-400 hover:text-primary-500 font-medium inline-flex items-center space-x-1 transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg mb-6">
            <p className="text-red-700 dark:text-red-300">
              Error loading calls: {error}
            </p>
          </div>
        )}

        {recentCalls.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileAudio className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No calls yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              Upload your first audio file to get started with conversation analytics.
            </p>
            <Link to="/upload" className="btn-primary">
              Upload Audio File
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCalls.map((call) => (
              <Link
                key={call.id}
                to={`/calls/${call.id}`}
                className="group block p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <FileAudio className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary-500 transition-colors">
                        {call.filename}
                      </p>
                      {call.summary && call.summary.length > 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          {call.summary[0]}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>{formatTimeAgo(call.uploadedAt)}</span>
                        </div>
                        {call.sentiment && typeof call.sentiment === 'string' && (
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            call.sentiment.toLowerCase().includes('positive')
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                              : call.sentiment.toLowerCase().includes('negative')
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                          }`}>
                            {call.sentiment}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-primary-500 transform group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            to="/upload"
            className="group p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-all duration-300">
              <Upload className="w-7 h-7 text-slate-400 dark:text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </div>
            <p className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              Upload Audio
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Drag & drop or select files
            </p>
          </Link>
          
          <Link 
            to="/calls"
            className="group p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-all duration-300">
              <Phone className="w-7 h-7 text-slate-400 dark:text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </div>
            <p className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              Browse Calls
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              View past conversations
            </p>
          </Link>
          
          <Link 
            to="/settings"
            className="group p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-all duration-300">
              <TrendingUp className="w-7 h-7 text-slate-400 dark:text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </div>
            <p className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              Analytics
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              View insights & trends
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;