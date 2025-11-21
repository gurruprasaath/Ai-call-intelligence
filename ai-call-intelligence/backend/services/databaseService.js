/**
 * Database Service Layer
 * 
 * This service provides CRUD operations and business logic for all database entities.
 * Handles calls, transcriptions, analyses, and classifications with proper validation.
 */

const { Call, Transcription, Analysis, Classification } = require('../models');
const mongoose = require('mongoose');

class DatabaseService {
  
  // =====================================================
  // CALL OPERATIONS
  // =====================================================
  
  /**
   * Create a new call record
   */
  async createCall(callData) {
    try {
      const call = new Call({
        filename: callData.filename,
        originalName: callData.originalName || callData.filename,
        fileSize: callData.fileSize,
        mimeType: callData.mimeType,
        duration: callData.duration,
        filePath: callData.filePath,
        fileUrl: callData.fileUrl,
        status: 'uploaded',
        processingStage: 'none',
        // Add user information
        userId: callData.userId,
        userEmail: callData.userEmail,
        userName: callData.userName,
        metadata: {
          userAgent: callData.userAgent,
          ipAddress: callData.ipAddress,
          sessionId: callData.sessionId,
          tags: callData.tags || [],
          notes: callData.notes
        }
      });

      const savedCall = await call.save();
      console.log(`✅ Created call record: ${savedCall._id}`);
      return savedCall;

    } catch (error) {
      console.error('❌ Error creating call:', error.message);
      throw new Error(`Failed to create call: ${error.message}`);
    }
  }

  /**
   * Get call by ID with optional population
   */
  async getCallById(callId, populate = true, userId = null) {
    try {
      // Build filter - include userId if provided for user-specific filtering
      const filter = { _id: callId };
      if (userId) {
        filter.userId = userId;
      }

      let query = Call.findOne(filter);
      
      if (populate) {
        query = query
          .populate('transcription')
          .populate('analysis')
          .populate('classification');
      }

      const call = await query.exec();
      
      if (!call) {
        throw new Error(`Call not found: ${callId}`);
      }

      return call;

    } catch (error) {
      console.error(`❌ Error fetching call ${callId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all calls with pagination and filtering
   */
  async getCalls(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        category,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        userId
      } = options;

      const skip = (page - 1) * limit;
      const filter = {};

      // Apply user filter first (most important)
      if (userId) filter.userId = userId;

      // Apply filters
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { filename: { $regex: search, $options: 'i' } },
          { originalName: { $regex: search, $options: 'i' } },
          { 'metadata.notes': { $regex: search, $options: 'i' } }
        ];
      }

      // Build query with transcription and analysis data for duration and sentiment
      let query = Call.find(filter)
        .populate('classification', 'category confidence')
        .populate('transcription', 'duration confidence language')
        .populate('analysis', 'insights.sentiment')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      // Apply category filter if provided (requires population)
      if (category) {
        query = query.populate({
          path: 'classification',
          match: { category: category }
        });
      }

      const calls = await query.exec();
      
      // Filter out calls without matching classification if category filter was applied
      const filteredCalls = category ? 
        calls.filter(call => call.classification) : 
        calls;

      const total = await Call.countDocuments(filter);

      return {
        calls: filteredCalls,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

    } catch (error) {
      console.error('❌ Error fetching calls:', error.message);
      throw error;
    }
  }

  /**
   * Update call status and processing stage
   */
  async updateCallStatus(callId, status, processingStage, errors = null) {
    try {
      const update = { status };
      if (processingStage) update.processingStage = processingStage;
      if (errors) {
        update.$push = { 
          errors: {
            stage: processingStage || status,
            message: errors.message || errors,
            timestamp: new Date(),
            details: errors.details || null
          }
        };
      }

      const call = await Call.findByIdAndUpdate(
        callId,
        update,
        { new: true, runValidators: true }
      );

      if (!call) {
        throw new Error(`Call not found: ${callId}`);
      }

      console.log(`✅ Updated call ${callId} status: ${status}`);
      return call;

    } catch (error) {
      console.error(`❌ Error updating call status:`, error.message);
      throw error;
    }
  }

  /**
   * Update call with additional data (like duration)
   */
  async updateCall(callId, updateData) {
    try {
      const call = await Call.findByIdAndUpdate(
        callId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!call) {
        throw new Error(`Call not found: ${callId}`);
      }

      console.log(`✅ Updated call ${callId} with data:`, Object.keys(updateData));
      return call;

    } catch (error) {
      console.error(`❌ Error updating call:`, error.message);
      throw error;
    }
  }

  /**
   * Delete call and all related data
   */
  async deleteCall(callId, userId = null) {
    try {
      // First check if call exists and belongs to user (if userId provided)
      const filter = { _id: callId };
      if (userId) {
        filter.userId = userId;
      }
      
      const callToDelete = await Call.findOne(filter);
      if (!callToDelete) {
        // Throw error with specific status for proper HTTP response
        const error = new Error(`Call not found or access denied: ${callId}`);
        error.status = 404;
        throw error;
      }

      // Delete related documents sequentially (without transactions for standalone MongoDB)
      console.log(`🗑️ Deleting related data for call ${callId}...`);
      
      const deletionResults = await Promise.all([
        Transcription.deleteMany({ callId }),
        Analysis.deleteMany({ callId }),
        Classification.deleteMany({ callId })
      ]);
      
      console.log(`🗑️ Deleted ${deletionResults[0].deletedCount} transcriptions, ${deletionResults[1].deletedCount} analyses, ${deletionResults[2].deletedCount} classifications`);

      // Delete the call itself
      const deletedCall = await Call.findOneAndDelete(filter);
      
      if (!deletedCall) {
        throw new Error(`Call not found during deletion: ${callId}`);
      }

      console.log(`✅ Successfully deleted call ${callId} and all related data`);
      return true;

    } catch (error) {
      console.error(`❌ Error deleting call:`, error.message);
      throw error;
    }
  }

  // =====================================================
  // TRANSCRIPTION OPERATIONS
  // =====================================================

  /**
   * Create transcription record
   */
  async createTranscription(transcriptionData) {
    try {
      const transcription = new Transcription(transcriptionData);
      const savedTranscription = await transcription.save();

      // Update call with transcription reference
      await Call.findByIdAndUpdate(
        transcriptionData.callId,
        { 
          transcription: savedTranscription._id,
          status: 'processing',
          processingStage: 'analyzing'
        }
      );

      console.log(`✅ Created transcription for call: ${transcriptionData.callId}`);
      return savedTranscription;

    } catch (error) {
      console.error('❌ Error creating transcription:', error.message);
      throw error;
    }
  }

  /**
   * Get transcription by call ID
   */
  async getTranscriptionByCallId(callId) {
    try {
      const transcription = await Transcription.findOne({ callId });
      return transcription;
    } catch (error) {
      console.error(`❌ Error fetching transcription:`, error.message);
      throw error;
    }
  }

  // =====================================================
  // ANALYSIS OPERATIONS
  // =====================================================

  /**
   * Create analysis record
   */
  async createAnalysis(analysisData) {
    try {
      const analysis = new Analysis(analysisData);
      const savedAnalysis = await analysis.save();

      // Update call with analysis reference
      await Call.findByIdAndUpdate(
        analysisData.callId,
        { 
          analysis: savedAnalysis._id,
          processingStage: 'classifying'
        }
      );

      console.log(`✅ Created analysis for call: ${analysisData.callId}`);
      return savedAnalysis;

    } catch (error) {
      console.error('❌ Error creating analysis:', error.message);
      throw error;
    }
  }

  /**
   * Get analysis by call ID
   */
  async getAnalysisByCallId(callId) {
    try {
      const analysis = await Analysis.findOne({ callId });
      return analysis;
    } catch (error) {
      console.error(`❌ Error fetching analysis:`, error.message);
      throw error;
    }
  }

  // =====================================================
  // CLASSIFICATION OPERATIONS
  // =====================================================

  /**
   * Create classification record
   */
  async createClassification(classificationData) {
    try {
      const classification = new Classification(classificationData);
      const savedClassification = await classification.save();

      // Update call with classification reference and mark as complete
      await Call.findByIdAndUpdate(
        classificationData.callId,
        { 
          classification: savedClassification._id,
          status: 'completed',
          processingStage: 'complete'
        }
      );

      console.log(`✅ Created classification for call: ${classificationData.callId}`);
      return savedClassification;

    } catch (error) {
      console.error('❌ Error creating classification:', error.message);
      throw error;
    }
  }

  /**
   * Get classification by call ID
   */
  async getClassificationByCallId(callId) {
    try {
      const classification = await Classification.findOne({ callId });
      return classification;
    } catch (error) {
      console.error(`❌ Error fetching classification:`, error.message);
      throw error;
    }
  }

  // =====================================================
  // ANALYTICS AND REPORTING
  // =====================================================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const [
        totalCalls,
        completedCalls,
        processingCalls,
        failedCalls,
        categoryStats,
        recentCalls
      ] = await Promise.all([
        Call.countDocuments(),
        Call.countDocuments({ status: 'completed' }),
        Call.countDocuments({ status: 'processing' }),
        Call.countDocuments({ status: 'failed' }),
        this.getCategoryStatistics(),
        Call.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('classification', 'category confidence')
          .select('filename originalName createdAt status')
      ]);

      return {
        summary: {
          totalCalls,
          completedCalls,
          processingCalls,
          failedCalls,
          successRate: totalCalls > 0 ? (completedCalls / totalCalls * 100).toFixed(1) : 0
        },
        categoryDistribution: categoryStats,
        recentActivity: recentCalls
      };

    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error.message);
      throw error;
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStatistics() {
    try {
      const stats = await Classification.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$confidence' },
            highConfidence: {
              $sum: { $cond: [{ $gte: ['$confidence', 0.7] }, 1, 0] }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return stats.map(stat => ({
        category: stat._id,
        count: stat.count,
        avgConfidence: Math.round(stat.avgConfidence * 100),
        highConfidenceCount: stat.highConfidence,
        percentage: 0 // Will be calculated if needed
      }));

    } catch (error) {
      console.error('❌ Error fetching category statistics:', error.message);
      throw error;
    }
  }

  /**
   * Search calls by content
   */
  async searchCallsContent(query, options = {}) {
    try {
      const { limit = 10, page = 1, userId } = options;
      const skip = (page - 1) * limit;

      // Build match filter for user-specific results
      const matchFilter = {};
      if (userId) {
        matchFilter.userId = userId;
      }

      // Search in transcription text and analysis summaries
      const calls = await Call.aggregate([
        // Add user filter at the beginning if specified
        ...(userId ? [{ $match: matchFilter }] : []),
        {
          $lookup: {
            from: 'transcriptions',
            localField: 'transcription',
            foreignField: '_id',
            as: 'transcriptionData'
          }
        },
        {
          $lookup: {
            from: 'analyses',
            localField: 'analysis',
            foreignField: '_id',
            as: 'analysisData'
          }
        },
        {
          $lookup: {
            from: 'classifications',
            localField: 'classification',
            foreignField: '_id',
            as: 'classificationData'
          }
        },
        {
          $match: {
            $or: [
              { filename: { $regex: query, $options: 'i' } },
              { 'transcriptionData.text': { $regex: query, $options: 'i' } },
              { 'analysisData.summary': { $regex: query, $options: 'i' } },
              { 'analysisData.executiveSummary': { $regex: query, $options: 'i' } }
            ]
          }
        },
        { $skip: skip },
        { $limit: limit },
        { $sort: { createdAt: -1 } }
      ]);

      return calls;

    } catch (error) {
      console.error('❌ Error searching calls content:', error.message);
      throw error;
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Health check for database operations
   */
  async healthCheck() {
    try {
      // Test basic operations
      await Promise.all([
        Call.findOne().limit(1),
        Transcription.findOne().limit(1),
        Analysis.findOne().limit(1),
        Classification.findOne().limit(1)
      ]);

      const stats = await this.getDashboardStats();

      return {
        status: 'healthy',
        message: 'Database operations working correctly',
        stats: stats.summary
      };

    } catch (error) {
      return {
        status: 'error',
        message: `Database operations failed: ${error.message}`
      };
    }
  }

  /**
   * Cleanup old or invalid records
   */
  async cleanup(options = {}) {
    try {
      const { 
        olderThanDays = 30, 
        removeFailedCalls = true,
        dryRun = false 
      } = options;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deleteFilter = { createdAt: { $lt: cutoffDate } };
      
      if (removeFailedCalls) {
        deleteFilter = {
          $or: [
            deleteFilter,
            { status: 'failed' }
          ]
        };
      }

      if (dryRun) {
        const count = await Call.countDocuments(deleteFilter);
        return { message: `Would delete ${count} calls`, count };
      } else {
        const result = await Call.deleteMany(deleteFilter);
        console.log(`🧹 Cleaned up ${result.deletedCount} old calls`);
        return { message: `Deleted ${result.deletedCount} calls`, count: result.deletedCount };
      }

    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
      throw error;
    }
  }
}

module.exports = new DatabaseService();