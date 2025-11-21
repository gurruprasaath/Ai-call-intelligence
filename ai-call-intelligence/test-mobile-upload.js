/**
 * Test script to verify mobile upload endpoint is working
 * Run this to simulate a mobile phone uploading a recording
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:3001';  // Change if your server runs on different port
const TEST_AUDIO_FILE = path.join(__dirname, 'test-audio.wav'); // We'll create a dummy file

// Create a small test audio file (dummy data)
function createTestAudioFile() {
  console.log('📝 Creating test audio file...');
  
  // Create a simple WAV header + some dummy audio data
  const wavHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x08, 0x00, 0x00, // File size
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6d, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // Chunk size
    0x01, 0x00, 0x01, 0x00, // Audio format, channels
    0x44, 0xac, 0x00, 0x00, // Sample rate (44100)
    0x88, 0x58, 0x01, 0x00, // Byte rate
    0x02, 0x00, 0x10, 0x00, // Block align, bits per sample
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x08, 0x00, 0x00  // Data size
  ]);
  
  // Add some dummy audio data (2048 bytes of audio)
  const audioData = Buffer.alloc(2048, 0x00);
  const testFile = Buffer.concat([wavHeader, audioData]);
  
  fs.writeFileSync(TEST_AUDIO_FILE, testFile);
  console.log(`✅ Created test audio file: ${TEST_AUDIO_FILE} (${testFile.length} bytes)`);
}

// Test the mobile upload endpoint
async function testMobileUpload() {
  try {
    console.log('\n🧪 Testing mobile upload endpoint...');
    
    // Check if test file exists, create if needed
    if (!fs.existsSync(TEST_AUDIO_FILE)) {
      createTestAudioFile();
    }
    
    const form = new FormData();
    form.append('audio', fs.createReadStream(TEST_AUDIO_FILE), {
      filename: 'test-call-recording.wav',
      contentType: 'audio/wav'
    });
    
    // Add mobile metadata
    form.append('callStart', new Date(Date.now() - 60000).toISOString()); // 1 minute ago
    form.append('callEnd', new Date().toISOString());
    form.append('phoneNumber', '+1-555-123-4567');
    form.append('deviceId', 'test-device-123');
    form.append('callType', 'outbound');
    form.append('userEmail', 'test@example.com');
    
    console.log('📤 Uploading to /api/mobile/upload...');
    
    const response = await axios.post(`${SERVER_URL}/api/mobile/upload`, form, {
      headers: {
        ...form.getHeaders(),
        'x-device-id': 'test-device-123',
        'x-call-type': 'outbound'
      },
      timeout: 30000
    });
    
    console.log('✅ Upload successful!');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    const callId = response.data.callId;
    
    // Poll processing status
    if (callId) {
      await pollProcessingStatus(callId);
    }
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Mobile upload test failed:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error:`, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server. Is it running on', SERVER_URL, '?');
      console.log('\n💡 To start the server:');
      console.log('   cd backend');
      console.log('   npm start');
    } else {
      console.error(error.message);
    }
    
    throw error;
  }
}

// Poll processing status
async function pollProcessingStatus(callId) {
  console.log(`\n🔄 Polling processing status for call: ${callId}`);
  
  const maxAttempts = 20; // 2 minutes max (6 second intervals)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${SERVER_URL}/api/upload/status/${callId}`);
      const { status, processingStage, progress } = response.data;
      
      console.log(`📊 Status: ${status} | Stage: ${processingStage} | Progress: ${progress}%`);
      
      if (status === 'completed') {
        console.log('✅ Processing completed successfully!');
        console.log('🎉 Your mobile upload is working correctly!');
        return;
      }
      
      if (status === 'failed') {
        console.log('❌ Processing failed');
        console.log('Error details:', response.data.errors);
        return;
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 6000));
      attempts++;
      
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      break;
    }
  }
  
  console.log('⏰ Status polling timeout - check manually in web app');
}

// Test server health
async function testServerHealth() {
  try {
    console.log('🏥 Testing server health...');
    const response = await axios.get(`${SERVER_URL}/api/health`);
    console.log('✅ Server is healthy!');
    console.log('📋 Health info:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Server health check failed:');
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server. Is it running?');
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Test getting all calls
async function testGetCalls() {
  try {
    console.log('\n📋 Testing /api/calls endpoint...');
    const response = await axios.get(`${SERVER_URL}/api/calls`);
    const calls = response.data.calls || [];
    
    console.log(`✅ Found ${calls.length} existing calls`);
    
    // Show recent mobile calls
    const mobileCalls = calls.filter(call => call.mobile);
    if (mobileCalls.length > 0) {
      console.log(`📱 Mobile calls found: ${mobileCalls.length}`);
      mobileCalls.slice(0, 3).forEach(call => {
        console.log(`  - ${call.filename} (${call.status}) uploaded ${call.uploadedAt}`);
      });
    } else {
      console.log('📱 No mobile calls found yet');
    }
    
    return calls;
  } catch (error) {
    console.error('❌ Get calls test failed:', error.message);
    return [];
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 AI Call Intelligence - Mobile Upload Test Suite');
  console.log('=' .repeat(50));
  
  try {
    // 1. Test server health
    const serverHealthy = await testServerHealth();
    if (!serverHealthy) {
      console.log('\n💡 Make sure your server is running:');
      console.log('   cd backend');
      console.log('   npm start');
      return;
    }
    
    // 2. Test getting existing calls
    await testGetCalls();
    
    // 3. Test mobile upload
    await testMobileUpload();
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📱 To test with real mobile app:');
    console.log('   1. Open your web app at http://localhost:3000');
    console.log('   2. Go to "Past Calls" page');  
    console.log('   3. Look for the new test recording with 📱 badge');
    console.log('   4. Auto-refresh should show new uploads within 30 seconds');
    
  } catch (error) {
    console.error('\n❌ Test suite failed');
  } finally {
    // Cleanup test file
    if (fs.existsSync(TEST_AUDIO_FILE)) {
      fs.unlinkSync(TEST_AUDIO_FILE);
      console.log('🧹 Cleaned up test file');
    }
  }
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testServerHealth,
  testMobileUpload,
  testGetCalls,
  runTests
};