import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import { 
  FileAudio, 
  Calendar, 
  Clock, 
  Search,
  Filter,
  Trash2,
  Eye,
  Download,
  SortAsc,
  SortDesc
} from 'lucide-react';

const PastCalls = () => {
  const [calls, setCalls] = useState([]);
  const [filteredCalls, setFilteredCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterBy, setFilterBy] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    loadCalls();
    
    // Set up auto-refresh for new mobile uploads (every 30 seconds)
    const refreshInterval = setInterval(() => {
      loadCalls(true); // silent refresh
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    filterAndSortCalls();
  }, [calls, searchTerm, sortBy, sortOrder, filterBy, categoryFilter]);

  const loadCalls = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const callsData = await apiService.getAllCalls();
      
      // Check for new calls (compare with previous length)
      const hasNewCalls = calls.length > 0 && callsData.length > calls.length;
      
      setCalls(callsData);
      
      // Show notification for new calls
      if (hasNewCalls && silent) {
        console.log('🔔 New call recordings detected');
        // Could add toast notification here if desired
      }
    } catch (err) {
      if (!silent) {
        setError(err.message);
        console.error('Error loading calls:', err);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const filterAndSortCalls = () => {
    let filtered = [...calls];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(call =>
        call.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (call.summary && call.summary.some(item => 
          item.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }

    // Apply sentiment filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(call =>
        call.sentiment?.toLowerCase().includes(filterBy.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'mobile') {
        filtered = filtered.filter(call => call.mobile === true);
      } else {
        filtered = filtered.filter(call =>
          call.category?.toLowerCase() === categoryFilter.toLowerCase()
        );
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'filename':
          aValue = a.filename.toLowerCase();
          bValue = b.filename.toLowerCase();
          break;
        case 'sentiment':
          aValue = a.sentiment || '';
          bValue = b.sentiment || '';
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'date':
        default:
          aValue = new Date(a.uploadedAt);
          bValue = new Date(b.uploadedAt);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredCalls(filtered);
  };

  const handleDelete = async (callId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteCall(callId);
      setCalls(prevCalls => prevCalls.filter(call => call.id !== callId));
    } catch (err) {
      console.error('Error deleting call:', err);
      alert('Failed to delete call: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatDuration = (durationInSeconds) => {
    if (!durationInSeconds || durationInSeconds < 0) return 'N/A';
    
    if (durationInSeconds < 60) {
      return `${Math.floor(durationInSeconds)}s`;
    } else {
      const minutes = Math.floor(durationInSeconds / 60);
      const seconds = Math.floor(durationInSeconds % 60);
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
  };

  const getSentimentColor = (sentiment) => {
    if (!sentiment || typeof sentiment !== 'string') return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    
    if (sentiment.toLowerCase().includes('positive')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    } else if (sentiment.toLowerCase().includes('negative')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    } else {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      'work': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'family': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'personal': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'education': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'healthcare': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'financial': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
      'technical': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      'legal': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      'general': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
    };
    return colorMap[category?.toLowerCase()] || colorMap['general'];
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      'work': '💼',
      'family': '👨‍👩‍👧‍👦',
      'personal': '🧑',
      'education': '🎓',
      'healthcare': '🏥',
      'financial': '💰',
      'technical': '💻',
      'legal': '⚖️',
      'general': '💬'
    };
    return iconMap[category?.toLowerCase()] || iconMap['general'];
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
            Past Calls
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {filteredCalls.length} of {calls.length} calls
          </p>
        </div>
        
        <Link 
          to="/upload" 
          className="mt-4 sm:mt-0 btn-primary inline-flex items-center space-x-2"
        >
          <FileAudio className="w-4 h-4" />
          <span>Upload New Audio</span>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search calls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Filter by Sentiment */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="input-field pl-10"
            >
              <option value="all">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          {/* Filter by Category */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field pl-10"
            >
              <option value="">All Categories</option>
              <option value="work">💼 Work</option>
              <option value="family">👨‍👩‍👧‍👦 Family</option>
              <option value="personal">🧑 Personal</option>
              <option value="education">🎓 Education</option>
              <option value="healthcare">🏥 Healthcare</option>
              <option value="financial">💰 Financial</option>
              <option value="technical">💻 Technical</option>
              <option value="legal">⚖️ Legal</option>
              <option value="general">💬 General</option>
              <option value="mobile">📱 Mobile Recordings</option>
            </select>
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field"
          >
            <option value="date">Sort by Date</option>
            <option value="filename">Sort by Name</option>
            <option value="sentiment">Sort by Sentiment</option>
            <option value="category">Sort by Category</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn-secondary inline-flex items-center justify-center space-x-2"
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card p-6">
          <p className="text-red-600 dark:text-red-400">
            Error loading calls: {error}
          </p>
          <button
            onClick={loadCalls}
            className="mt-4 btn-primary"
          >
            Retry
          </button>
        </div>
      )}

      {/* Calls List */}
      {filteredCalls.length === 0 ? (
        <div className="card p-12 text-center">
          <FileAudio className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || filterBy !== 'all' ? 'No matching calls found' : 'No calls yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm || filterBy !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Upload your first audio file to get started with conversation analytics.'
            }
          </p>
          {!searchTerm && filterBy === 'all' && (
            <Link to="/upload" className="btn-primary">
              Upload Audio File
            </Link>
          )}
        </div>
      ) : (
        <div className="card">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-6 font-medium text-gray-700 dark:text-gray-300">File</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700 dark:text-gray-300">Duration</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700 dark:text-gray-300">Sentiment</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700 dark:text-gray-300">Category</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map((call) => (
                  <tr key={call.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                            <FileAudio className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                              {call.filename}
                            </p>
                            {call.mobile && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400" title="Mobile Upload">
                                📱
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {formatDuration(call.duration)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTimeAgo(call.uploadedAt)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {call.sentiment && typeof call.sentiment === 'string' && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(call.sentiment)}`}>
                          {call.sentiment}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {call.category && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(call.category)}`}>
                          {getCategoryIcon(call.category)} {call.category}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/calls/${call.id}`}
                          className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(call.id, call.filename)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {filteredCalls.map((call) => (
              <div key={call.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                      <FileAudio className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {call.filename}
                        </p>
                        {call.mobile && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400" title="Mobile Upload">
                            📱
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {formatTimeAgo(call.uploadedAt)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {formatDuration(call.duration)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {call.sentiment && typeof call.sentiment === 'string' && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(call.sentiment)}`}>
                        {call.sentiment}
                      </span>
                    )}
                    {call.category && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(call.category)}`}>
                        {getCategoryIcon(call.category)} {call.category}
                      </span>
                    )}
                  </div>
                </div>

                {call.summary?.[0] && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {call.summary[0]}
                  </p>
                )}

                <div className="flex items-center justify-end space-x-2">
                  <Link
                    to={`/calls/${call.id}`}
                    className="btn-secondary text-xs py-1 px-2"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => handleDelete(call.id, call.filename)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PastCalls;