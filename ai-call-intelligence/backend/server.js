const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();

// Import services
const transcriptionService = require('./services/transcription');
const analysisService = require('./services/analysis');
const conversationClassifier = require('./services/conversationClassifier');
const databaseService = require('./services/databaseService');
const notificationService = require('./services/notificationService');
const taskExtractionService = require('./services/taskExtraction');
const databaseConfig = require('./config/database');

// Import authentication
const authController = require('./controllers/authController');
const { optionalAuth, authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_REQUIRED = !['false', '0', 'no'].includes((process.env.DB_REQUIRED || '').toLowerCase());

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Chunked upload storage
const chunkStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use a temporary chunks directory, we'll organize by uploadId later
    const tempChunkDir = path.join('uploads', 'chunks', 'temp');

    // Create directory if it doesn't exist
    if (!fs.existsSync(tempChunkDir)) {
      fs.mkdirSync(tempChunkDir, { recursive: true });
    }

    cb(null, tempChunkDir);
  },
  filename: function (req, file, cb) {
    // Use timestamp to ensure unique filename, we'll rename it later
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `temp-chunk-${uniqueSuffix}`);
  }
});

// File filter for audio files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/wave', 'audio/ogg', 'audio/m4a'];
  const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files (MP3, WAV, OGG, M4A) are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

const chunkUpload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB per chunk
  }
});

// In-memory store for chunked uploads (in production, use Redis)
const chunkedUploads = new Map();

// Initialize database connection
async function initializeDatabase() {
  try {
    await databaseConfig.connect();
    await databaseConfig.initialize();
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (DB_REQUIRED) {
      process.exit(1);
    }
    console.warn('⚠️ DB_REQUIRED=false so the server will continue without a database connection.');
  }
}

// Routes

// Middleware to check database connection status for API routes
app.use('/api', (req, res, next) => {
  // Allow health check to pass through even if DB is down
  if (req.path === '/health') {
    return next();
  }

  // If DB is not connected, return 503 Service Unavailable
  // We check this regardless of DB_REQUIRED to prevent crashing
  if (!databaseConfig.isConnected) {
    return res.status(503).json({
      status: 'error',
      message: 'Service Unavailable: Database connection is lost',
      retryAfter: 30
    });
  }
  next();
});

// Authentication Routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/profile', authenticateToken, authController.getProfile);
app.put('/api/auth/profile', authenticateToken, authController.updateProfile);

// Health check (enhanced with database status)
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await databaseConfig.healthCheck();
    const dbServiceHealth = await databaseService.healthCheck();

    res.json({
      status: 'OK',
      message: 'AI Call Intelligence API is running',
      database: {
        connection: dbHealth,
        operations: dbServiceHealth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Service partially unavailable',
      error: error.message
    });
  }
});

// Upload and process audio file (with MongoDB integration) - Async Processing
app.post('/api/upload', optionalAuth, upload.single('audio'), async (req, res) => {
  let call = null;

  try {
    console.log('📤 Upload endpoint hit');
    console.log('📋 Request file:', req.file ? 'Present' : 'Missing');
    console.log('🔐 User auth:', req.user ? 'Authenticated' : 'Anonymous');

    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const filePath = req.file.path;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    console.log(`🎵 Processing audio file: ${originalName}`);

    // Extract user information from authenticated user or fallback to request body/headers
    const userEmail = req.user?.email || req.body.userEmail || req.headers['user-email'] || process.env.DEFAULT_USER_EMAIL;
    const userName = req.user?.fullName || req.body.userName || req.headers['user-name'] || 'User';
    const userId = req.user?.userId || null;

    console.log('👤 User info - Email:', userEmail, 'Name:', userName, 'ID:', userId);

    // Step 1: Create call record in database
    console.log('💾 Creating call record in database...');
    call = await databaseService.createCall({
      filename,
      originalName,
      fileSize,
      mimeType,
      filePath,
      userAgent: req.headers['user-agent'],
      // Add user information to call record
      userEmail,
      userName,
      userId,
      ipAddress: req.ip
    });

    console.log(`📝 Created call record: ${call._id}`);

    // Step 2: Update status to processing
    await databaseService.updateCallStatus(call._id, 'processing', 'none');

    // Return immediately with call ID for status polling
    res.json({
      success: true,
      callId: call._id,
      status: 'processing',
      message: 'File uploaded successfully. Processing started.',
      metadata: {
        filename: originalName,
        fileSize: fileSize,
        uploadedAt: new Date().toISOString()
      }
    });

    // Step 3: Send upload completion notification to user's email
    setImmediate(() => {
      notificationService.sendUploadCompletionNotification(
        call._id,
        originalName,
        userEmail
      );
    });

    // Step 4: Start asynchronous processing
    setImmediate(() => {
      processAudioAsync(call._id, filePath);
    });

  } catch (error) {
    console.error('❌ Error uploading audio:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });

    // Update call status to failed if call was created
    if (call) {
      try {
        await databaseService.updateCallStatus(
          call._id,
          'failed',
          'none',
          { message: error.message, details: error.stack }
        );
      } catch (dbError) {
        console.error('❌ Error updating call status:', dbError);
      }
    }

    res.status(500).json({
      error: 'Failed to process audio file',
      details: error.message
    });
  }
});

// Mobile-specific upload endpoint - accepts extra call metadata (callStart, callEnd, phoneNumber, deviceId, callType)
app.post('/api/mobile/upload', optionalAuth, upload.single('audio'), async (req, res) => {
  let call = null;

  try {
    console.log('\ud83d\udce4 Mobile upload endpoint hit');

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const filePath = req.file.path;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    // Extract metadata from body or headers
    const userEmail = req.user?.email || req.body.userEmail || req.headers['user-email'] || process.env.DEFAULT_USER_EMAIL;
    const userName = req.user?.fullName || req.body.userName || req.headers['user-name'] || 'User';
    const userId = req.user?.userId || null;

    const callStart = req.body.callStart || req.headers['x-call-start'] || null;
    const callEnd = req.body.callEnd || req.headers['x-call-end'] || null;
    const phoneNumber = req.body.phoneNumber || req.headers['x-phone-number'] || null;
    const deviceId = req.body.deviceId || req.headers['x-device-id'] || null;
    const callType = req.body.callType || req.headers['x-call-type'] || null; // e.g., inbound/outbound

    // Create call record in database with mobile metadata
    call = await databaseService.createCall({
      filename,
      originalName,
      fileSize,
      mimeType,
      filePath,
      userAgent: req.headers['user-agent'],
      userEmail,
      userName,
      userId,
      ipAddress: req.ip,
      mobile: true,
      callStart,
      callEnd,
      phoneNumber,
      deviceId,
      callType
    });

    await databaseService.updateCallStatus(call._id, 'processing', 'none');

    // Respond immediately with call id
    res.json({
      success: true,
      callId: call._id,
      status: 'processing',
      message: 'Mobile file uploaded successfully. Processing started.'
    });

    // Kick off async processing
    setImmediate(() => {
      notificationService.sendUploadCompletionNotification(
        call._id,
        originalName,
        userEmail
      );
    });

    setImmediate(() => {
      processAudioAsync(call._id, filePath);
    });

  } catch (error) {
    console.error('\u274c Error in mobile upload:', error);
    if (call) {
      try { await databaseService.updateCallStatus(call._id, 'failed', 'none', { message: error.message }); } catch (e) { console.error(e); }
    }

    res.status(500).json({ error: 'Failed to process mobile upload', details: error.message });
  }
});

// Asynchronous processing function
async function processAudioAsync(callId, filePath) {
  try {
    console.log(`🔄 Starting async processing for call: ${callId}`);

    // Step 0: Get call record to access user information (no user filtering for internal processing)
    const callRecord = await databaseService.getCallById(callId, true, null);
    const userEmail = callRecord?.userEmail || process.env.DEFAULT_USER_EMAIL;
    const originalFileName = callRecord?.originalName || 'Audio File';

    // Step 1: Update status to transcribing
    await databaseService.updateCallStatus(callId, 'processing', 'transcribing');

    // Step 2: Transcribe audio using Groq Whisper
    console.log('🎤 Starting transcription...');
    const transcriptionResult = await transcriptionService.transcribeAudio(filePath);

    // Save transcription to database
    const transcription = await databaseService.createTranscription({
      callId: callId,
      text: transcriptionResult.text,
      confidence: transcriptionResult.confidence,
      duration: transcriptionResult.duration,
      language: transcriptionResult.language || 'en-US',
      speakers: transcriptionResult.speakers || [],
      processingTime: transcriptionResult.processingTime || 0,
      model: transcriptionResult.model || 'whisper-large-v3',
      provider: 'groq',
      qualityMetrics: {
        wordCount: transcriptionResult.text ? transcriptionResult.text.split(' ').length : 0,
        averageConfidence: transcriptionResult.confidence || 0
      }
    });

    // Update call with actual duration from transcription
    if (transcriptionResult.duration) {
      await databaseService.updateCall(callId, { duration: transcriptionResult.duration });
    }

    console.log('✅ Transcription completed and saved');

    // Step 3.5: Send transcription ready notification to user's email
    setImmediate(() => {
      notificationService.sendTranscriptionReadyNotification(
        callId,
        originalFileName,
        transcription,
        userEmail
      );
    });

    // Step 4: Update status to analyzing
    await databaseService.updateCallStatus(callId, 'processing', 'analyzing');

    // Step 5: Analyze conversation using Groq Llama + SBERT Classification
    console.log('🧠 Starting analysis and classification...');
    const analysisResult = await analysisService.analyzeConversation(transcriptionResult.text);

    // Save analysis to database
    const analysis = await databaseService.createAnalysis({
      callId: callId,
      transcriptionId: transcription._id,
      summary: analysisResult.summary,
      executiveSummary: analysisResult.summary?.[0] || '',
      keyDecisions: analysisResult.keyDecisions || [],
      keyPoints: analysisResult.keyPoints || [],
      actionItems: analysisResult.actionItems || [],
      insights: analysisResult.insights || {},
      processingTime: analysisResult.processingTime || 0,
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
      analysisVersion: '1.0'
    });

    console.log('✅ Analysis completed and saved');

    // Step 6: Update status to classifying
    await databaseService.updateCallStatus(callId, 'processing', 'classifying');

    // Step 7: Save classification to database
    if (analysisResult.classification) {
      const classification = await databaseService.createClassification({
        callId: callId,
        transcriptionId: transcription._id,
        category: analysisResult.classification.category,
        confidence: analysisResult.classification.confidence,
        confidenceLevel: analysisResult.classification.confidenceLevel,
        allScores: Object.entries(analysisResult.classification.allScores || {}).map(([cat, data]) => ({
          category: cat,
          score: data.score || 0,
          keywordMatches: data.keywordMatches || 0,
          patternMatches: data.patternMatches || 0,
          rawScore: data.rawScore || 0
        })),
        multiCategory: analysisResult.classification.multiCategory || { isMultiCategory: false },
        context: analysisResult.classification.context || {},
        processingTime: analysisResult.classification.processingTime || 0,
        model: 'sbert-classifier',
        classifierVersion: '1.0',
        qualityMetrics: {
          textLength: transcriptionResult.text ? transcriptionResult.text.length : 0,
          keywordDensity: 0, // Could be calculated
          patternMatches: 0,
          confidenceDistribution: {}
        }
      });

      console.log('✅ Classification completed and saved');
    }

    // Step 7.5: Extract and create tasks from the conversation
    console.log('📝 Starting task extraction...');
    console.log('📝 Call record userId:', callRecord.userId);
    console.log('📝 Call record userEmail:', callRecord.userEmail);
    try {
      // Use userEmail as userId if userId is not available
      const taskUserId = callRecord.userId || callRecord.userEmail || 'test-user';
      console.log('📝 Using userId for task creation:', taskUserId);

      const extractedTasks = await taskExtractionService.extractTasksFromCall(
        callId,
        transcriptionResult.text,
        analysisResult,
        taskUserId
      );

      if (extractedTasks && extractedTasks.length > 0) {
        console.log(`✅ Task extraction completed: ${extractedTasks.length} tasks created`);
      } else {
        console.log('ℹ️ No tasks were extracted from this conversation');
      }
    } catch (taskError) {
      console.error('⚠️ Task extraction failed (non-critical):', taskError.message);
      // Continue processing even if task extraction fails
    }

    // Step 8: Update call status to completed
    await databaseService.updateCallStatus(callId, 'completed', 'complete');

    // Step 9: Send final completion notification to user's email
    setImmediate(() => {
      notificationService.sendFinalProcessingNotification(callId, userEmail);
    });

    console.log(`✅ Processing completed for call: ${callId}`);

  } catch (error) {
    console.error('❌ Error in async processing:', error);

    // Update call status to failed
    try {
      await databaseService.updateCallStatus(
        callId,
        'failed',
        'none',
        { message: error.message, details: error.stack }
      );
    } catch (dbError) {
      console.error('❌ Error updating call status:', dbError);
    }
  }
}

// Chunked upload endpoints
// Initialize chunked upload
app.post('/api/upload/init', optionalAuth, async (req, res) => {
  try {
    const { fileId, fileName, fileSize, totalChunks, mimeType } = req.body;
    const uploadId = `${fileId}-${Date.now()}`;

    // Store upload metadata
    chunkedUploads.set(uploadId, {
      fileId,
      fileName,
      fileSize,
      totalChunks,
      mimeType,
      uploadedChunks: new Set(),
      createdAt: new Date()
    });

    console.log(`🚀 Initialized chunked upload: ${uploadId} (${totalChunks} chunks)`);

    res.json({
      success: true,
      uploadId,
      message: 'Chunked upload initialized'
    });

  } catch (error) {
    console.error('❌ Failed to initialize chunked upload:', error);
    res.status(500).json({
      error: 'Failed to initialize chunked upload',
      details: error.message
    });
  }
});

// Upload chunk
app.post('/api/upload/chunk', optionalAuth, chunkUpload.single('chunk'), async (req, res) => {
  try {
    console.log('📦 Chunk upload request - Body:', req.body);
    console.log('📦 Chunk upload request - File:', req.file ? 'Present' : 'Missing');

    const { uploadId, chunkIndex } = req.body;

    if (!uploadId) {
      return res.status(400).json({
        error: 'Upload ID is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No chunk file uploaded'
      });
    }

    if (!chunkedUploads.has(uploadId)) {
      return res.status(404).json({
        error: 'Upload session not found'
      });
    }

    // Move file from temp directory to proper uploadId directory
    const uploadMeta = chunkedUploads.get(uploadId);
    const targetDir = path.join('uploads', 'chunks', uploadId);

    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Debug logging
    console.log('📦 Source file path:', req.file.path);
    console.log('📦 Source file exists:', fs.existsSync(req.file.path));

    // Move file to target directory with proper name
    const targetPath = path.join(targetDir, `chunk-${chunkIndex}`);
    console.log('📦 Target file path:', targetPath);

    fs.renameSync(req.file.path, targetPath);

    uploadMeta.uploadedChunks.add(parseInt(chunkIndex));

    console.log(`📦 Uploaded chunk ${chunkIndex}/${uploadMeta.totalChunks} for ${uploadId}`);

    res.json({
      success: true,
      chunkIndex: parseInt(chunkIndex),
      uploaded: uploadMeta.uploadedChunks.size,
      total: uploadMeta.totalChunks
    });

  } catch (error) {
    console.error('❌ Chunk upload failed:', error);
    res.status(500).json({
      error: 'Chunk upload failed',
      details: error.message
    });
  }
});

// Finalize chunked upload
app.post('/api/upload/finalize', optionalAuth, async (req, res) => {
  try {
    const { uploadId, fileId } = req.body;

    if (!chunkedUploads.has(uploadId)) {
      return res.status(404).json({
        error: 'Upload session not found'
      });
    }

    const uploadMeta = chunkedUploads.get(uploadId);

    // Verify all chunks are uploaded
    if (uploadMeta.uploadedChunks.size !== uploadMeta.totalChunks) {
      return res.status(400).json({
        error: 'Not all chunks uploaded',
        uploaded: uploadMeta.uploadedChunks.size,
        expected: uploadMeta.totalChunks
      });
    }

    console.log(`🔧 Finalizing chunked upload: ${uploadId}`);

    // Combine chunks into final file
    const finalFilePath = await combineChunks(uploadId, uploadMeta);

    // Extract user information for chunked upload
    const userEmail = req.user?.email || req.body.userEmail || req.headers['user-email'] || process.env.DEFAULT_USER_EMAIL;
    const userName = req.user?.fullName || req.body.userName || req.headers['user-name'] || 'User';
    const userId = req.user?.userId || null;

    // Create call record
    const call = await databaseService.createCall({
      filename: path.basename(finalFilePath),
      originalName: uploadMeta.fileName,
      fileSize: uploadMeta.fileSize,
      mimeType: uploadMeta.mimeType,
      filePath: finalFilePath,
      userAgent: req.headers['user-agent'],
      // Add user information
      userEmail,
      userName,
      userId,
      ipAddress: req.ip
    });

    // Send upload completion notification to user's email
    setImmediate(() => {
      notificationService.sendUploadCompletionNotification(
        call._id,
        uploadMeta.fileName,
        userEmail
      );
    });

    // Start async processing
    await databaseService.updateCallStatus(call._id, 'processing', 'none');
    setImmediate(() => {
      processAudioAsync(call._id, finalFilePath);
    });

    // Cleanup
    chunkedUploads.delete(uploadId);
    cleanupChunks(uploadId);

    console.log(`✅ Chunked upload completed: ${call._id}`);

    res.json({
      success: true,
      callId: call._id,
      status: 'processing',
      message: 'File uploaded successfully. Processing started.',
      metadata: {
        filename: uploadMeta.fileName,
        fileSize: uploadMeta.fileSize,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Failed to finalize upload:', error);
    res.status(500).json({
      error: 'Failed to finalize upload',
      details: error.message
    });
  }
});

// Cancel chunked upload
app.post('/api/upload/cancel', async (req, res) => {
  try {
    const { uploadId } = req.body;

    if (chunkedUploads.has(uploadId)) {
      chunkedUploads.delete(uploadId);
      cleanupChunks(uploadId);
      console.log(`🗑️ Cancelled chunked upload: ${uploadId}`);
    }

    res.json({
      success: true,
      message: 'Upload cancelled'
    });

  } catch (error) {
    console.error('❌ Failed to cancel upload:', error);
    res.status(500).json({
      error: 'Failed to cancel upload',
      details: error.message
    });
  }
});

// Helper function to combine chunks
async function combineChunks(uploadId, uploadMeta) {
  const chunkDir = path.join('uploads', 'chunks', uploadId);
  const finalFileName = `${uploadId}-${uploadMeta.fileName}`;
  const finalFilePath = path.join('uploads', finalFileName);

  console.log(`🔗 Combining ${uploadMeta.totalChunks} chunks for ${uploadId}`);

  const writeStream = fs.createWriteStream(finalFilePath);

  return new Promise((resolve, reject) => {
    let currentChunk = 0;

    const writeNextChunk = () => {
      if (currentChunk >= uploadMeta.totalChunks) {
        writeStream.end();
        return;
      }

      const chunkPath = path.join(chunkDir, `chunk-${currentChunk}`);

      if (fs.existsSync(chunkPath)) {
        const readStream = fs.createReadStream(chunkPath);
        readStream.pipe(writeStream, { end: false });

        readStream.on('end', () => {
          currentChunk++;
          writeNextChunk();
        });

        readStream.on('error', reject);
      } else {
        reject(new Error(`Missing chunk: ${currentChunk}`));
      }
    };

    writeStream.on('finish', () => {
      resolve(finalFilePath);
    });

    writeStream.on('error', reject);

    writeNextChunk();
  });
}

// Helper function to cleanup chunks
function cleanupChunks(uploadId) {
  const chunkDir = path.join('uploads', 'chunks', uploadId);

  if (fs.existsSync(chunkDir)) {
    fs.rmSync(chunkDir, { recursive: true, force: true });
    console.log(`🧹 Cleaned up chunks for ${uploadId}`);
  }
}

// Cleanup old incomplete uploads (run periodically)
setInterval(() => {
  const now = new Date();
  for (const [uploadId, meta] of chunkedUploads.entries()) {
    const age = now - meta.createdAt;
    if (age > 30 * 60 * 1000) { // 30 minutes
      chunkedUploads.delete(uploadId);
      cleanupChunks(uploadId);
      console.log(`🕐 Cleaned up expired upload: ${uploadId}`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Status polling endpoint for async processing
app.get('/api/upload/status/:callId', optionalAuth, async (req, res) => {
  try {
    const { callId } = req.params;

    // Validate ObjectId format
    if (!callId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid call ID format' });
    }

    const call = await databaseService.getCallById(callId, true, req.user?.userId);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Return current status
    res.json({
      success: true,
      callId: call._id,
      status: call.status,
      processingStage: call.processingStage,
      progress: getProcessingProgress(call.status, call.processingStage),
      data: call.status === 'completed' ? {
        transcription: call.transcription ? {
          text: call.transcription.text,
          confidence: call.transcription.confidence,
          duration: call.transcription.duration
        } : null,
        analysis: call.analysis ? {
          summary: call.analysis.summary,
          keyDecisions: call.analysis.keyDecisions,
          keyPoints: call.analysis.keyPoints,
          actionItems: call.analysis.actionItems
        } : null,
        classification: call.classification ? {
          category: call.classification.category,
          confidence: call.classification.confidence
        } : null
      } : null,
      errors: call.errors || []
    });

  } catch (error) {
    console.error('❌ Error fetching status:', error);
    res.status(500).json({
      error: 'Failed to fetch processing status',
      details: error.message
    });
  }
});

// Helper function to calculate processing progress
function getProcessingProgress(status, processingStage) {
  if (status === 'completed') return 100;
  if (status === 'failed') return 0;

  switch (processingStage) {
    case 'none': return 10;
    case 'transcribing': return 30;
    case 'analyzing': return 70;
    case 'classifying': return 90;
    case 'complete': return 100;
    default: return 5;
  }
}

// Get all past calls (with MongoDB integration and pagination)
app.get('/api/calls', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      category,
      sortBy,
      sortOrder,
      search,
      userId: req.user?.userId // Filter by logged-in user
    };

    const result = await databaseService.getCalls(options);

    // Transform calls for frontend
    const callsList = result.calls.map(call => ({
      id: call._id,
      filename: call.filename || call.originalName,
      originalName: call.originalName,
      uploadedAt: call.createdAt,
      status: call.status,
      processingStage: call.processingStage,
      category: call.classification?.category || 'Unknown',
      confidence: call.classification?.confidence || 0,
      fileSize: call.fileSize,
      // Use actual duration from transcription, fallback to call duration
      duration: call.transcription?.duration || call.duration || 0,
      // Include sentiment from analysis
      sentiment: call.analysis?.insights?.sentiment?.overall || null
    }));

    res.json({
      calls: callsList,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('❌ Error fetching calls:', error);
    res.status(500).json({
      error: 'Failed to fetch calls',
      details: error.message
    });
  }
});

// Get specific call details (with MongoDB integration)
app.get('/api/calls/:callId', optionalAuth, async (req, res) => {
  try {
    const { callId } = req.params;

    // Validate ObjectId format
    if (!callId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid call ID format' });
    }

    const call = await databaseService.getCallById(callId, true, req.user?.userId);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Transform data for frontend compatibility
    const transformedCall = {
      id: call._id,
      filename: call.originalName,
      uploadedAt: call.createdAt,
      status: call.status,
      processingStage: call.processingStage,
      fileSize: call.fileSize,
      transcription: call.transcription ? {
        text: call.transcription.text,
        confidence: call.transcription.confidence,
        duration: call.transcription.duration,
        speakers: call.transcription.speakers,
        language: call.transcription.language
      } : null,
      analysis: call.analysis ? {
        summary: call.analysis.summary,
        keyDecisions: call.analysis.keyDecisions,
        keyPoints: call.analysis.keyPoints,
        actionItems: call.analysis.actionItems,
        insights: call.analysis.insights,
        classification: call.classification ? {
          category: call.classification.category,
          confidence: call.classification.confidence,
          confidenceLevel: call.classification.confidenceLevel,
          allScores: call.classification.allScores?.reduce((acc, item) => {
            acc[item.category] = {
              score: item.score,
              keywordMatches: item.keywordMatches,
              patternMatches: item.patternMatches,
              rawScore: item.rawScore
            };
            return acc;
          }, {}) || {},
          multiCategory: call.classification.multiCategory,
          context: call.classification.context,
          processingTime: call.classification.processingTime
        } : null
      } : null,
      errors: call.errors || []
    };

    res.json({ call: transformedCall });

  } catch (error) {
    console.error('❌ Error fetching call:', error);
    res.status(500).json({
      error: 'Failed to fetch call details',
      details: error.message
    });
  }
});

// Delete a call (with MongoDB integration)
app.delete('/api/calls/:callId', optionalAuth, async (req, res) => {
  try {
    const { callId } = req.params;

    // Validate ObjectId format
    if (!callId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid call ID format' });
    }

    await databaseService.deleteCall(callId, req.user?.userId);
    res.json({ message: 'Call deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting call:', error);

    // Handle 404 errors specifically
    if (error.status === 404 || error.message.includes('Call not found')) {
      return res.status(404).json({
        error: 'Call not found or access denied'
      });
    }

    res.status(500).json({
      error: 'Failed to delete call',
      details: error.message
    });
  }
});

// Serve audio files for playback
app.get('/api/audio/:callId', optionalAuth, async (req, res) => {
  try {
    const { callId } = req.params;

    // Validate ObjectId format
    if (!callId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid call ID format' });
    }

    // Get call record to find file path
    const call = await databaseService.getCallById(callId, false, req.user?.userId);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const filePath = call.filePath;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found on server' });
    }

    // Get file stats for content length
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Set appropriate content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'audio/mpeg'; // default

    if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.ogg') contentType = 'audio/ogg';
    else if (ext === '.m4a') contentType = 'audio/mp4';

    if (range) {
      // Handle range requests for audio streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
        return;
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });

      file.pipe(res);
    } else {
      // Send entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });

      fs.createReadStream(filePath).pipe(res);
    }

  } catch (error) {
    console.error('❌ Error serving audio file:', error);
    res.status(500).json({
      error: 'Failed to serve audio file',
      details: error.message
    });
  }
});

// Standalone Summarization API endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    const { text, options = {} } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Text is required for summarization',
        details: 'Please provide a non-empty text string in the request body'
      });
    }

    console.log(`📝 Summarization request received (${text.length} characters)`);

    // Import summarization service
    const summarizationService = require('./services/summarization');
    const result = await summarizationService.summarizeConversation(text, options);

    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in summarization:', error);
    res.status(500).json({
      error: 'Summarization failed',
      details: error.message
    });
  }
});

// Quick summary endpoint for shorter texts
app.post('/api/summarize/quick', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Text is required for quick summarization'
      });
    }

    console.log(`⚡ Quick summarization request received`);

    const summarizationService = require('./services/summarization');
    const result = await summarizationService.generateQuickSummary(text);

    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in quick summarization:', error);
    res.status(500).json({
      error: 'Quick summarization failed',
      details: error.message
    });
  }
});

// Action items extraction endpoint
app.post('/api/extract-actions', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Text is required for action item extraction'
      });
    }

    console.log(`🎯 Action item extraction request received`);

    const summarizationService = require('./services/summarization');
    const result = await summarizationService.extractActionItems(text);

    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in action item extraction:', error);
    res.status(500).json({
      error: 'Action item extraction failed',
      details: error.message
    });
  }
});

// Dashboard statistics endpoint
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = await databaseService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      details: error.message
    });
  }
});

// Search calls content endpoint
app.post('/api/calls/search', optionalAuth, async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await databaseService.searchCallsContent(query, { page, limit, userId: req.user?.userId });

    res.json({
      success: true,
      results: results,
      query: query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error searching calls:', error);
    res.status(500).json({
      error: 'Search failed',
      details: error.message
    });
  }
});

// Database management endpoints
app.get('/api/admin/database/stats', async (req, res) => {
  try {
    const stats = await databaseConfig.getStats();
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch database stats',
      details: error.message
    });
  }
});

app.post('/api/admin/database/cleanup', async (req, res) => {
  try {
    const { olderThanDays = 30, removeFailedCalls = true, dryRun = false } = req.body;

    const result = await databaseService.cleanup({
      olderThanDays,
      removeFailedCalls,
      dryRun
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Database cleanup failed',
      details: error.message
    });
  }
});

// Summarization service health check
app.get('/api/summarize/health', async (req, res) => {
  try {
    const summarizationService = require('./services/summarization');
    const healthStatus = await summarizationService.healthCheck();

    res.json({
      service: 'Groq Summarization Service',
      ...healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      service: 'Groq Summarization Service',
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Authentication routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Task management routes
const taskRoutes = require('./routes/tasks');
app.use('/api', taskRoutes);

// Chatbot routes
const chatbotRoutes = require('./routes/chatbot');
app.use('/api', chatbotRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Create necessary directories
function createDirectories() {
  const directories = ['uploads', 'uploads/chunks', 'uploads/chunks/temp'];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

// Start server with database initialization
async function startServer() {
  try {
    // Create necessary directories
    createDirectories();

    // Initialize database first
    await initializeDatabase();

    // Start task reminder scheduler (best-effort; DB might be intentionally unavailable in dev)
    try {
      console.log('🔔 Starting task reminder scheduler...');
      notificationService.startReminderScheduler();
    } catch (e) {
      console.warn('⚠️ Task reminder scheduler failed to start:', e.message);
    }

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 AI Call Intelligence API server is running on port ${PORT}`);
      console.log(`📁 Uploads directory: ${path.resolve('uploads')}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 Dashboard stats: http://localhost:${PORT}/api/dashboard/stats`);
      console.log(`🔍 MongoDB URI: ${databaseConfig.getMaskedUri()}`);
      console.log(`📧 Task notifications and reminders are active`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();