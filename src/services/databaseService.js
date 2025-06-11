const config = require('../config');
const { v4: uuidv4 } = require('uuid');

/**
 * Database Service
 * 
 * Provides an abstract interface for database operations.
 * Supports multiple database implementations through adapters.
 * 
 * Current implementations:
 * - MockDatabase (JSON files) - for development/testing
 * 
 * Future implementations can include:
 * - PostgreSQLDatabase
 * - MongoDBDatabase 
 * - CosmosDBDatabase
 * - SQLiteDatabase
 * - DynamoDBDatabase
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.sessionCache = new Map(); // Cache for user sessions
    this.performanceTimer = new Map(); // For timing operations
    this.config = config.databaseConfig;
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    if (!this.config.enabled) {
      console.log('💾 Database logging is disabled');
      return;
    }

    try {
      console.log('🔄 Initializing database service...');
      
      // Get database configuration
      const dbType = process.env.DATABASE_TYPE || 'mock';
      const dbConfig = this.getDatabaseConfig(dbType);
      
      // Load appropriate database implementation
      const DatabaseImplementation = this.loadDatabaseImplementation(dbType);
      
      // Create database instance
      this.db = new DatabaseImplementation(dbConfig);
      
      // Connect to database
      await this.db.connect();
      
      this.isInitialized = true;
      console.log('✅ Database service initialized successfully');
      
      // Log initialization
      await this.logSystemEvent('database_init', 'DatabaseService', 'info', 'Database service initialized', {
        databaseType: dbType,
        configuration: dbConfig
      });
      
      return true;
    } catch (error) {
      console.error('❌ Database service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Shutdown database connection
   */
  async shutdown() {
    try {
      if (this.db && this.isInitialized) {
        await this.logSystemEvent('database_shutdown', 'DatabaseService', 'info', 'Database service shutting down');
        await this.db.disconnect();
        this.isInitialized = false;
        console.log('✅ Database service shut down successfully');
      }
    } catch (error) {
      console.error('❌ Database service shutdown failed:', error);
      throw error;
    }
  }

  /**
   * Check if database logging is enabled and initialized
   */
  isEnabled() {
    return this.config.enabled && this.isInitialized && this.db;
  }

  /**
   * Log an image generation transaction
   */
  async logImageGeneration(transactionData) {
    if (!this.isEnabled() || !this.config.logTransactions) {
      return null;
    }

    try {
      const transaction = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: 'image_generation',
        status: 'completed',
        ...transactionData
      };

      await this.db.create('image_generation_transactions', transaction);
      return transaction;
    } catch (error) {
      console.error('Failed to log image generation:', error);
      return null;
    }
  }

  /**
   * Log an API request
   */
  async logApiRequest(requestData) {
    if (!this.isEnabled() || !this.config.logApiRequests) {
      return null;
    }

    try {
      const logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...requestData
      };

      await this.db.create('api_request_logs', logEntry);
      return logEntry;
    } catch (error) {
      console.error('Failed to log API request:', error);
      return null;
    }
  }

  /**
   * Log system events
   */
  async logSystemEvent(eventType, eventData, errorData = null) {
    if (!this.isEnabled() || !this.config.logSystemEvents) {
      return null;
    }

    try {
      const event = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType,
        level: errorData ? 'error' : 'info',
        message: eventData.message || '',
        data: eventData,
        error: errorData ? {
          message: errorData.message,
          stack: errorData.stack,
          name: errorData.name
        } : null
      };

      await this.db.create('system_event_logs', event);
      return event;
    } catch (error) {
      console.error('Failed to log system event:', error);
      return null;
    }
  }

  /**
   * Start performance timing
   */
  startPerformanceTimer(operationId) {
    if (!this.isEnabled()) {
      return null;
    }

    this.performanceTimer.set(operationId, {
      startTime: Date.now(),
      checkpoints: []
    });
    return operationId;
  }

  /**
   * Add checkpoint to performance timer
   */
  addPerformanceCheckpoint(operationId, checkpointName) {
    if (!this.isEnabled() || !this.performanceTimer.has(operationId)) {
      return null;
    }

    const timer = this.performanceTimer.get(operationId);
    timer.checkpoints.push({
      name: checkpointName,
      timestamp: Date.now(),
      elapsed: Date.now() - timer.startTime
    });
    return timer;
  }

  /**
   * End performance timing and optionally log
   */
  endPerformanceTimer(operationId, shouldLog = false) {
    if (!this.isEnabled() || !this.performanceTimer.has(operationId)) {
      return null;
    }

    const timer = this.performanceTimer.get(operationId);
    const endTime = Date.now();
    const totalDuration = endTime - timer.startTime;

    const performance = {
      operationId,
      totalDuration,
      checkpoints: timer.checkpoints,
      endTime: endTime
    };

    if (shouldLog) {
      this.logPerformanceMetrics(performance);
    }

    this.performanceTimer.delete(operationId);
    return performance;
  }

  /**
   * Log performance metrics
   */
  async logPerformanceMetrics(performanceData) {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const metrics = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...performanceData
      };

      await this.db.create('performance_metrics', metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to log performance metrics:', error);
      return null;
    }
  }

  /**
   * Get or create user session
   */
  getOrCreateSession(userIP, userAgent) {
    if (!this.isEnabled()) {
      return null;
    }

    const sessionKey = `${userIP}_${userAgent}`;
    
    if (this.sessionCache.has(sessionKey)) {
      return this.sessionCache.get(sessionKey);
    }

    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userIP,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      requestCount: 0,
      successCount: 0,
      errorCount: 0
    };

    this.sessionCache.set(sessionKey, sessionId);
    this.db.create('user_sessions', session);
    
    return sessionId;
  }

  /**
   * Update session statistics
   */
  async updateSessionStats(sessionId, isSuccess) {
    if (!this.isEnabled() || !sessionId) {
      return null;
    }

    try {
      // This is a simplified version - in a real implementation,
      // you'd update the actual database record
      return { sessionId, updated: true };
    } catch (error) {
      console.error('Failed to update session stats:', error);
      return null;
    }
  }

  /**
   * Query database with filters
   */
  async query(table, filters = {}, options = {}) {
    if (!this.isEnabled()) {
      return [];
    }

    try {
      return await this.db.find(table, filters, options);
    } catch (error) {
      console.error(`Failed to query ${table}:`, error);
      return [];
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.isEnabled()) {
      return {
        enabled: false,
        message: 'Database logging is disabled'
      };
    }

    try {
      return await this.db.getStats();
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return { error: 'Failed to retrieve stats' };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.config.enabled) {
      return {
        status: 'disabled',
        message: 'Database logging is disabled'
      };
    }

    if (!this.isInitialized || !this.db) {
      return {
        status: 'error',
        message: 'Database not initialized'
      };
    }

    try {
      await this.db.healthCheck();
      return {
        status: 'healthy',
        type: this.config.type,
        enabled: this.config.enabled
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Cleanup and close database connection
   */
  async close() {
    if (this.isEnabled()) {
      try {
        await this.db.close();
        console.log('💾 Database service closed');
      } catch (error) {
        console.error('Error closing database service:', error);
      }
    }
    
    this.isInitialized = false;
    this.sessionCache.clear();
    this.performanceTimer.clear();
  }

  // Private helper methods

  getDatabaseConfig(dbType) {
    const baseConfig = {
      dataDir: process.env.DATABASE_DATA_DIR || 'data/database',
      enableCache: process.env.DATABASE_ENABLE_CACHE !== 'false',
      maxCacheSize: parseInt(process.env.DATABASE_MAX_CACHE_SIZE) || 1000
    };

    switch (dbType) {
      case 'mock':
        return baseConfig;
      case 'postgresql':
        return {
          ...baseConfig,
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT) || 5432,
          database: process.env.DATABASE_NAME || 'logogen',
          username: process.env.DATABASE_USERNAME,
          password: process.env.DATABASE_PASSWORD
        };
      case 'mongodb':
        return {
          ...baseConfig,
          connectionString: process.env.DATABASE_CONNECTION_STRING,
          database: process.env.DATABASE_NAME || 'logogen'
        };
      default:
        return baseConfig;
    }
  }

  loadDatabaseImplementation(dbType) {
    switch (dbType) {
      case 'mock':
        return require('../database/implementations/mockDatabase');
      case 'postgresql':
        // return require('../database/implementations/postgresqlDatabase');
        throw new Error('PostgreSQL implementation not yet available');
      case 'mongodb':
        // return require('../database/implementations/mongodbDatabase');
        throw new Error('MongoDB implementation not yet available');
      default:
        console.warn(`⚠️ Unknown database type '${dbType}', falling back to mock`);
        return require('../database/implementations/mockDatabase');
    }
  }

  async createSessionRecord(sessionId, userIP, userAgent) {
    try {
      const session = {
        id: sessionId,
        userIP,
        userAgent,
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        totalRequests: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        totalImagesGenerated: 0
      };
      
      await this.db.create('UserSession', session);
    } catch (error) {
      console.error('❌ Failed to create session record:', error);
    }
  }

  sanitizeRequestBody(body) {
    if (!body) return null;
    
    // Remove sensitive data
    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.apiKey;
    delete sanitized.token;
    
    return sanitized;
  }

  sanitizeResponseBody(body) {
    if (!body) return null;
    
    // Remove sensitive data from responses
    const sanitized = { ...body };
    if (sanitized.data) {
      delete sanitized.data.apiKey;
      delete sanitized.data.token;
    }
    
    return sanitized;
  }

  sanitizeHeaders(headers) {
    if (!headers) return null;
    
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    
    return sanitized;
  }
}

module.exports = new DatabaseService(); 