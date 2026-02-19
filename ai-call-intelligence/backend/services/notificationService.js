/**
 * Notification Ser    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use app password for Gmail
      },
      // Add connection timeout and retry settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,    // 5 seconds
      socketTimeout: 10000      // 10 seconds
    });* 
 * Handles email notifications, in-app alerts, and deadline reminders for tasks
 */

const nodemailer = require('nodemailer');
const { Task, User } = require('../models');

class NotificationService {
  constructor() {
    this.emailTransporter = this.setupEmailTransporter();
    this.inAppNotifications = new Map(); // Store in-app notifications
    this.emailEnabled = process.env.EMAIL_NOTIFICATIONS !== 'false'; // Default to enabled
    this._warnedDbNotConnected = false;

    console.log(`📧 Email Notifications: ${this.emailEnabled ? 'ENABLED' : 'DISABLED'}`);
    if (!this.emailEnabled) {
      console.log('💡 To enable emails, set EMAIL_NOTIFICATIONS=true in .env file');
    }
  }

  /**
   * Setup email transporter (using Gmail as example)
   */
  setupEmailTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ Email credentials not configured. Email notifications will be disabled.');
      return null;
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          user: process.env.EMAIL_USER,
          pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, '') // Remove spaces from app password
        },
        // Enhanced timeout and connection settings for better reliability
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 10000,   // 10 seconds
        socketTimeout: 15000,     // 15 seconds
        secure: false,            // Let nodemailer handle SSL/TLS
        requireTLS: true,         // Force TLS
        // Add pool settings for better connection management
        pool: true,
        maxConnections: 5,
        maxMessages: 100
      });

      // Test the connection on startup (but don't block)
      setImmediate(async () => {
        try {
          await transporter.verify();
          console.log('✅ Email SMTP connection verified successfully');
        } catch (error) {
          console.warn('⚠️ Email SMTP connection failed:', error.message);
          console.warn('📧 Email notifications will be attempted but may fail');

          if (error.code === 'EAUTH') {
            console.warn('🔐 Authentication issue - check Gmail app password');
          } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
            console.warn('🌐 Network/firewall issue - emails may not send');
          }
        }
      });

      return transporter;
    } catch (error) {
      console.error('❌ Failed to setup email transporter:', error.message);
      return null;
    }
  }

  /**
   * Send email with retry logic and timeout handling
   */
  async sendEmailWithRetry(mailOptions, maxRetries = 2) {
    if (!this.emailEnabled) {
      console.log('📧 Email notifications disabled - skipping');
      return false;
    }

    if (!this.emailTransporter) {
      console.warn('📧 Email transporter not configured - skipping email notification');
      this.logNotificationFallback(mailOptions);
      return false;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📧 Sending email (attempt ${attempt}/${maxRetries}) to: ${mailOptions.to}`);

        // Set a timeout for the email send operation
        const emailPromise = this.emailTransporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Email send timeout')), 10000);
        });

        const result = await Promise.race([emailPromise, timeoutPromise]);
        console.log('✅ Email sent successfully:', result.messageId);
        return true;

      } catch (error) {
        console.warn(`❌ Email send attempt ${attempt} failed:`, error.message);

        // Special handling for common errors
        if (error.code === 'EAUTH') {
          console.error('🔐 Authentication failed - check Gmail credentials');
          break; // Don't retry auth failures
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
          console.warn('⏱️ Email timeout - network/firewall issue');
        } else if (error.code === 'ENOTFOUND') {
          console.warn('🌐 DNS resolution failed - check internet connection');
        }

        if (attempt === maxRetries) {
          console.error('📧 All email send attempts failed - logging as fallback');
          this.logNotificationFallback(mailOptions);
          return false;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  /**
   * Log email as fallback when SMTP fails
   */
  logNotificationFallback(mailOptions) {
    console.log('📋 EMAIL NOTIFICATION (SMTP Failed - Logged Instead):');
    console.log(`📧 To: ${mailOptions.to}`);
    console.log(`📄 Subject: ${mailOptions.subject}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    console.log('💬 Content: [Email content prepared but not sent due to SMTP issues]');
    console.log('🔧 To fix: Check network connectivity, firewall settings, or Gmail app password');
    console.log('────────────────────────────────────────────────────');
  }

  /**
   * Process pending reminders for all tasks
   */
  async processPendingReminders() {
    try {
      console.log('🔔 Processing pending task reminders...');

      // If the DB isn't connected (e.g. DB_REQUIRED=false dev mode), skip quietly.
      const readyState = Task?.db?.readyState;
      if (readyState !== 1) {
        if (!this._warnedDbNotConnected) {
          console.warn('⚠️ Skipping reminders: database not connected');
          this._warnedDbNotConnected = true;
        }
        return { success: false, skipped: true, reason: 'db-not-connected' };
      }

      const now = new Date();

      // Find tasks with pending reminders
      const tasksWithReminders = await Task.find({
        status: { $in: ['pending', 'in-progress'] },
        'reminders.sent': false,
        'reminders.scheduledFor': { $lte: now }
      });

      let processedCount = 0;

      for (const task of tasksWithReminders) {
        for (let i = 0; i < task.reminders.length; i++) {
          const reminder = task.reminders[i];

          if (!reminder.sent && new Date(reminder.scheduledFor) <= now) {
            await this.sendReminder(task, reminder, i);
            processedCount++;
          }
        }
      }

      console.log(`✅ Processed ${processedCount} pending reminders`);

      return {
        success: true,
        processedCount
      };

    } catch (error) {
      console.error('❌ Error processing reminders:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send individual reminder
   */
  async sendReminder(task, reminder, reminderIndex) {
    try {
      // Get user information
      const user = await User.findOne({ userId: task.assignedTo });

      if (!user && task.assignedTo !== 'Unassigned') {
        console.warn(`⚠️ User not found for task ${task.taskId}: ${task.assignedTo}`);
        return;
      }

      const reminderData = {
        task,
        user,
        reminder,
        timeUntilDeadline: this.getTimeUntilDeadline(task.deadline)
      };

      switch (reminder.type) {
        case 'email':
          if (user?.email) {
            await this.sendEmailReminder(reminderData);
          }
          break;
        case 'in-app':
          await this.sendInAppReminder(reminderData);
          break;
        case 'sms':
          // SMS implementation would go here
          console.log('📱 SMS notifications not implemented yet');
          break;
      }

      // Mark reminder as sent
      await Task.updateOne(
        { _id: task._id },
        {
          $set: {
            [`reminders.${reminderIndex}.sent`]: true,
            [`reminders.${reminderIndex}.sentAt`]: new Date()
          }
        }
      );

      console.log(`✅ Sent ${reminder.type} reminder for task: ${task.title}`);

    } catch (error) {
      console.error(`❌ Error sending reminder for task ${task.taskId}:`, error);
    }
  }

  /**
   * Send email reminder
   */
  async sendEmailReminder({ task, user, timeUntilDeadline }) {
    if (!this.emailTransporter) {
      console.warn('⚠️ Email transporter not configured');
      return;
    }

    const isOverdue = timeUntilDeadline.isOverdue;
    const subject = isOverdue
      ? `🚨 OVERDUE: ${task.title}`
      : `⏰ Reminder: ${task.title} - Due ${timeUntilDeadline.formatted}`;

    const htmlContent = this.generateEmailTemplate(task, user, timeUntilDeadline);

    const mailOptions = {
      from: {
        name: 'AI Call Intelligence',
        address: process.env.EMAIL_USER
      },
      to: user.email,
      subject: subject,
      html: htmlContent
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  /**
   * Generate email template
   */
  generateEmailTemplate(task, user, timeUntilDeadline) {
    const priorityColors = {
      'urgent': '#dc2626',
      'high': '#ea580c',
      'medium': '#d97706',
      'low': '#65a30d'
    };

    const priorityColor = priorityColors[task.priority] || '#6b7280';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px 20px; border-radius: 0 0 10px 10px; }
        .task-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; }
        .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .deadline-info { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .deadline-info.due-soon { background: #fef3c7; border-color: #d97706; }
        .deadline-info.on-time { background: #d1fae5; border-color: #10b981; }
        .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Task Reminder</h1>
            <p>Stay on top of your commitments</p>
        </div>
        
        <div class="content">
            <p>Hi ${user.firstName},</p>
            
            ${timeUntilDeadline.isOverdue
        ? `<p><strong>This task is now overdue!</strong> Please review and update the status as soon as possible.</p>`
        : `<p>This is a friendly reminder about an upcoming task deadline.</p>`
      }
            
            <div class="task-card">
                <h2>${task.title}</h2>
                <p><strong>Description:</strong> ${task.description}</p>
                
                <div style="margin: 15px 0;">
                    <span class="priority-badge" style="background-color: ${priorityColor};">
                        ${task.priority} Priority
                    </span>
                </div>
                
                <div class="deadline-info ${timeUntilDeadline.isOverdue ? '' : timeUntilDeadline.daysUntil <= 1 ? 'due-soon' : 'on-time'}">
                    <strong>⏰ Deadline:</strong> ${new Date(task.deadline).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
                    <br>
                    <strong>Status:</strong> ${timeUntilDeadline.formatted}
                </div>
                
                ${task.estimatedDuration ? `<p><strong>Estimated Duration:</strong> ${task.estimatedDuration} minutes</p>` : ''}
                
                ${task.tags.length > 0 ? `
                <p><strong>Tags:</strong> ${task.tags.map(tag => `<span style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${tag}</span>`).join(' ')}</p>
                ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks" class="btn">
                    📋 View All Tasks
                </a>
            </div>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3>💡 Quick Actions</h3>
                <ul>
                    <li>Mark task as completed when finished</li>
                    <li>Update the deadline if needed</li>
                    <li>Add notes about your progress</li>
                    <li>Delegate to someone else if necessary</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated reminder from AI Call Intelligence</p>
            <p>To manage your notification preferences, <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings">click here</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Send in-app notification
   */
  async sendInAppReminder({ task, user, timeUntilDeadline }) {
    const notification = {
      id: `reminder_${task.taskId}_${Date.now()}`,
      type: 'task-reminder',
      title: timeUntilDeadline.isOverdue ? '🚨 Task Overdue' : '⏰ Task Due Soon',
      message: timeUntilDeadline.isOverdue
        ? `"${task.title}" is now overdue!`
        : `"${task.title}" is due ${timeUntilDeadline.formatted}`,
      taskId: task.taskId,
      priority: task.priority,
      createdAt: new Date(),
      read: false
    };

    // Store in memory (in production, use Redis or database)
    const userId = task.assignedTo;
    if (!this.inAppNotifications.has(userId)) {
      this.inAppNotifications.set(userId, []);
    }

    this.inAppNotifications.get(userId).push(notification);

    // Keep only last 50 notifications per user
    const userNotifications = this.inAppNotifications.get(userId);
    if (userNotifications.length > 50) {
      this.inAppNotifications.set(userId, userNotifications.slice(-50));
    }
  }

  /**
   * Get in-app notifications for user
   */
  getInAppNotifications(userId) {
    return this.inAppNotifications.get(userId) || [];
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(userId, notificationId) {
    const userNotifications = this.inAppNotifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    }
  }

  /**
   * Clear all notifications for user
   */
  clearNotifications(userId) {
    this.inAppNotifications.set(userId, []);
  }

  /**
   * Calculate time until deadline
   */
  getTimeUntilDeadline(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        isOverdue: true,
        daysUntil: diffDays,
        formatted: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`
      };
    }

    if (diffDays === 0) {
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      return {
        isOverdue: false,
        daysUntil: 0,
        formatted: diffHours <= 0 ? 'Due now' : `Due in ${diffHours} hour${diffHours === 1 ? '' : 's'}`
      };
    }

    return {
      isOverdue: false,
      daysUntil: diffDays,
      formatted: diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days`
    };
  }

  /**
   * Send upload completion notification
   */
  async sendUploadCompletionNotification(callId, fileName, userEmail = null) {
    if (!this.emailTransporter) {
      console.warn('⚠️ Email transporter not configured');
      return;
    }

    try {
      // Use provided email or default email
      const email = userEmail || process.env.DEFAULT_USER_EMAIL || 'user@example.com';

      const mailOptions = {
        from: {
          name: 'AI Call Intelligence',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: `🎯 Audio Upload Successful - ${fileName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Successful</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px 20px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .success-badge { background: #d1fae5; color: #065f46; padding: 12px 16px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .info-box { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .btn { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .processing-steps { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .step { margin: 8px 0; }
        .step-icon { display: inline-block; width: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Upload Successful!</h1>
            <p>Your audio file is being processed</p>
        </div>
        
        <div class="content">
            <div class="success-badge">
                <strong>✅ Upload Complete</strong>
            </div>
            
            <p>Great news! Your audio file has been successfully uploaded and is now being processed by our AI system.</p>
            
            <div class="info-box">
                <h3>📁 File Details</h3>
                <p><strong>File Name:</strong> ${fileName}</p>
                <p><strong>Call ID:</strong> ${callId}</p>
                <p><strong>Upload Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="processing-steps">
                <h3>🔄 Processing Pipeline</h3>
                <div class="step">
                    <span class="step-icon">✅</span> File Upload Complete
                </div>
                <div class="step">
                    <span class="step-icon">🔄</span> Transcription in Progress
                </div>
                <div class="step">
                    <span class="step-icon">⏳</span> AI Analysis Pending
                </div>
                <div class="step">
                    <span class="step-icon">⏳</span> Task Extraction Pending
                </div>
                <div class="step">
                    <span class="step-icon">⏳</span> Final Report Generation Pending
                </div>
            </div>
            
            <p>You'll receive another notification when the transcription is complete and ready for review.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/results/${callId}" class="btn">
                    📊 View Processing Status
                </a>
            </div>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4>💡 What Happens Next?</h4>
                <ul>
                    <li>Our AI will transcribe your audio with high accuracy</li>
                    <li>Advanced analysis will extract insights and sentiment</li>
                    <li>Tasks and action items will be automatically identified</li>
                    <li>You'll receive a complete report when processing is finished</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for using AI Call Intelligence</p>
            <p>Processing time typically ranges from 1-5 minutes depending on file size</p>
        </div>
    </div>
</body>
</html>
        `
      };

      const emailSent = await this.sendEmailWithRetry(mailOptions);
      if (emailSent) {
        console.log(`✅ Upload completion notification sent for call ${callId}`);
      } else {
        console.log(`⚠️ Failed to send upload completion notification for call ${callId} after retries`);
      }

    } catch (error) {
      console.error('❌ Error sending upload notification:', error);
    }
  }

  /**
   * Send transcription ready notification
   */
  async sendTranscriptionReadyNotification(callId, fileName, transcription, userEmail = null) {
    if (!this.emailTransporter) {
      console.warn('⚠️ Email transporter not configured');
      return;
    }

    try {
      // Use provided email or default email
      const email = userEmail || process.env.DEFAULT_USER_EMAIL || 'user@example.com';

      // Truncate transcription for email (first 500 characters)
      const transcriptionPreview = transcription.text.length > 500
        ? transcription.text.substring(0, 500) + '...'
        : transcription.text;

      const mailOptions = {
        from: {
          name: 'AI Call Intelligence',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: `📝 Transcription Ready - ${fileName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcription Ready</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px 20px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .ready-badge { background: #dbeafe; color: #1e40af; padding: 12px 16px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .transcription-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .stat-item { background: #f1f5f9; padding: 15px; border-radius: 6px; text-align: center; }
        .btn { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
        .btn-secondary { background: #6b7280; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 Transcription Ready!</h1>
            <p>Your audio has been successfully transcribed</p>
        </div>
        
        <div class="content">
            <div class="ready-badge">
                <strong>✅ Transcription Complete</strong>
            </div>
            
            <p>Excellent! Your audio file has been successfully transcribed and is ready for review. AI analysis is currently in progress.</p>
            
            <div class="stats-grid">
                <div class="stat-item">
                    <h4>📊 Confidence Score</h4>
                    <strong>${Math.round((transcription.confidence || 0.95) * 100)}%</strong>
                </div>
                <div class="stat-item">
                    <h4>⏱️ Duration</h4>
                    <strong>${transcription.duration ? Math.round(transcription.duration) : 'N/A'}s</strong>
                </div>
            </div>
            
            <div class="transcription-box">
                <h3>📄 Transcription Preview</h3>
                <p style="font-style: italic; color: #4b5563; line-height: 1.8;">
                    "${transcriptionPreview}"
                </p>
                ${transcription.text.length > 500 ? '<p style="color: #6b7280; font-size: 14px;"><em>View full transcription in the app</em></p>' : ''}
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4>🔄 Still Processing:</h4>
                <ul style="margin: 10px 0;">
                    <li>📊 AI Analysis & Sentiment Detection</li>
                    <li>🏷️ Category Classification</li>
                    <li>📋 Task & Action Item Extraction</li>
                    <li>📈 Final Insights Report</li>
                </ul>
                <p style="margin: 10px 0; font-size: 14px; color: #92400e;">
                    <strong>You'll receive a final notification when all processing is complete.</strong>
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/results/${callId}" class="btn">
                    📋 View Full Transcription
                </a>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="btn btn-secondary">
                    📊 Go to Dashboard
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>AI Call Intelligence - Transforming conversations into actionable insights</p>
        </div>
    </div>
</body>
</html>
        `
      };

      const emailSent = await this.sendEmailWithRetry(mailOptions);
      if (emailSent) {
        console.log(`✅ Transcription ready notification sent for call ${callId}`);
      } else {
        console.log(`⚠️ Failed to send transcription ready notification for call ${callId} after retries`);
      }

    } catch (error) {
      console.error('❌ Error sending transcription notification:', error);
    }
  }

  /**
   * Send final processing completion notification
   */
  async sendFinalProcessingNotification(callId, userEmail = null) {
    if (!this.emailTransporter) {
      console.warn('⚠️ Email transporter not configured');
      return;
    }

    try {
      // Use provided email or default email
      const email = userEmail || process.env.DEFAULT_USER_EMAIL || 'user@example.com';

      const mailOptions = {
        from: {
          name: 'AI Call Intelligence',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: `🎉 Complete Analysis Ready - Call ${callId}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analysis Complete</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px 20px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .complete-badge { background: #dcfce7; color: #166534; padding: 12px 16px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .feature-item { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center; }
        .btn { display: inline-block; padding: 15px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 5px; font-size: 16px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Analysis Complete!</h1>
            <p>Your complete call analysis is ready</p>
        </div>
        
        <div class="content">
            <div class="complete-badge">
                <strong>✨ Full Processing Complete</strong>
            </div>
            
            <p>Fantastic! Your call has been fully processed and analyzed. All insights, tasks, and recommendations are now available for review.</p>
            
            <div class="feature-grid">
                <div class="feature-item">
                    <h4>📝 Transcription</h4>
                    <p>Complete & Accurate</p>
                </div>
                <div class="feature-item">
                    <h4>🧠 AI Analysis</h4>
                    <p>Insights & Summary</p>
                </div>
                <div class="feature-item">
                    <h4>📊 Sentiment Analysis</h4>
                    <p>Emotional Insights</p>
                </div>
                <div class="feature-item">
                    <h4>📋 Task Extraction</h4>
                    <p>Action Items Identified</p>
                </div>
            </div>
            
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 6px;">
                <h3>🔍 What's Available Now:</h3>
                <ul style="margin: 15px 0; padding-left: 20px;">
                    <li><strong>Full Transcription</strong> - Complete text with timestamps</li>
                    <li><strong>Executive Summary</strong> - Key highlights and decisions</li>
                    <li><strong>Action Items</strong> - Extracted tasks with deadlines</li>
                    <li><strong>Sentiment Analysis</strong> - Emotional tone throughout the call</li>
                    <li><strong>Category Classification</strong> - Automatic call categorization</li>
                    <li><strong>Key Insights</strong> - Important topics and themes</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/results/${callId}" class="btn">
                    🎯 View Complete Analysis
                </a>
            </div>
            
            <div style="background: #ecfdf5; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h4 style="color: #065f46; margin-top: 0;">💡 Pro Tips:</h4>
                <ul style="color: #047857; margin: 10px 0;">
                    <li>Review extracted tasks and set up deadline reminders</li>
                    <li>Share insights with team members who attended the call</li>
                    <li>Export reports for documentation and follow-up</li>
                    <li>Use the search function to quickly find specific topics</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>AI Call Intelligence</strong> - Transform every conversation into actionable insights</p>
            <p>Processing completed in record time with industry-leading accuracy</p>
        </div>
    </div>
</body>
</html>
        `
      };

      const emailSent = await this.sendEmailWithRetry(mailOptions);
      if (emailSent) {
        console.log(`✅ Final processing notification sent for call ${callId}`);
      } else {
        console.log(`⚠️ Failed to send final processing notification for call ${callId} after retries`);
      }

    } catch (error) {
      console.error('❌ Error sending final processing notification:', error);
    }
  }

  /**
   * Send task completion notification
   */
  async sendTaskCompletionNotification(task, completedBy) {
    try {
      // Notify the person who assigned the task
      if (task.assignedBy && task.assignedBy !== completedBy) {
        const assignerUser = await User.findOne({ userId: task.assignedBy });

        if (assignerUser?.email && this.emailTransporter) {
          const mailOptions = {
            from: {
              name: 'AI Call Intelligence',
              address: process.env.EMAIL_USER
            },
            to: assignerUser.email,
            subject: `✅ Task Completed: ${task.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>✅ Task Completed!</h2>
                <p>Great news! The following task has been completed:</p>
                <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                  <h3>${task.title}</h3>
                  <p><strong>Completed by:</strong> ${completedBy}</p>
                  <p><strong>Completed at:</strong> ${new Date().toLocaleString()}</p>
                  ${task.completionDetails?.notes ? `<p><strong>Notes:</strong> ${task.completionDetails.notes}</p>` : ''}
                </div>
                <p>Points earned: +${task.points.earned + task.points.bonusEarned}</p>
              </div>
            `
          };

          await this.emailTransporter.sendMail(mailOptions);
        }
      }

    } catch (error) {
      console.error('❌ Error sending completion notification:', error);
    }
  }

  /**
   * Send task creation notification
   */
  async sendTaskCreationNotification(task, assigneeEmail = null) {
    if (!this.emailTransporter) {
      console.warn('⚠️ Email transporter not configured');
      return;
    }

    try {
      // Use provided email or default email
      const email = assigneeEmail || process.env.DEFAULT_USER_EMAIL;

      const priorityColors = {
        'urgent': '#dc2626',
        'high': '#ea580c',
        'medium': '#d97706',
        'low': '#65a30d'
      };

      const priorityColor = priorityColors[task.priority] || '#6b7280';

      // Calculate time until deadline
      const timeUntilDeadline = this.getTimeUntilDeadline(task.deadline);

      const mailOptions = {
        from: {
          name: 'AI Call Intelligence - Task Manager',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: `📋 New Task Assigned: ${task.title}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Task Assigned</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px 20px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .task-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${priorityColor}; margin: 20px 0; }
        .priority-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; color: white; font-size: 12px; font-weight: bold; text-transform: uppercase; background-color: ${priorityColor}; }
        .deadline-info { background: ${timeUntilDeadline.isOverdue ? '#fee2e2' : timeUntilDeadline.daysUntil <= 1 ? '#fef3c7' : '#d1fae5'}; border-left: 4px solid ${timeUntilDeadline.isOverdue ? '#dc2626' : timeUntilDeadline.daysUntil <= 1 ? '#d97706' : '#10b981'}; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .source-info { background: #e0f2fe; border: 1px solid #b3e5fc; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 New Task Assigned!</h1>
            <p>You have been assigned a new task from AI Call Intelligence</p>
        </div>
        
        <div class="content">
            <p>A new task has been automatically created and assigned to you based on conversation analysis.</p>
            
            <div class="task-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <h2 style="margin: 0; color: #1f2937;">${task.title}</h2>
                    <span class="priority-badge">${task.priority} Priority</span>
                </div>
                
                <p><strong>Description:</strong> ${task.description}</p>
                
                <div class="deadline-info">
                    <strong>⏰ Deadline:</strong> ${new Date(task.deadline).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
                    <br>
                    <strong>Status:</strong> ${timeUntilDeadline.formatted}
                </div>
                
                ${task.estimatedDuration ? `<p><strong>⏱️ Estimated Duration:</strong> ${task.estimatedDuration} minutes</p>` : ''}
                
                ${task.tags && task.tags.length > 0 ? `
                <p><strong>🏷️ Tags:</strong> ${task.tags.map(tag => `<span style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${tag}</span>`).join('')}</p>
                ` : ''}
                
                <p><strong>📋 Task ID:</strong> ${task.taskId}</p>
            </div>
            
            ${task.sourceCall && task.sourceCall.callId ? `
            <div class="source-info">
                <h4 style="margin-top: 0; color: #0f766e;">📞 Source Information</h4>
                <p>This task was automatically extracted from a conversation analysis.</p>
                <p><strong>Call ID:</strong> ${task.sourceCall.callId}</p>
                <p><strong>Extraction Method:</strong> ${task.sourceCall.extractedFrom || 'AI Analysis'}</p>
                ${task.metadata && task.metadata.originalText ? `<p><strong>Original Context:</strong> "${task.metadata.originalText.substring(0, 200)}${task.metadata.originalText.length > 200 ? '...' : ''}"</p>` : ''}
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks" class="btn">
                    📋 View All Tasks
                </a>
            </div>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="color: #374151; margin-top: 0;">💡 Next Steps:</h4>
                <ul style="color: #4b5563; margin: 10px 0;">
                    <li>Review the task details and requirements</li>
                    <li>Add any additional notes or clarifications needed</li>
                    <li>Update the status when you begin working</li>
                    <li>Mark as completed when finished</li>
                    <li>Set up reminders if needed for important deadlines</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>AI Call Intelligence</strong> - Automatically extracting actionable insights from conversations</p>
            <p>This task was created on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
        `
      };

      const emailSent = await this.sendEmailWithRetry(mailOptions);
      if (emailSent) {
        console.log(`✅ Task creation notification sent for task: ${task.title}`);
      } else {
        console.log(`⚠️ Failed to send task creation notification for task: ${task.title}`);
      }

    } catch (error) {
      console.error('❌ Error sending task creation notification:', error);
    }
  }

  /**
   * Schedule reminder check (called periodically)
   */
  startReminderScheduler() {
    // Process reminders every 5 minutes
    setInterval(() => {
      this.processPendingReminders().catch(console.error);
    }, 5 * 60 * 1000);

    console.log('🔔 Reminder scheduler started (checking every 5 minutes)');
  }
}

module.exports = new NotificationService();