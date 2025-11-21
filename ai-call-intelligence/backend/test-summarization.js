/**
 * Test script for Groq Llama summarization functionality
 */

require('dotenv').config();
const summarizationService = require('./services/summarization');

async function testSummarization() {
  const testConversation = `
Conversation Summary
Weekly project status meeting covering development progress

Development team is 80% complete with new feature rollout

User authentication module fully implemented and tested

Encountered API integration issue causing delays

Third-party API documentation was outdated with changed endpoints

Launch timeline adjusted from Friday to next Tuesday

Marketing campaign timeline will be adjusted accordingly

Speaker 1: Good morning everyone, let's start our weekly project status meeting. I want to get an update on where we stand with the new feature rollout.

Speaker 2: Thanks for organizing this. From the development side, I'm happy to report that we're about 80% complete with the new feature rollout. The user authentication module has been fully implemented and we've completed all testing on that component.

Speaker 1: That's excellent progress on the authentication module. What about the API integration work?

Speaker 2: That's actually where we've hit a snag. We encountered an API integration issue that's causing some delays. The third-party API documentation we were working from turned out to be outdated, and they've changed several endpoints without properly updating their docs.

Speaker 1: Oh no, that's frustrating. How much of a delay are we looking at?

Speaker 2: Based on what I'm seeing, we'll need to adjust our launch timeline. Instead of launching this Friday as planned, we're now looking at next Tuesday. That gives us the weekend and Monday to properly test the corrected API integrations.

Speaker 1: Understood. That means we'll also need to adjust our marketing campaign timeline accordingly. I'll coordinate with the marketing team to push back their promotional activities.

Speaker 2: Exactly. I think it's better to launch properly tested rather than rush and have issues in production.

Speaker 1: Absolutely agree. Better to get it right. Anything else we need to discuss?

Speaker 2: I think that covers the main points. I'll send out a detailed status update after this meeting with the revised timeline.

Speaker 1: Perfect. Thanks for the update, and let me know if you need any support with the API integration work.
`;

  console.log('🧪 Testing Groq Llama Summarization...\n');

  try {
    // Test health check first
    console.log('1. Health Check:');
    const healthStatus = await summarizationService.healthCheck();
    console.log(JSON.stringify(healthStatus, null, 2));
    console.log('\n');

    if (healthStatus.status === 'healthy') {
      // Test full summarization
      console.log('2. Full Conversation Analysis:');
      const fullSummary = await summarizationService.summarizeConversation(testConversation);
      console.log(JSON.stringify(fullSummary, null, 2));
      console.log('\n');

      // Test action item extraction
      console.log('3. Action Item Extraction:');
      const actionItems = await summarizationService.extractActionItems(testConversation);
      console.log(JSON.stringify(actionItems, null, 2));
      console.log('\n');

      // Test quick summary
      console.log('4. Quick Summary:');
      const quickSummary = await summarizationService.generateQuickSummary(testConversation);
      console.log(JSON.stringify(quickSummary.summary, null, 2));

    } else {
      console.log('❌ Groq API not available, skipping tests');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testSummarization()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSummarization };