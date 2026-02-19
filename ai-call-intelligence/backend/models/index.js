/**
 * MongoDB Models and Schemas
 * 
 * This module defines all Mongoose models for the AI Call Intelligence application.
 * Includes models for calls, transcriptions, analyses, and classifications.
 */

const mongoose = require('mongoose');

// Call Schema - Main document that references all other data
const callSchema = new mongoose.Schema({
  // Basic call information
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  mimeType: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // Duration in seconds
    min: 0
  },
  
  // File storage information
  filePath: {
    type: String,
    required: true
  },
  fileUrl: String,
  
  // Processing status
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'completed', 'failed'],
    default: 'uploaded'
  },
  processingStage: {
    type: String,
    enum: ['none', 'transcribing', 'analyzing', 'classifying', 'complete'],
    default: 'none'
  },
  
  // References to other documents
  transcription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transcription'
  },
  analysis: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis'
  },
  classification: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classification'
  },
  
  // Error handling
  errors: [{
    stage: String,
    message: String,
    timestamp: Date,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // User information
  userEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  userName: {
    type: String,
    trim: true
  },
  userId: {
    type: String,
    trim: true
  },
  
  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    sessionId: String,
    tags: [String],
    notes: String
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  suppressReservedKeysWarning: true
});

// Transcription Schema
const transcriptionSchema = new mongoose.Schema({
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call',
    required: true
  },
  
  // Raw transcription data
  text: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  language: {
    type: String,
    default: 'en-US'
  },
  
  // Speaker information
  speakers: [{
    name: String,
    segments: [{
      text: String,
      start: Number, // Start time in seconds
      end: Number,   // End time in seconds
      confidence: Number,
      words: [{
        word: String,
        start: Number,
        end: Number,
        confidence: Number
      }]
    }]
  }],
  
  // Processing details
  processingTime: Number, // Time taken in seconds
  model: String, // AI model used (e.g., "whisper-1")
  provider: String, // Service provider (e.g., "groq", "openai")
  
  // Quality metrics
  qualityMetrics: {
    averageConfidence: Number,
    wordCount: Number,
    silenceDuration: Number,
    noiseLevel: String
  }
}, {
  timestamps: true
});

// Analysis Schema
const analysisSchema = new mongoose.Schema({
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call',
    required: true
  },
  transcriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transcription',
    required: true
  },
  
  // Summary and key points
  summary: [String],
  executiveSummary: String,
  
  // Decisions and action items
  keyDecisions: [{
    decision: String,
    reasoning: String,
    participants: [String],
    confidence: {
      type: String,
      enum: ['Low', 'Medium', 'High']
    },
    impact: {
      type: String,
      enum: ['Low', 'Medium', 'High']
    },
    timestamp: Number // When in conversation this decision was made
  }],
  
  keyPoints: [{
    point: String,
    importance: {
      type: String,
      enum: ['Low', 'Medium', 'High']
    },
    category: String,
    timestamp: Number
  }],
  
  actionItems: [{
    task: String,
    assignedTo: String,
    deadline: String,
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical']
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Blocked'],
      default: 'Pending'
    },
    estimatedEffort: String,
    dependencies: [String]
  }],
  
  // Conversation insights
  insights: {
    sentiment: {
      overall: String,
      score: Number,
      analysis: String,
      confidence: Number
    },
    
    talkRatio: mongoose.Schema.Types.Mixed,
    
    conversationDynamics: {
      interruptions: Number,
      questionsAsked: Number,
      avgEngagement: String,
      keyTopics: Number,
      agreementLevel: String,
      decisionSpeed: String,
      collaborationScore: Number
    },
    
    participantEngagement: mongoose.Schema.Types.Mixed,
    
    recurringThemes: [String],
    
    keyMoments: [{
      moment: String,
      timestamp: Number,
      importance: String,
      type: String // 'decision', 'insight', 'agreement', 'conflict'
    }],
    
    risks: [String],
    nextSteps: [String],
    
    timeline: {
      mentionedDates: [String],
      deadlines: [String],
      milestones: [String]
    },
    
    keyMetrics: {
      totalSpeakers: Number,
      topicsDiscussed: Number,
      decisionsReached: Number,
      actionItemsCreated: Number,
      engagementLevel: Number
    }
  },
  
  // Processing details
  processingTime: Number,
  model: String,
  provider: String,
  analysisVersion: String
}, {
  timestamps: true
});

// Classification Schema
const classificationSchema = new mongoose.Schema({
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call',
    required: true
  },
  transcriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transcription',
    required: true
  },
  
  // Primary classification
  category: {
    type: String,
    enum: ['Work', 'Family', 'Personal', 'Education', 'Healthcare', 'Financial', 'Technical', 'Legal', 'General'],
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  confidenceLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true
  },
  
  // Detailed scoring for all categories
  allScores: [{
    category: String,
    score: Number,
    keywordMatches: Number,
    patternMatches: Number,
    rawScore: Number
  }],
  
  // Multi-category detection
  multiCategory: {
    isMultiCategory: Boolean,
    categories: [String],
    scoreDifference: Number
  },
  
  // Context analysis
  context: {
    formality: {
      type: String,
      enum: ['Formal', 'Informal', 'Mixed']
    },
    urgency: {
      type: String,
      enum: ['Low', 'Normal', 'High']
    },
    sentiment: {
      type: String,
      enum: ['Positive', 'Negative', 'Neutral']
    },
    participants: [String]
  },
  
  // Processing details
  processingTime: Number,
  model: String,
  classifierVersion: String,
  
  // Quality metrics
  qualityMetrics: {
    textLength: Number,
    keywordDensity: Number,
    patternMatches: Number,
    confidenceDistribution: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for better query performance
callSchema.index({ status: 1, createdAt: -1 });
callSchema.index({ filename: 1 });
callSchema.index({ 'metadata.tags': 1 });

transcriptionSchema.index({ callId: 1 });
transcriptionSchema.index({ confidence: -1 });
transcriptionSchema.index({ provider: 1, model: 1 });

analysisSchema.index({ callId: 1 });
analysisSchema.index({ 'insights.sentiment.overall': 1 });
analysisSchema.index({ 'keyDecisions.confidence': 1 });

classificationSchema.index({ callId: 1 });
classificationSchema.index({ category: 1, confidence: -1 });
classificationSchema.index({ 'context.formality': 1, 'context.urgency': 1 });

// Virtual populate for call relationships
callSchema.virtual('fullTranscription', {
  ref: 'Transcription',
  localField: '_id',
  foreignField: 'callId',
  justOne: true
});

callSchema.virtual('fullAnalysis', {
  ref: 'Analysis',
  localField: '_id',
  foreignField: 'callId',
  justOne: true
});

callSchema.virtual('fullClassification', {
  ref: 'Classification',
  localField: '_id',
  foreignField: 'callId',
  justOne: true
});

// Pre-save middleware to update processing stage
callSchema.pre('save', function(next) {
  if (this.transcription && this.analysis && this.classification) {
    this.processingStage = 'complete';
    this.status = 'completed';
  } else if (this.analysis) {
    this.processingStage = 'classifying';
  } else if (this.transcription) {
    this.processingStage = 'analyzing';
  } else if (this.status === 'processing') {
    this.processingStage = 'transcribing';
  }
  next();
});

// Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  userId: {
    type: String,
    required: true,
    default: 'test-user', // For development, will be updated when auth is implemented
    index: true
  },
  
  userName: {
    type: String,
    default: 'Test User'
  },
  
  title: {
    type: String,
    default: 'Speaking Coach Conversation'
  },
  
  context: {
    speakingContext: String,
    audience: String,
    duration: String,
    experience: String,
    concerns: [String],
    specificTopics: [String]
  },
  
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  
  messageCount: {
    type: Number,
    default: 0
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  userId: {
    type: String,
    required: true,
    default: 'test-user'
  },
  
  type: {
    type: String,
    enum: ['user', 'bot', 'system'],
    required: true
  },
  
  content: {
    type: String,
    required: true
  },
  
  suggestions: [String],
  
  quickActions: [{
    text: String,
    action: String
  }],
  
  metadata: {
    intent: String,
    context: String,
    confidence: Number,
    processingTime: Number,
    model: String,
    provider: String
  },
  
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// User Schema for Authentication
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    index: true,
    default: function() {
      return this._id.toString();
    }
  },
  
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  
  fullName: {
    type: String,
    trim: true
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerificationToken: String,
  
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  lastLoginAt: Date,
  lastLoginIP: String,
  
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  
  metadata: {
    signupSource: String,
    referredBy: String,
    ipAddress: String,
    userAgent: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ sessionId: 1, status: 1 });
chatMessageSchema.index({ sessionId: 1, timestamp: 1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });

// Pre-save middleware for user
userSchema.pre('save', function(next) {
  // Update fullName
  this.fullName = `${this.firstName} ${this.lastName}`;
  
  // Update timestamp
  this.updatedAt = new Date();
  
  // Generate userId if not exists
  if (!this.userId) {
    this.userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  next();
});

// Pre-save middleware for chat session
chatSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create models
const Call = mongoose.model('Call', callSchema);
const Transcription = mongoose.model('Transcription', transcriptionSchema);
const Analysis = mongoose.model('Analysis', analysisSchema);
const Classification = mongoose.model('Classification', classificationSchema);
const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const User = mongoose.model('User', userSchema);

// Task Management Schema
const taskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    unique: true,
    default: function() {
      return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  assignedTo: {
    type: String,
    required: true,
    index: true
  },
  assignedBy: {
    type: String,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled', 'overdue'],
    default: 'pending',
    index: true
  },
  deadline: {
    type: Date,
    required: true,
    index: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 60
  },
  actualDuration: {
    type: Number, // in minutes, filled when completed
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  sourceCall: {
    callId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Call'
    },
    extractedFrom: {
      type: String,
      enum: ['transcription', 'analysis', 'manual'],
      default: 'analysis'
    }
  },
  points: {
    earned: {
      type: Number,
      default: 0
    },
    penalty: {
      type: Number,
      default: 0
    },
    bonusEarned: {
      type: Number,
      default: 0
    }
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'in-app', 'sms'],
      default: 'in-app'
    },
    scheduledFor: {
      type: Date,
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }],
  completionDetails: {
    completedAt: Date,
    completedBy: String,
    notes: String,
    attachments: [String]
  },
  dependencies: [{
    taskId: String,
    type: {
      type: String,
      enum: ['blocks', 'depends-on'],
      default: 'depends-on'
    }
  }],
  metadata: {
    createdBy: String,
    lastModifiedBy: String,
    createdFromAI: {
      type: Boolean,
      default: false
    },
    confidence: Number, // AI extraction confidence
    originalText: String // Original text from which task was extracted
  }
}, {
  timestamps: true
});

// Indexes for performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ deadline: 1, status: 1 });
taskSchema.index({ priority: 1, deadline: 1 });
taskSchema.index({ 'sourceCall.callId': 1 });
taskSchema.index({ createdAt: -1 });

// Virtual for points calculation
taskSchema.virtual('totalPoints').get(function() {
  return this.points.earned + this.points.bonusEarned - this.points.penalty;
});

// Pre-save middleware for point calculation
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed') {
    const now = new Date();
    const deadline = new Date(this.deadline);
    
    // Base points for completion
    let basePoints = 10;
    
    // Priority multiplier
    const priorityMultipliers = {
      'low': 1,
      'medium': 1.5,
      'high': 2,
      'urgent': 3
    };
    
    basePoints *= (priorityMultipliers[this.priority] || 1);
    
    // Early completion bonus
    if (now < deadline) {
      const daysEarly = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      this.points.bonusEarned = Math.min(daysEarly * 2, basePoints * 0.5);
    }
    
    this.points.earned = basePoints;
    this.completionDetails.completedAt = now;
  }
  
  // Late penalty calculation
  if (this.status !== 'completed' && this.status !== 'cancelled') {
    const now = new Date();
    const deadline = new Date(this.deadline);
    
    if (now > deadline) {
      this.status = 'overdue';
      const daysLate = Math.ceil((now - deadline) / (1000 * 60 * 60 * 24));
      this.points.penalty = Math.min(daysLate * 3, 50); // Max 50 point penalty
    }
  }
  
  next();
});

// Static method to get user task statistics
taskSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { assignedTo: userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPoints: { $sum: { $add: ['$points.earned', '$points.bonusEarned'] } },
        totalPenalty: { $sum: '$points.penalty' }
      }
    }
  ]);
  
  const overdueTasks = await this.countDocuments({
    assignedTo: userId,
    status: 'overdue'
  });
  
  const upcomingDeadlines = await this.countDocuments({
    assignedTo: userId,
    status: { $in: ['pending', 'in-progress'] },
    deadline: { $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } // Next 3 days
  });
  
  return {
    stats,
    overdueTasks,
    upcomingDeadlines
  };
};

const Task = mongoose.model('Task', taskSchema);

module.exports = {
  Call,
  Transcription,
  Analysis,
  Classification,
  ChatSession,
  ChatMessage,
  User,
  Task,
  
  // Export schemas for reference
  schemas: {
    callSchema,
    transcriptionSchema,
    analysisSchema,
    classificationSchema,
    chatSessionSchema,
    chatMessageSchema,
    userSchema,
    taskSchema
  }
};