/**
 * Simple MongoDB Connection Test
 * 
 * This script tests if MongoDB is running and accessible before starting the main application.
 */

const mongoose = require('mongoose');

async function testMongoDBConnection() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-call-intelligence';
  
  console.log('🧪 Testing MongoDB Connection');
  console.log(`📍 URI: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  console.log('-'.repeat(40));

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    await mongoose.connect(uri);
    console.log('✅ Basic connection successful');

    // Test 2: Database operations
    console.log('2️⃣ Testing database operations...');
    const testCollection = mongoose.connection.db.collection('test');
    
    // Insert a test document
    const insertResult = await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'MongoDB connection test' 
    });
    console.log('✅ Insert operation successful');

    // Find the test document
    const findResult = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ Find operation successful');

    // Delete the test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Delete operation successful');

    // Test 3: Database info
    console.log('3️⃣ Getting database information...');
    const admin = mongoose.connection.db.admin();
    const dbStats = await mongoose.connection.db.stats();
    
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🖥️  Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    console.log(`📈 Collections: ${dbStats.collections}`);
    console.log(`💾 Data size: ${(dbStats.dataSize / 1024).toFixed(2)} KB`);

    console.log('\n🎉 All MongoDB tests passed!');
    console.log('✅ MongoDB is ready for the application');

    return true;

  } catch (error) {
    console.error('\n❌ MongoDB connection test failed');
    console.error('Error details:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Make sure MongoDB is installed and running');
      console.error('   2. Start MongoDB service: mongod');
      console.error('   3. Or use MongoDB Atlas cloud database');
      console.error('   4. Check if port 27017 is available');
    }

    return false;

  } finally {
    // Clean up connection
    try {
      await mongoose.disconnect();
      console.log('👋 Disconnected from MongoDB');
    } catch (disconnectError) {
      console.warn('⚠️ Error during disconnect:', disconnectError.message);
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testMongoDBConnection()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testMongoDBConnection };