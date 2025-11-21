/**
 * Task Extraction Service
 * 
 * This service uses AI to intelligently extract actionable tasks from call transcriptions
 * with automatic deadline parsing, priority assessment, and assignee detection.
 */

const Groq = require('groq-sdk');
const { Task, User } = require('../models');
const notificationService = require('./notificationService');

class TaskExtractionService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  /**
   * Extract tasks from call transcription or analysis
   */
  async extractTasksFromCall(callId, transcriptionText, analysisData, userId) {
    try {
      console.log(`🎯 Extracting tasks from call ${callId}`);
      console.log('🎯 Analysis data received:', JSON.stringify(analysisData, null, 2));

      const extractedTasks = [];

      // First, convert existing action items directly to tasks
      if (analysisData?.actionItems && analysisData.actionItems.length > 0) {
        console.log('📋 Converting existing action items to tasks...');
        
        for (const actionItem of analysisData.actionItems) {
          try {
            console.log('📋 Processing action item:', actionItem);
            
            // Fix assignedTo - if not specified or invalid, assign to the user who uploaded
            let assignedToUser = userId; // Default to uploader
            if (actionItem.assignedTo && 
                actionItem.assignedTo !== 'Not specified' && 
                actionItem.assignedTo !== 'Unassigned' &&
                actionItem.assignedTo.trim().length > 0) {
              assignedToUser = actionItem.assignedTo;
            }
            
            const taskData = {
              title: actionItem.task || 'Action Item',
              description: actionItem.task || 'No description provided',
              assignedTo: assignedToUser, // Always assign to a real user
              assignedBy: userId,
              priority: this.convertPriority(actionItem.priority),
              deadline: this.parseDeadline(actionItem.deadline),
              estimatedDuration: this.parseEffort(actionItem.estimatedEffort),
              tags: ['action-item', 'auto-extracted'],
              sourceCall: {
                callId: callId,
                extractedFrom: 'analysis'
              },
              metadata: {
                createdBy: userId,
                createdFromAI: true,
                confidence: 0.9,
                originalText: actionItem.task
              }
            };
            
            console.log('📋 Creating task with data:', taskData);

            const savedTask = await Task.create(taskData);
            extractedTasks.push(savedTask);
            
            console.log(`✅ Created task from action item: ${savedTask.title}`);
            
            // Send task creation notification
            await this.sendTaskCreationNotification(savedTask, userId);
            
            // Schedule automatic reminders
            await this.scheduleTaskReminders(savedTask);
          } catch (error) {
            console.error(`❌ Error creating task from action item:`, error.message);
          }
        }
      }

      // If no action items, try AI extraction as fallback
      if (extractedTasks.length === 0) {
        console.log('🤖 No action items found, trying AI extraction...');
        
        const extractionPrompt = this.buildTaskExtractionPrompt(transcriptionText, analysisData);

        const completion = await this.groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an expert task extraction system. Your job is to analyze meeting transcriptions and extract actionable tasks with deadlines, priorities, and assignments. Always respond with valid JSON.`
            },
            {
              role: "user",
              content: extractionPrompt
            }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        });

        const aiResponse = JSON.parse(completion.choices[0]?.message?.content || '{"tasks": []}');
        console.log('🤖 AI Response for task extraction:', JSON.stringify(aiResponse, null, 2));
        
        const aiExtractedTasks = await this.processExtractedTasks(aiResponse.tasks, callId, userId, transcriptionText);
        extractedTasks.push(...aiExtractedTasks);
      }

      console.log(`✅ Successfully extracted ${extractedTasks.length} tasks from call ${callId}`);

      return {
        success: true,
        tasksCount: extractedTasks.length,
        tasks: extractedTasks
      };

    } catch (error) {
      console.error('❌ Error in task extraction:', error);
      return {
        success: false,
        error: error.message,
        tasksCount: 0,
        tasks: []
      };
    }
  }

  /**
   * Build AI prompt for task extraction
   */
  buildTaskExtractionPrompt(transcriptionText, analysisData) {
    const actionItems = analysisData?.actionItems || [];
    const keyDecisions = analysisData?.keyDecisions || [];
    
    console.log('🎯 Action items found in analysis:', actionItems);
    console.log('🎯 Key decisions found in analysis:', keyDecisions);
    
    return `
Please analyze the following meeting transcription and extract actionable tasks. Focus on:

1. Explicit task assignments ("John will...", "Sarah needs to...", "We need to...")
2. Implied responsibilities from decisions made
3. Follow-up actions mentioned
4. Deadlines and timeframes mentioned

TRANSCRIPTION:
${transcriptionText}

${actionItems.length > 0 ? `
PREVIOUSLY IDENTIFIED ACTION ITEMS:
${actionItems.map(item => `- ${item.task} (Assigned to: ${item.assignedTo}, Priority: ${item.priority}, Deadline: ${item.deadline})`).join('\n')}
` : ''}

${keyDecisions.length > 0 ? `
KEY DECISIONS MADE:
${keyDecisions.map(decision => `- ${decision.decision} (Impact: ${decision.impact})`).join('\n')}
` : ''}

Extract tasks and respond with JSON in this exact format:
{
  "tasks": [
    {
      "title": "Brief task title (max 100 chars)",
      "description": "Detailed description of what needs to be done",
      "assignedTo": "Person's name or 'Unassigned' if unclear",
      "priority": "low|medium|high|urgent",
      "deadline": "ISO 8601 date string or null if no specific date mentioned",
      "estimatedDuration": "Duration in minutes (number)",
      "tags": ["tag1", "tag2"],
      "confidence": 0.8,
      "originalText": "The exact text from transcript that led to this task",
      "reasoning": "Brief explanation of why this is considered a task"
    }
  ]
}

IMPORTANT RULES:
- Only extract genuine, actionable tasks (not general discussions)
- If no specific person is assigned, use "Unassigned"
- For deadlines: parse natural language dates ("next week" = 7 days from now, "end of month" = last day of current month)
- Priority assessment: urgent = same day, high = this week, medium = this month, low = longer term
- Confidence should reflect how certain you are this is a real task assignment
- Include 2-4 relevant tags per task
- Minimum confidence threshold: 0.6
`;
  }

  /**
   * Process and validate extracted tasks before saving
   */
  async processExtractedTasks(rawTasks, callId, extractedBy, originalText) {
    const processedTasks = [];

    for (const rawTask of rawTasks) {
      try {
        // Validate minimum confidence threshold
        if (rawTask.confidence < 0.6) {
          console.log(`⚠️ Skipping low confidence task: ${rawTask.title} (${rawTask.confidence})`);
          continue;
        }

        // Process deadline
        const processedDeadline = this.parseDeadline(rawTask.deadline);
        
        // Determine assignee
        const assignee = this.processAssignee(rawTask.assignedTo);

        // Create task object
        const taskData = {
          title: rawTask.title?.trim() || 'Untitled Task',
          description: rawTask.description?.trim() || 'No description provided',
          assignedTo: assignee,
          assignedBy: extractedBy,
          priority: rawTask.priority || 'medium',
          deadline: processedDeadline,
          estimatedDuration: this.validateDuration(rawTask.estimatedDuration),
          tags: this.processTags(rawTask.tags),
          sourceCall: {
            callId: callId,
            extractedFrom: 'analysis'
          },
          reminders: this.generateReminders(processedDeadline),
          metadata: {
            createdBy: extractedBy,
            createdFromAI: true,
            confidence: rawTask.confidence,
            originalText: rawTask.originalText || originalText.substring(0, 500)
          }
        };

        // Save to database
        const savedTask = await Task.create(taskData);
        processedTasks.push(savedTask);

        console.log(`✅ Created task: ${savedTask.title} (${savedTask.taskId})`);
        
        // Send task creation notification
        await this.sendTaskCreationNotification(savedTask, userId);
        
        // Schedule automatic reminders
        await this.scheduleTaskReminders(savedTask);

      } catch (error) {
        console.error(`❌ Error processing task "${rawTask.title}":`, error.message);
      }
    }

    return processedTasks;
  }

  /**
   * Convert priority from analysis format to task format
   */
  convertPriority(analysisPriority) {
    if (!analysisPriority) return 'medium';
    
    const priority = analysisPriority.toLowerCase();
    if (priority.includes('critical') || priority.includes('high')) return 'high';
    if (priority.includes('low')) return 'low';
    return 'medium';
  }

  /**
   * Parse effort estimation into minutes
   */
  parseEffort(effortStr) {
    if (!effortStr) return 60; // Default 1 hour
    
    const effort = effortStr.toLowerCase();
    if (effort.includes('hour')) {
      const hours = parseInt(effort.match(/(\d+)/)?.[1] || '1');
      return hours * 60;
    }
    if (effort.includes('day')) {
      const days = parseInt(effort.match(/(\d+)/)?.[1] || '1');
      return days * 8 * 60; // 8 hour work day
    }
    return 60;
  }

  /**
   * Parse natural language deadlines into Date objects
   */
  parseDeadline(deadlineStr) {
    if (!deadlineStr) {
      // Default to 1 week if no deadline specified
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    // Try to parse as ISO date first
    const isoDate = new Date(deadlineStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Natural language parsing
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const lowerStr = deadlineStr.toLowerCase();

    if (lowerStr.includes('today') || lowerStr.includes('same day')) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
    }
    if (lowerStr.includes('tomorrow')) {
      return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59);
    }
    if (lowerStr.includes('next week') || lowerStr.includes('week')) {
      return nextWeek;
    }
    if (lowerStr.includes('end of month') || lowerStr.includes('month end')) {
      return endOfMonth;
    }
    if (lowerStr.includes('next month')) {
      return new Date(now.getFullYear(), now.getMonth() + 2, 0);
    }

    // Extract number of days
    const daysMatch = lowerStr.match(/(\d+)\s*days?/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    // Default fallback
    return nextWeek;
  }

  /**
   * Process assignee names and handle unassigned cases
   */
  processAssignee(assignedTo) {
    if (!assignedTo || assignedTo.toLowerCase().includes('unassigned') || assignedTo.toLowerCase().includes('unclear')) {
      return 'Unassigned';
    }

    // Clean up the name
    return assignedTo.trim()
      .replace(/^(mr|mrs|ms|dr)\.?\s+/i, '')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Validate and normalize duration
   */
  validateDuration(duration) {
    const parsed = parseInt(duration);
    if (isNaN(parsed) || parsed < 5) {
      return 60; // Default 1 hour
    }
    return Math.min(parsed, 480); // Max 8 hours
  }

  /**
   * Process and validate tags
   */
  processTags(tags) {
    if (!Array.isArray(tags)) {
      return ['general'];
    }

    return tags
      .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
      .map(tag => tag.trim().toLowerCase().replace(/\s+/g, '-'))
      .slice(0, 5); // Max 5 tags
  }

  /**
   * Generate automatic reminders based on deadline
   */
  generateReminders(deadline) {
    const reminders = [];
    const now = new Date();
    const timeUntilDeadline = deadline.getTime() - now.getTime();
    const daysUntilDeadline = Math.ceil(timeUntilDeadline / (24 * 60 * 60 * 1000));

    // Add reminders based on time until deadline
    if (daysUntilDeadline > 7) {
      // 1 week before
      reminders.push({
        type: 'in-app',
        scheduledFor: new Date(deadline.getTime() - 7 * 24 * 60 * 60 * 1000)
      });
    }

    if (daysUntilDeadline > 3) {
      // 3 days before
      reminders.push({
        type: 'email',
        scheduledFor: new Date(deadline.getTime() - 3 * 24 * 60 * 60 * 1000)
      });
    }

    if (daysUntilDeadline > 1) {
      // 1 day before
      reminders.push({
        type: 'in-app',
        scheduledFor: new Date(deadline.getTime() - 24 * 60 * 60 * 1000)
      });
    }

    return reminders;
  }

  /**
   * Manual task creation with user input for deadline
   */
  async createManualTask(taskData, createdBy) {
    try {
      // Validate required fields
      if (!taskData.title || !taskData.description) {
        throw new Error('Title and description are required');
      }

      // Process deadline - if not provided, prompt for user input
      let deadline = taskData.deadline;
      if (!deadline) {
        // This would typically be handled by the frontend
        deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 1 week
      } else {
        deadline = new Date(deadline);
        if (isNaN(deadline.getTime())) {
          throw new Error('Invalid deadline format');
        }
      }

      const task = await Task.create({
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        assignedTo: taskData.assignedTo || 'Unassigned',
        assignedBy: createdBy,
        priority: taskData.priority || 'medium',
        deadline: deadline,
        estimatedDuration: this.validateDuration(taskData.estimatedDuration),
        tags: this.processTags(taskData.tags),
        reminders: this.generateReminders(deadline),
        metadata: {
          createdBy: createdBy,
          createdFromAI: false
        }
      });

      return {
        success: true,
        task: task
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get tasks with priority and deadline sorting
   */
  async getTasksByPriority(userId, filters = {}) {
    try {
      console.log('🎯 TaskService - Getting tasks for userId:', userId);
      const query = { assignedTo: userId };
      
      console.log('🎯 TaskService - Base query:', query);

      // Apply status filter
      if (filters.status) {
        query.status = filters.status;
      }

      // Apply priority filter
      if (filters.priority) {
        query.priority = filters.priority;
      }

      // Apply deadline range filter
      if (filters.deadlineStart || filters.deadlineEnd) {
        query.deadline = {};
        if (filters.deadlineStart) {
          query.deadline.$gte = new Date(filters.deadlineStart);
        }
        if (filters.deadlineEnd) {
          query.deadline.$lte = new Date(filters.deadlineEnd);
        }
      }

      // Priority order mapping
      const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };

      const tasks = await Task.find(query)
        .sort({
          status: 1, // pending first
          deadline: 1  // earliest deadline first
        })
        .lean();

      console.log('🎯 TaskService - Found tasks in database:', tasks.length);
      console.log('🎯 TaskService - Tasks:', tasks.map(t => ({ 
        id: t._id, 
        title: t.title, 
        assignedTo: t.assignedTo,
        assignedBy: t.assignedBy,
        status: t.status 
      })));

      // Sort by priority and deadline combination
      const sortedTasks = tasks.sort((a, b) => {
        // First by status (pending/in-progress before completed)
        if (a.status !== b.status) {
          if (a.status === 'overdue') return -1;
          if (b.status === 'overdue') return 1;
          if (a.status === 'completed') return 1;
          if (b.status === 'completed') return -1;
        }

        // Then by priority
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Finally by deadline
        return new Date(a.deadline) - new Date(b.deadline);
      });

      return {
        success: true,
        tasks: sortedTasks,
        totalCount: tasks.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        tasks: []
      };
    }
  }

  /**
   * Schedule automatic reminders for a task
   */
  async scheduleTaskReminders(task) {
    try {
      const deadline = new Date(task.deadline);
      const now = new Date();
      const reminders = [];

      // Calculate reminder times based on priority and deadline
      const timeUntilDeadline = deadline.getTime() - now.getTime();
      const daysUntilDeadline = Math.ceil(timeUntilDeadline / (1000 * 60 * 60 * 24));

      console.log(`📅 Scheduling reminders for task: ${task.title}, deadline in ${daysUntilDeadline} days`);

      // Schedule reminders based on how far away the deadline is
      if (daysUntilDeadline > 7) {
        // For tasks due in more than a week: remind 3 days and 1 day before
        const threeDaysBefore = new Date(deadline.getTime() - (3 * 24 * 60 * 60 * 1000));
        const oneDayBefore = new Date(deadline.getTime() - (1 * 24 * 60 * 60 * 1000));
        
        if (threeDaysBefore > now) {
          reminders.push({
            type: 'email',
            scheduledFor: threeDaysBefore,
            sent: false
          });
        }
        
        if (oneDayBefore > now) {
          reminders.push({
            type: 'email',
            scheduledFor: oneDayBefore,
            sent: false
          });
        }
      } else if (daysUntilDeadline > 3) {
        // For tasks due in 3-7 days: remind 1 day before
        const oneDayBefore = new Date(deadline.getTime() - (1 * 24 * 60 * 60 * 1000));
        
        if (oneDayBefore > now) {
          reminders.push({
            type: 'email',
            scheduledFor: oneDayBefore,
            sent: false
          });
        }
      } else if (daysUntilDeadline > 1) {
        // For tasks due in 1-3 days: remind on the morning of the deadline
        const morningOfDeadline = new Date(deadline);
        morningOfDeadline.setHours(9, 0, 0, 0); // 9 AM on deadline day
        
        if (morningOfDeadline > now && morningOfDeadline < deadline) {
          reminders.push({
            type: 'email',
            scheduledFor: morningOfDeadline,
            sent: false
          });
        }
      }

      // For urgent tasks, add additional reminders
      if (task.priority === 'urgent') {
        const sixHoursBefore = new Date(deadline.getTime() - (6 * 60 * 60 * 1000));
        if (sixHoursBefore > now) {
          reminders.push({
            type: 'email',
            scheduledFor: sixHoursBefore,
            sent: false
          });
        }
      }

      // Add in-app reminders for all reminders
      reminders.forEach(reminder => {
        reminders.push({
          type: 'in-app',
          scheduledFor: reminder.scheduledFor,
          sent: false
        });
      });

      // Update task with reminders
      if (reminders.length > 0) {
        await Task.findByIdAndUpdate(task._id, {
          $set: { reminders: reminders }
        });
        
        console.log(`✅ Scheduled ${reminders.length} reminders for task: ${task.title}`);
      }

    } catch (error) {
      console.error('❌ Error scheduling task reminders:', error);
      // Don't fail task creation if reminder scheduling fails
    }
  }

  /**
   * Send task creation notification
   */
  async sendTaskCreationNotification(task, userId) {
    try {
      // Get user email for notification
      let userEmail = process.env.DEFAULT_USER_EMAIL;
      
      if (userId && userId !== 'Not specified') {
        // Try to find user by userId
        const user = await User.findOne({ userId });
        if (user && user.email) {
          userEmail = user.email;
        }
      }

      console.log(`📧 Sending task creation notification to: ${userEmail} for task: ${task.title}`);
      
      // Send the notification
      await notificationService.sendTaskCreationNotification(task, userEmail);
      
    } catch (error) {
      console.error('❌ Error sending task creation notification:', error);
      // Don't fail task creation if notification fails
    }
  }
}

module.exports = new TaskExtractionService();