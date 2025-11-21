import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Filter,
  Search,
  Calendar,
  Trophy,
  Target,
  User,
  Settings,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  ExternalLink,
  Star,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-toastify';

const Tasks = () => {
  const { user, getToken } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    assignedTo: '',
    deadlineStart: '',
    deadlineEnd: ''
  });

  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'kanban', 'calendar'

  // Create task form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    deadline: '',
    estimatedDuration: 60,
    tags: ''
  });

  useEffect(() => {
    loadTasks();
    loadStats();
    loadNotifications();
    loadLeaderboard();
  }, [filters]);

  const loadTasks = async () => {
    try {
      const token = getToken();
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(`http://localhost:3001/api/tasks?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setTasks(data.tasks);
        setStats(data.stats);
      } else {
        toast.error('Failed to load tasks');
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Error loading tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:3001/api/tasks/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:3001/api/tasks/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:3001/api/tasks/leaderboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();

    if (!newTask.deadline) {
      toast.error('Please specify a deadline for the task');
      return;
    }

    try {
      const token = getToken();
      const response = await fetch('http://localhost:3001/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newTask,
          tags: newTask.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Task created successfully!');
        setShowCreateModal(false);
        setNewTask({
          title: '',
          description: '',
          assignedTo: '',
          priority: 'medium',
          deadline: '',
          estimatedDuration: 60,
          tags: ''
        });
        loadTasks();
      } else {
        toast.error(data.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Error creating task');
    }
  };

  const updateTaskStatus = async (taskId, status, notes = '') => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:3001/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        if (status === 'completed' && data.pointsEarned > 0) {
          toast.success(`🎉 You earned ${data.pointsEarned} points!`, { autoClose: 3000 });
        }
        loadTasks();
        loadStats();
      } else {
        toast.error(data.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Error updating task');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'urgent': 'text-red-600 bg-red-100',
      'high': 'text-orange-600 bg-orange-100',
      'medium': 'text-yellow-600 bg-yellow-100',
      'low': 'text-green-600 bg-green-100'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'text-gray-600 bg-gray-100',
      'in-progress': 'text-blue-600 bg-blue-100',
      'completed': 'text-green-600 bg-green-100',
      'overdue': 'text-red-600 bg-red-100',
      'cancelled': 'text-gray-600 bg-gray-100'
    };
    return colors[status] || colors.pending;
  };

  const formatDeadline = (deadline) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const overdueDays = Math.abs(diffDays);
      return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
    }

    if (diffDays === 0) {
      return 'Due today';
    }

    if (diffDays === 1) {
      return 'Due tomorrow';
    }

    return `Due in ${diffDays} days`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📋 Task Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Organize your action items and track progress with smart prioritization
          </p>
        </div>
        
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {showFilters ? <ChevronDown className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Points Earned</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.totalPoints || 0}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Search tasks..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deadline From
              </label>
              <input
                type="date"
                value={filters.deadlineStart}
                onChange={(e) => setFilters({...filters, deadlineStart: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deadline To
              </label>
              <input
                type="date"
                value={filters.deadlineEnd}
                onChange={(e) => setFilters({...filters, deadlineEnd: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({
                  status: '',
                  priority: '',
                  search: '',
                  assignedTo: '',
                  deadlineStart: '',
                  deadlineEnd: ''
                })}
                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tasks List */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Tasks ({tasks.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {tasks.length === 0 ? (
                <div className="p-8 text-center">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No tasks found. Create your first task to get started!
                  </p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.taskId}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {task.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {task.description}
                        </p>

                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDeadline(task.deadline)}
                          </div>
                          
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {task.assignedTo}
                          </div>

                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {task.estimatedDuration}min
                          </div>

                          {task.points.earned > 0 && (
                            <div className="flex items-center">
                              <Star className="w-4 h-4 mr-1 text-yellow-500" />
                              {task.points.earned + task.points.bonusEarned} pts
                            </div>
                          )}
                        </div>

                        {task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {task.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        {task.status !== 'completed' && task.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => updateTaskStatus(task.taskId, 'in-progress')}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              disabled={task.status === 'in-progress'}
                            >
                              {task.status === 'in-progress' ? 'In Progress' : 'Start'}
                            </button>
                            
                            <button
                              onClick={() => updateTaskStatus(task.taskId, 'completed')}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              Complete
                            </button>
                          </>
                        )}
                        
                        {task.status === 'completed' && (
                          <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded">
                            ✅ Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          {stats?.upcomingTasks?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🚨 Upcoming Deadlines
              </h3>
              <div className="space-y-3">
                {stats.upcomingTasks.map((task) => (
                  <div key={task.taskId} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-600">{formatDeadline(task.deadline)}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Points Summary */}
          {stats?.points && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🏆 Your Score
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Points Earned:</span>
                  <span className="font-semibold text-green-600">+{stats.points.earned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Penalties:</span>
                  <span className="font-semibold text-red-600">-{stats.points.penalty}</span>
                </div>
                <hr />
                <div className="flex justify-between">
                  <span className="font-semibold">Net Score:</span>
                  <span className="font-bold text-blue-600">{stats.points.net}</span>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📊 Leaderboard
              </h3>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <div key={entry.userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">{entry.userName}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{entry.totalPoints}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Task
            </h3>

            <form onSubmit={createTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what needs to be done"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={newTask.estimatedDuration}
                  onChange={(e) => setNewTask({...newTask, estimatedDuration: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTask.tags}
                  onChange={(e) => setNewTask({...newTask, tags: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., urgent, meeting, follow-up"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;