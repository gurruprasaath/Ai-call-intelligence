/**
 * MongoDB Database Configuration
 * 
 * This module handles the connection and configuration for MongoDB using Mongoose.
 * Supports both local MongoDB instances and MongoDB Atlas cloud connections.
 */

const mongoose = require('mongoose');
const dns = require('dns');
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
        // Additional settings for production
        retryWrites: true,
        w: 'majority',
        family: 4 // Force IPv4 to avoid potential IPv6 DNS issues
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

      this.applyDnsOverridesIfConfigured();

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

      this.logConnectionTroubleshootingHints(error);
      
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
      collections: Object.keys(mongoose.connection.collections || {})
    };
  }

  /**
   * Get masked database URI for logging (hides credentials)
   */
  getMaskedUri() {
    return this.config.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  }

  /**
   * Optional DNS overrides for mongodb+srv connections.
   * Useful on networks where SRV lookups are blocked or broken.
   *
   * Env vars:
   * - MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1
   * - MONGODB_IPV4_FIRST=true
   */
  applyDnsOverridesIfConfigured() {
    const uri = this.config.uri || '';
    if (!uri.startsWith('mongodb+srv://')) return;

    const dnsServers = process.env.MONGODB_DNS_SERVERS;
    if (dnsServers) {
      const servers = dnsServers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (servers.length > 0) {
        try {
          dns.setServers(servers);
          console.log(`🌐 Using custom DNS servers for MongoDB SRV: ${servers.join(', ')}`);
        } catch (e) {
          console.warn('⚠️ Failed to apply custom DNS servers:', e.message);
        }
      }
    }

    if ((process.env.MONGODB_IPV4_FIRST || '').toLowerCase() === 'true') {
      try {
        dns.setDefaultResultOrder('ipv4first');
        console.log('🌐 DNS result order set to ipv4first');
      } catch (e) {
        // Not supported on very old Node versions
      }
    }
  }

  logConnectionTroubleshootingHints(error) {
    // Common Atlas issue: SRV DNS queries blocked/refused by network/DNS
    if (error && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') && error.syscall === 'querySrv') {
      console.error('🧭 Hint: This looks like a DNS/SRV lookup failure for a mongodb+srv URI.');
      console.error('   - Try running: nslookup -type=SRV _mongodb._tcp.<cluster-host>');
      console.error('   - If SRV is blocked/refused, switch DNS (e.g. 8.8.8.8/1.1.1.1) or disable VPN/corporate DNS interception.');
      console.error('   - Or set MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 (and optionally MONGODB_IPV4_FIRST=true) and restart.');
      console.error('   - For dev, you can also run local MongoDB and unset ATLAS_URI to use the localhost fallback.');
    }
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