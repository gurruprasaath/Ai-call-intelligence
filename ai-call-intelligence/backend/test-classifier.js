/**
 * Test script for SBERT Conversation Classifier
 * 
 * This script tests the classification functionality with sample conversations.
 */

const conversationClassifier = require('./services/conversationClassifier');

async function testClassifier() {
  console.log('🧪 Testing SBERT Conversation Classifier');
  console.log('='.repeat(50));

  // Test conversations for different categories
  const testConversations = [
    {
      name: 'Work Meeting',
      transcript: `Let's discuss the quarterly budget meeting. We need to review the marketing campaign expenses and allocate resources for the next project. The team needs to submit their reports by Friday. Our client meeting is scheduled for next week to discuss the contract details and deliverables.`
    },
    {
      name: 'Family Call',
      transcript: `Hi mom, how are you doing? I wanted to check in about dinner plans for Sunday. Dad mentioned that uncle John might be visiting this weekend. The kids are excited about the vacation we planned for next month. How is grandma feeling after her doctor's appointment?`
    },
    {
      name: 'Healthcare Consultation',
      transcript: `Doctor, I've been experiencing some symptoms lately. My medication doesn't seem to be working as effectively. Can we schedule a follow-up appointment? I need to discuss the test results from last week. The therapy sessions have been helpful.`
    },
    {
      name: 'Technical Discussion',
      transcript: `We need to debug the API integration issue. The database server is experiencing performance problems. Let's review the code changes and run some tests. The software deployment is scheduled for tonight after we fix these bugs.`
    },
    {
      name: 'Education Planning',
      transcript: `Professor, I wanted to discuss my thesis research proposal. The semester exam schedule has been released. I need to complete the assignment before the deadline. Can we schedule office hours to review my coursework?`
    },
    {
      name: 'Financial Planning',
      transcript: `I'd like to discuss my investment portfolio and retirement savings plan. The bank approved my loan application. We need to review the budget and monthly expenses. What are your thoughts on the stock market trends?`
    }
  ];

  for (const conversation of testConversations) {
    console.log(`\n🔍 Testing: ${conversation.name}`);
    console.log('-'.repeat(30));
    
    try {
      const result = await conversationClassifier.classifyConversation(conversation.transcript);
      
      if (result.success) {
        const classification = result.classification;
        
        console.log(`✅ Category: ${classification.primary}`);
        console.log(`📊 Confidence: ${(classification.confidence * 100).toFixed(1)}% (${classification.confidenceLevel})`);
        
        if (classification.multiCategory.isMultiCategory) {
          console.log(`🔀 Multi-category: ${classification.multiCategory.categories.join(' & ')}`);
        }
        
        // Show top 3 category scores
        const topScores = Object.entries(classification.scores)
          .sort(([,a], [,b]) => b.score - a.score)
          .slice(0, 3);
        
        console.log('📈 Top Categories:');
        topScores.forEach(([cat, data]) => {
          console.log(`   ${cat}: ${(data.score * 100).toFixed(1)}% (${data.keywordMatches} keywords, ${data.patternMatches} patterns)`);
        });
        
        if (classification.context) {
          console.log(`🎯 Context: ${classification.context.formality} formality, ${classification.context.urgency} urgency, ${classification.context.sentiment} sentiment`);
        }
        
        console.log(`⏱️  Processing time: ${classification.processingTime.toFixed(3)}s`);
        
      } else {
        console.log('❌ Classification failed');
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${conversation.name}:`, error.message);
    }
  }

  // Test health check
  console.log('\n🏥 Health Check');
  console.log('-'.repeat(30));
  
  try {
    const health = await conversationClassifier.healthCheck();
    console.log(`Status: ${health.status}`);
    console.log(`Message: ${health.message}`);
    if (health.testResult) {
      console.log(`Test result: ${health.testResult.category} (${(health.testResult.confidence * 100).toFixed(1)}%)`);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }

  // Show available categories
  console.log('\n📋 Available Categories');
  console.log('-'.repeat(30));
  const categories = conversationClassifier.getAvailableCategories();
  console.log(categories.join(', '));

  console.log('\n✨ SBERT Classifier Test Complete!');
}

// Run the test
if (require.main === module) {
  testClassifier().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testClassifier };