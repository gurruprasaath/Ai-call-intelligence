/**
 * Email Test Script
 * Run this to test if email configuration is working
 */

require('dotenv').config();
const notificationService = require('./services/notificationService');

async function testEmail() {
  try {
    console.log('🧪 Testing email configuration...');
    console.log(`📧 Sender: ${process.env.EMAIL_USER}`);
    console.log(`📬 Recipient: ${process.env.DEFAULT_USER_EMAIL}`);
    
    // Test upload completion notification
    await notificationService.sendUploadCompletionNotification(
      'TEST-001',
      'test-audio-file.mp3',
      process.env.DEFAULT_USER_EMAIL
    );
    
    console.log('✅ Email test completed! Check your inbox.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    process.exit(1);
  }
}

testEmail();