/**
 * MongoDB Database Integration Test
 * 
 * This script tests all database operations including CRUD operations
 * for calls, transcriptions, analyses, and classifications.
 */

const databaseConfig = require('./config/database');
const databaseService = require('./services/databaseService');
const conversationClassifier = require('./services/conversationClassifier');

async function runDatabaseTests() {
  console.log('🧪 MongoDB Integration Test Suite');
  console.log('='.repeat(50));

  try {
    // Step 1: Connect to database
    console.log('\n📡 Step 1: Database Connection Test');
    console.log('-'.repeat(30));
    
    await databaseConfig.connect();
    const connectionStatus = databaseConfig.getConnectionStatus();
    console.log('✅ Database connected successfully');
    console.log(`📊 Connection status:`, connectionStatus);

    // Step 2: Health checks
    console.log('\n🏥 Step 2: Service Health Checks');
    console.log('-'.repeat(30));
    
    const dbHealth = await databaseConfig.healthCheck();
    const serviceHealth = await databaseService.healthCheck();
    const classifierHealth = await conversationClassifier.healthCheck();
    
    console.log('Database Health:', dbHealth.status);
    console.log('Service Health:', serviceHealth.status);
    console.log('Classifier Health:', classifierHealth.status);

    // Step 3: Test Call CRUD operations
    console.log('\n📞 Step 3: Call CRUD Operations Test');
    console.log('-'.repeat(30));
    
    // Create a test call
    const testCall = await databaseService.createCall({
      filename: 'test-audio-001.mp3',
      originalName: 'Test Business Meeting.mp3',
      fileSize: 1024000,
      mimeType: 'audio/mpeg',
      filePath: '/uploads/test-audio-001.mp3',
      duration: 300,
      userAgent: 'Test-User-Agent/1.0',
      ipAddress: '127.0.0.1',
      sessionId: 'test-session-123'
    });
    
    console.log(`✅ Created test call: ${testCall._id}`);
    
    // Test updating call status
    await databaseService.updateCallStatus(testCall._id, 'processing', 'transcribing');
    console.log('✅ Updated call status to processing');

    // Step 4: Test Transcription operations
    console.log('\n🎤 Step 4: Transcription Operations Test');
    console.log('-'.repeat(30));
    
    const testTranscription = await databaseService.createTranscription({
      callId: testCall._id,
      text: "Let's discuss our quarterly marketing budget allocation. We need to focus on digital advertising and social media campaigns. The total budget is $50,000 for Q4. Sarah, can you prepare a detailed breakdown by Friday?",
      confidence: 0.95,
      duration: 300,
      language: 'en-US',
      speakers: [
        {
          name: 'Speaker 1',
          segments: [
            {
              text: "Let's discuss our quarterly marketing budget allocation.",
              start: 0,
              end: 5.2,
              confidence: 0.98
            }
          ]
        }
      ],
      processingTime: 12.5,
      model: 'whisper-large-v3',
      provider: 'groq',
      qualityMetrics: {
        wordCount: 45,
        averageConfidence: 0.95
      }
    });
    
    console.log(`✅ Created transcription: ${testTranscription._id}`);

    // Step 5: Test Classification
    console.log('\n🏷️ Step 5: Classification Test');
    console.log('-'.repeat(30));
    
    const classificationResult = await conversationClassifier.classifyConversation(testTranscription.text);
    console.log(`✅ Classification result: ${classificationResult.classification.primary} (${(classificationResult.classification.confidence * 100).toFixed(1)}%)`);

    // Step 6: Test Analysis operations
    console.log('\n🧠 Step 6: Analysis Operations Test');
    console.log('-'.repeat(30));
    
    const testAnalysis = await databaseService.createAnalysis({
      callId: testCall._id,
      transcriptionId: testTranscription._id,
      summary: [
        "Discussed Q4 marketing budget allocation of $50,000",
        "Agreed to focus on digital advertising and social media campaigns",
        "Sarah assigned to prepare detailed budget breakdown by Friday"
      ],
      executiveSummary: "Quarterly marketing budget meeting focusing on $50K allocation for digital advertising",
      keyDecisions: [
        {
          decision: "Allocate $50,000 for Q4 marketing budget",
          reasoning: "Based on quarterly budget planning requirements",
          participants: ["Speaker 1", "Sarah"],
          confidence: "High",
          impact: "High"
        }
      ],
      keyPoints: [
        {
          point: "Focus on digital advertising and social media campaigns",
          importance: "High",
          category: "Strategy"
        }
      ],
      actionItems: [
        {
          task: "Prepare detailed budget breakdown",
          assignedTo: "Sarah",
          deadline: "Friday",
          priority: "High",
          status: "Pending"
        }
      ],
      insights: {
        sentiment: {
          overall: "Positive",
          score: 0.75,
          analysis: "Collaborative discussion with clear action items"
        },
        talkRatio: {
          "Speaker 1": 0.7,
          "Sarah": 0.3
        },
        conversationDynamics: {
          interruptions: 0,
          questionsAsked: 2,
          avgEngagement: "High",
          keyTopics: 3
        },
        recurringThemes: ["budget", "marketing", "digital advertising"],
        keyMetrics: {
          totalSpeakers: 2,
          topicsDiscussed: 3,
          decisionsReached: 1,
          actionItemsCreated: 1
        }
      },
      processingTime: 8.2,
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
      analysisVersion: '1.0'
    });
    
    console.log(`✅ Created analysis: ${testAnalysis._id}`);

    // Step 7: Test Classification storage
    console.log('\n📊 Step 7: Classification Storage Test');
    console.log('-'.repeat(30));
    
    const testClassification = await databaseService.createClassification({
      callId: testCall._id,
      transcriptionId: testTranscription._id,
      category: classificationResult.classification.primary,
      confidence: classificationResult.classification.confidence,
      confidenceLevel: classificationResult.classification.confidenceLevel,
      allScores: Object.entries(classificationResult.classification.scores).map(([cat, data]) => ({
        category: cat,
        score: data.score,
        keywordMatches: data.keywordMatches,
        patternMatches: data.patternMatches,
        rawScore: data.rawScore
      })),
      multiCategory: classificationResult.classification.multiCategory,
      context: classificationResult.classification.context,
      processingTime: classificationResult.classification.processingTime,
      model: 'sbert-classifier',
      classifierVersion: '1.0',
      qualityMetrics: {
        textLength: testTranscription.text.length,
        keywordDensity: 0.15,
        patternMatches: 5,
        confidenceDistribution: {}
      }
    });
    
    console.log(`✅ Created classification: ${testClassification._id}`);

    // Step 8: Test data retrieval
    console.log('\n📖 Step 8: Data Retrieval Test');
    console.log('-'.repeat(30));
    
    // Get complete call with all relations
    const completeCall = await databaseService.getCallById(testCall._id, true);
    console.log(`✅ Retrieved complete call with ${Object.keys(completeCall.toObject()).length} fields`);
    
    // Test calls listing with pagination
    const callsList = await databaseService.getCalls({ page: 1, limit: 5 });
    console.log(`✅ Retrieved calls list: ${callsList.calls.length} calls, ${callsList.pagination.totalItems} total`);

    // Step 9: Test dashboard statistics
    console.log('\n📊 Step 9: Dashboard Statistics Test');
    console.log('-'.repeat(30));
    
    const dashboardStats = await databaseService.getDashboardStats();
    console.log(`✅ Dashboard stats:`, {
      totalCalls: dashboardStats.summary.totalCalls,
      completedCalls: dashboardStats.summary.completedCalls,
      categories: dashboardStats.categoryDistribution.length,
      recentActivity: dashboardStats.recentActivity.length
    });

    // Step 10: Test search functionality
    console.log('\n🔍 Step 10: Search Functionality Test');
    console.log('-'.repeat(30));
    
    const searchResults = await databaseService.searchCallsContent('marketing budget', { limit: 5 });
    console.log(`✅ Search results: Found ${searchResults.length} matches for 'marketing budget'`);

    // Step 11: Test cleanup (dry run)
    console.log('\n🧹 Step 11: Cleanup Test (Dry Run)');
    console.log('-'.repeat(30));
    
    const cleanupResult = await databaseService.cleanup({ 
      olderThanDays: 1, 
      removeFailedCalls: false, 
      dryRun: true 
    });
    console.log(`✅ Cleanup dry run: ${cleanupResult.message}`);

    // Step 12: Test data deletion
    console.log('\n🗑️ Step 12: Data Deletion Test');
    console.log('-'.repeat(30));
    
    const deleteResult = await databaseService.deleteCall(testCall._id);
    console.log(`✅ Deleted test call and all related data`);

    // Step 13: Final database statistics
    console.log('\n📈 Step 13: Final Database Statistics');
    console.log('-'.repeat(30));
    
    const finalStats = await databaseConfig.getStats();
    console.log('✅ Final database statistics:');
    console.log(`   Collections: ${finalStats.collections}`);
    console.log(`   Objects: ${finalStats.objects}`);
    console.log(`   Data size: ${(finalStats.dataSize / 1024).toFixed(2)} KB`);
    console.log(`   Storage size: ${(finalStats.storageSize / 1024).toFixed(2)} KB`);

    console.log('\n✨ All database tests completed successfully!');
    console.log('🎉 MongoDB integration is working correctly');

  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    // Cleanup: Disconnect from database
    try {
      await databaseConfig.disconnect();
      console.log('\n👋 Disconnected from database');
    } catch (disconnectError) {
      console.error('❌ Error disconnecting:', disconnectError.message);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runDatabaseTests()
    .then(() => {
      console.log('\n🎊 Database test suite completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runDatabaseTests };