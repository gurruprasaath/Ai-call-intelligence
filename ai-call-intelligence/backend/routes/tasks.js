/**
 * Task Management API Routes
 * 
 * Comprehensive REST API for task management including CRUD operations,
 * priority-based filtering, deadline management, and points calculation
 */

const express = require('express');
const router = express.Router();
const { Task, User } = require('../models');
const taskExtractionService = require('../services/taskExtraction');
const notificationService = require('../services/notificationService');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

/**
 * @route GET /api/tasks
 * @desc Get all tasks for authenticated user with filtering and sorting
 * @access Private
 */
router.get('/tasks', optionalAuth, async (req, res) => {
  try {
    const {
      status,
      priority,
      page = 1,
      limit = 20,
      sortBy = 'deadline',
      sortOrder = 'asc',
      search,
      assignedTo,
      deadlineStart,
      deadlineEnd
    } = req.query;

    // Extract user information from authenticated user or fallback to request body/headers
    const userEmail = req.user?.email || req.body.userEmail || req.headers['user-email'] || process.env.DEFAULT_USER_EMAIL;
    const userId = req.user?.userId || req.user?._id || userEmail || 'test-user';

    console.log('📋 Tasks API - User ID:', userId);
    console.log('📋 Tasks API - User Email:', userEmail);
    console.log('📋 Tasks API - Assigned To Filter:', assignedTo);

    // Build filter query
    const filters = {
      status,
      priority,
      deadlineStart,
      deadlineEnd
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) delete filters[key];
    });

    // Get tasks using the service
    const targetUserId = assignedTo || userId;
    console.log('📋 Filtering tasks for user:', targetUserId);
    
    const result = await taskExtractionService.getTasksByPriority(
      targetUserId,
      filters
    );

    if (!result.success) {
      console.error('📋 Task service error:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    console.log('📋 Found tasks from service:', result.tasks?.length || 0);

    // Apply search filter if provided
    let tasks = result.tasks;
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      tasks = tasks.filter(task => 
        searchRegex.test(task.title) || 
        searchRegex.test(task.description) ||
        task.tags.some(tag => searchRegex.test(tag))
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedTasks = tasks.slice(startIndex, startIndex + parseInt(limit));

    // Calculate task statistics
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => t.status === 'overdue').length,
      totalPoints: tasks.reduce((sum, t) => sum + (t.points.earned + t.points.bonusEarned), 0),
      totalPenalty: tasks.reduce((sum, t) => sum + t.points.penalty, 0)
    };

    res.json({
      success: true,
      tasks: paginatedTasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(tasks.length / limit),
        totalItems: tasks.length,
        itemsPerPage: parseInt(limit)
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
});

/**
 * @route GET /api/tasks/:taskId
 * @desc Get specific task details
 * @access Private
 */
router.get('/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const task = await Task.findOne({ taskId })
      .populate('sourceCall.callId', 'filename originalName createdAt')
      .lean();

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check if user has access to this task
    const userId = req.user.userId || req.user._id;
    if (task.assignedTo !== userId && task.assignedBy !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      task
    });

  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
});

/**
 * @route POST /api/tasks
 * @desc Create a new task manually
 * @access Private
 */
router.post('/tasks', optionalAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo,
      priority,
      deadline,
      estimatedDuration,
      tags
    } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    if (!deadline) {
      return res.status(400).json({
        success: false,
        error: 'Deadline is required. Please specify when this task should be completed.'
      });
    }

    // Extract user information consistent with upload endpoint
    const userEmail = req.user?.email || req.body.userEmail || req.headers['user-email'] || process.env.DEFAULT_USER_EMAIL;
    const createdBy = req.user?.userId || req.user?._id || userEmail || 'test-user';

    const result = await taskExtractionService.createManualTask({
      title,
      description,
      assignedTo: assignedTo || createdBy,
      priority: priority || 'medium',
      deadline,
      estimatedDuration,
      tags
    }, createdBy);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: result.task
    });

  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
});

/**
 * @route PUT /api/tasks/:taskId
 * @desc Update task details
 * @access Private
 */
router.put('/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    const userId = req.user.userId || req.user._id;

    // Find the task
    const task = await Task.findOne({ taskId });
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check permissions
    if (task.assignedTo !== userId && task.assignedBy !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'assignedTo', 'priority', 'deadline', 'estimatedDuration', 'tags', 'status'];
    const updateData = {};

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Add metadata
    updateData['metadata.lastModifiedBy'] = userId;

    const updatedTask = await Task.findOneAndUpdate(
      { taskId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
});

/**
 * @route PUT /api/tasks/:taskId/status
 * @desc Update task status (complete, cancel, etc.)
 * @access Private
 */
router.put('/tasks/:taskId/status', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, notes, attachments } = req.body;
    const userId = req.user.userId || req.user._id;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const task = await Task.findOne({ taskId });
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check permissions
    if (task.assignedTo !== userId && task.assignedBy !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update task status
    const updateData = {
      status,
      'metadata.lastModifiedBy': userId
    };

    // Add completion details if marking as completed
    if (status === 'completed') {
      updateData['completionDetails.completedBy'] = userId;
      updateData['completionDetails.notes'] = notes;
      updateData['completionDetails.attachments'] = attachments || [];
    }

    const updatedTask = await Task.findOneAndUpdate(
      { taskId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Send completion notification if task was completed
    if (status === 'completed') {
      await notificationService.sendTaskCompletionNotification(updatedTask, userId);
    }

    res.json({
      success: true,
      message: `Task ${status === 'completed' ? 'completed' : 'updated'} successfully`,
      task: updatedTask,
      pointsEarned: status === 'completed' ? updatedTask.points.earned + updatedTask.points.bonusEarned : 0
    });

  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task status'
    });
  }
});

/**
 * @route DELETE /api/tasks/:taskId
 * @desc Delete a task
 * @access Private
 */
router.delete('/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId || req.user._id;

    const task = await Task.findOne({ taskId });
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check permissions (only creator or admin can delete)
    if (task.assignedBy !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only the task creator or admin can delete tasks'
      });
    }

    await Task.deleteOne({ taskId });

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
});

/**
 * @route GET /api/tasks/dashboard/stats
 * @desc Get task dashboard statistics for user
 * @access Private
 */
router.get('/tasks/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const stats = await Task.getUserStats(userId);
    
    // Get upcoming deadlines (next 7 days)
    const upcomingTasks = await Task.find({
      assignedTo: userId,
      status: { $in: ['pending', 'in-progress'] },
      deadline: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })
    .sort({ deadline: 1 })
    .limit(5)
    .select('taskId title priority deadline')
    .lean();

    // Calculate total points
    const totalPoints = await Task.aggregate([
      { $match: { assignedTo: userId, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: { $add: ['$points.earned', '$points.bonusEarned'] } },
          totalPenalty: { $sum: '$points.penalty' }
        }
      }
    ]);

    const points = totalPoints[0] || { totalEarned: 0, totalPenalty: 0 };

    res.json({
      success: true,
      stats: {
        ...stats,
        upcomingTasks,
        points: {
          earned: points.totalEarned,
          penalty: points.totalPenalty,
          net: points.totalEarned - points.totalPenalty
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

/**
 * @route GET /api/tasks/notifications
 * @desc Get in-app notifications for user
 * @access Private
 */
router.get('/tasks/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const notifications = notificationService.getInAppNotifications(userId);

    res.json({
      success: true,
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

/**
 * @route PUT /api/tasks/notifications/:notificationId/read
 * @desc Mark notification as read
 * @access Private
 */
router.put('/tasks/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId || req.user._id;

    notificationService.markNotificationAsRead(userId, notificationId);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * @route DELETE /api/tasks/notifications
 * @desc Clear all notifications for user
 * @access Private
 */
router.delete('/tasks/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    notificationService.clearNotifications(userId);

    res.json({
      success: true,
      message: 'All notifications cleared'
    });

  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear notifications'
    });
  }
});

/**
 * @route POST /api/tasks/extract-from-call/:callId
 * @desc Extract tasks from a specific call
 * @access Private
 */
router.post('/tasks/extract-from-call/:callId', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId || req.user._id;

    // This would be called from the analysis service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Task extraction endpoint ready',
      callId
    });

  } catch (error) {
    console.error('Error extracting tasks from call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extract tasks from call'
    });
  }
});

/**
 * @route GET /api/tasks/debug
 * @desc Debug endpoint to see all tasks and their user IDs
 * @access Public (for debugging)
 */
router.get('/tasks/debug', async (req, res) => {
  try {
    const allTasks = await Task.find({}).select('taskId title assignedTo assignedBy status priority deadline').lean();
    
    res.json({
      success: true,
      count: allTasks.length,
      tasks: allTasks
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/tasks/fix-unassigned
 * @desc Fix tasks that are not assigned to any user
 * @access Public (for debugging)
 */
router.post('/tasks/fix-unassigned', async (req, res) => {
  try {
    // Find tasks with "Not specified" or similar assignedTo values
    const unassignedTasks = await Task.find({
      assignedTo: { $in: ['Not specified', 'Unassigned', '', null] }
    });
    
    console.log('🔧 Found unassigned tasks:', unassignedTasks.length);
    
    const updates = [];
    for (const task of unassignedTasks) {
      // Use the assignedBy user ID as the assignedTo
      const newAssignedTo = task.assignedBy || task.metadata?.createdBy || 'test-user';
      
      await Task.updateOne(
        { _id: task._id },
        { $set: { assignedTo: newAssignedTo } }
      );
      
      updates.push({
        taskId: task.taskId,
        title: task.title,
        oldAssignedTo: task.assignedTo,
        newAssignedTo: newAssignedTo
      });
    }
    
    res.json({
      success: true,
      message: `Fixed ${updates.length} unassigned tasks`,
      updates
    });
    
  } catch (error) {
    console.error('Error fixing unassigned tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/tasks/test-extraction/:callId
 * @desc Test task extraction for a specific call
 * @access Public (for debugging)
 */
router.post('/tasks/test-extraction/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const { Call, Analysis } = require('../models');
    
    // Get the call and its analysis
    const call = await Call.findById(callId).populate('fullAnalysis');
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    if (!call.fullAnalysis) {
      return res.status(400).json({ error: 'Call has no analysis data' });
    }
    
    console.log('🧪 Testing task extraction for call:', callId);
    console.log('🧪 Analysis data:', call.fullAnalysis);
    
    // Extract the transcription text
    const { Transcription } = require('../models');
    const transcription = await Transcription.findOne({ callId });
    
    const taskExtractionService = require('../services/taskExtraction');
    const result = await taskExtractionService.extractTasksFromCall(
      callId,
      transcription?.text || 'No transcription available',
      call.fullAnalysis,
      call.userId || call.userEmail || 'test-user'
    );
    
    res.json({
      success: true,
      message: 'Task extraction test completed',
      result,
      callData: {
        id: callId,
        userId: call.userId,
        userEmail: call.userEmail,
        hasAnalysis: !!call.fullAnalysis,
        actionItemsCount: call.fullAnalysis?.actionItems?.length || 0
      }
    });
    
  } catch (error) {
    console.error('Error in test extraction:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * @route GET /api/tasks/leaderboard
 * @desc Get points leaderboard
 * @access Private
 */
router.get('/tasks/leaderboard', authenticateToken, async (req, res) => {
  try {
    const leaderboard = await Task.aggregate([
      {
        $match: {
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          totalPoints: {
            $sum: {
              $subtract: [
                { $add: ['$points.earned', '$points.bonusEarned'] },
                '$points.penalty'
              ]
            }
          },
          tasksCompleted: { $sum: 1 },
          averagePoints: {
            $avg: {
              $subtract: [
                { $add: ['$points.earned', '$points.bonusEarned'] },
                '$points.penalty'
              ]
            }
          }
        }
      },
      {
        $sort: { totalPoints: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get user details for leaderboard
    const leaderboardWithUsers = await Promise.all(
      leaderboard.map(async (entry) => {
        const user = await User.findOne({ userId: entry._id }).select('firstName lastName email');
        return {
          userId: entry._id,
          userName: user ? `${user.firstName} ${user.lastName}` : entry._id,
          totalPoints: Math.round(entry.totalPoints),
          tasksCompleted: entry.tasksCompleted,
          averagePoints: Math.round(entry.averagePoints)
        };
      })
    );

    res.json({
      success: true,
      leaderboard: leaderboardWithUsers
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

module.exports = router;