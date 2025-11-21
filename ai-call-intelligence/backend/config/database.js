/**
 * MongoDB Database Configuration
 * 
 * This module handles the connection and configuration for MongoDB using Mongoose.
 * Supports both local MongoDB instances and MongoDB Atlas cloud connections.
 */

const mongoose = require('mongoose');
require('dotenv').config();

class DatabaseConfig {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    
    // MongoDB configuration
    // Preference order: ATLAS_URI (explicit), MONGODB_URI (legacy), then local fallback
    this.config = {
      uri: process.env.ATLAS_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-call-intelligence',
      options: {
        // Connection settings (Mongoose 6+ defaults are sufficient, but we include common options)
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        // New URL parser and unified topology are enabled by default in Mongoose 6+
        // include them for clarity and backwards compatibility where needed
        useNewUrlParser: true,
        useUnifiedTopology: true,

        // Additional settings for production
        retryWrites: true,
        w: 'majority'
      }
    };

    // Set Mongoose-specific options globally (for buffering control)
    mongoose.set('bufferCommands', false);

    // Event handlers
    this.setupEventHandlers();
  }

  /**
   * Connect to MongoDB database
   */
  async connect() {
    try {
  console.log('🔗 Connecting to MongoDB...');
  console.log(`📍 Database URI: ${this.getMaskedUri()}`);

      // First try with full options
      try {
        this.connection = await mongoose.connect(this.config.uri, this.config.options);
      } catch (optionsError) {
        console.warn('⚠️ Connection with options failed, trying with minimal config...');
        // Fallback to minimal connection options
        this.connection = await mongoose.connect(this.config.uri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000
        });
      }

      this.isConnected = true;

      console.log('✅ MongoDB connected successfully');
      try {
        console.log(`📊 Database: ${this.connection.connection.name}`);
        // For SRV (mongodb+srv) the port may be undefined; avoid assuming host:port
        const host = this.connection.connection.host || 'n/a';
        const port = this.connection.connection.port ? `:${this.connection.connection.port}` : '';
        console.log(`🖥️  Host: ${host}${port}`);
      } catch (e) {
        // Non-fatal logging issue - don't break connection
      }

      return this.connection;

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      
      // Try one more time with the absolute minimal config
      try {
        console.log('🔄 Attempting final fallback connection...');
        this.connection = await mongoose.connect(this.config.uri);
        this.isConnected = true;
        console.log('✅ MongoDB connected with fallback method');
        return this.connection;
      } catch (fallbackError) {
        console.error('❌ All connection attempts failed:', fallbackError.message);
        this.isConnected = false;
        throw new Error(`MongoDB connection failed: ${error.message}. Fallback also failed: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Disconnect from MongoDB database
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        console.log('✅ MongoDB disconnected successfully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Get database connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      models: Object.keys(mongoose.models),
      collections: mongoose.connection.db ? Object.keys(mongoose.connection.db.collection()) : []
    };
  }

  /**
   * Get masked database URI for logging (hides credentials)
   */
  getMaskedUri() {
    return this.config.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  }

  /**
   * Setup event handlers for MongoDB connection
   */
  setupEventHandlers() {
    // Connection events
    mongoose.connection.on('connected', () => {
      console.log('📡 Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📡 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🔄 Received SIGINT signal, closing MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🔄 Received SIGTERM signal, closing MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Health check for database connection
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return {
          status: 'disconnected',
          message: 'Database not connected',
          details: this.getConnectionStatus()
        };
      }

      // Try a simple operation
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        details: this.getConnectionStatus()
      };

    } catch (error) {
      return {
        status: 'error',
        message: `Database health check failed: ${error.message}`,
        details: this.getConnectionStatus()
      };
    }
  }

  /**
   * Initialize database with default data if needed
   */
  async initialize() {
    try {
      console.log('🔧 Initializing database...');

      // Check if database exists and has collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      if (collections.length === 0) {
        console.log('📝 Database is empty, creating initial setup...');
        // You can add any initial data setup here
      } else {
        console.log(`📊 Found ${collections.length} existing collections:`, 
          collections.map(c => c.name).join(', '));
      }

      console.log('✅ Database initialization complete');
      return true;

    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Drop entire database (use with caution!)
   */
  async dropDatabase() {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to database');
      }

      console.log('⚠️  Dropping entire database...');
      await mongoose.connection.db.dropDatabase();
      console.log('✅ Database dropped successfully');
      
    } catch (error) {
      console.error('❌ Error dropping database:', error.message);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to database');
      }

      const stats = await mongoose.connection.db.stats();
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      return {
        database: stats.db,
        collections: collections.length,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        ok: stats.ok
      };

    } catch (error) {
      console.error('❌ Error getting database stats:', error.message);
      throw error;
    }
  }
}

// Create and export singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;