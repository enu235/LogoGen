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
  }

  /**
   * Initialize database connection
   */
  async initialize() {
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
   * Log a complete image generation transaction
   */
  async logImageGeneration(requestData, responseData, performanceData, errorData = null) {
    try {
      const sessionId = this.getOrCreateSession(requestData.userIP, requestData.userAgent);
      
      const transaction = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        sessionId,
        userIP: requestData.userIP,
        userAgent: requestData.userAgent,
        
        // Request Data
        originalPrompt: requestData.originalPrompt,
        enhancedPrompt: requestData.enhancedPrompt,
        finalPrompt: requestData.finalPrompt,
        imageType: requestData.imageType,
        enhancePromptRequested: requestData.enhancePromptRequested,
        
        // Response Data
        success: !errorData,
        errorMessage: errorData?.message || null,
        imageUrl: responseData?.imageUrl,
        processedFilename: responseData?.processedFilename,
        originalFilename: responseData?.originalFilename,
        processedFilePath: responseData?.processedFilePath,
        originalFilePath: responseData?.originalFilePath,
        fileSize: responseData?.fileSize,
        dimensions: responseData?.dimensions,
        
        // Performance Metrics
        totalDuration: performanceData.totalDuration,
        promptEnhancementDuration: performanceData.promptEnhancementDuration,
        imageGenerationDuration: performanceData.imageGenerationDuration,
        imageProcessingDuration: performanceData.imageProcessingDuration,
        
        // API Details
        apiModel: config.apiConfig.modelName,
        apiBaseUrl: config.apiConfig.baseURL,
        llmModel: config.llmConfig.modelName,
        
        // Status
        status: errorData ? 'failed' : 'completed'
      };
      
      const record = await this.db.create('ImageGenerationTransaction', transaction);
      
      // Update session statistics
      await this.updateSessionStats(sessionId, !errorData);
      
      console.log('📊 Image generation transaction logged:', record.id);
      return record;
    } catch (error) {
      console.error('❌ Failed to log image generation transaction:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Log API request/response
   */
  async logApiRequest(req, res, duration, error = null) {
    try {
      const sessionId = this.getOrCreateSession(req.ip, req.get('user-agent'));
      
      const requestLog = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        sessionId,
        userIP: req.ip,
        userAgent: req.get('user-agent'),
        
        // Request Details
        method: req.method,
        endpoint: req.path,
        requestBody: this.sanitizeRequestBody(req.body),
        requestHeaders: this.sanitizeHeaders(req.headers),
        
        // Response Details
        statusCode: res.statusCode,
        responseBody: this.sanitizeResponseBody(res.locals.responseData),
        responseHeaders: this.sanitizeHeaders(res.getHeaders()),
        
        // Performance
        duration,
        
        // Error Details
        errorOccurred: !!error,
        errorMessage: error?.message,
        errorStack: error?.stack
      };
      
      const record = await this.db.create('ApiRequestLog', requestLog);
      console.log(`📝 API request logged: ${req.method} ${req.path} - ${res.statusCode}`);
      return record;
    } catch (logError) {
      console.error('❌ Failed to log API request:', logError);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Log system events
   */
  async logSystemEvent(eventType, component, level, message, details = {}) {
    try {
      const event = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType,
        component,
        level,
        message,
        details,
        environment: config.serverConfig.nodeEnv,
        version: process.env.APP_VERSION || '1.0.0'
      };
      
      const record = await this.db.create('SystemEventLog', event);
      console.log(`📋 System event logged: ${eventType} - ${level}`);
      return record;
    } catch (error) {
      console.error('❌ Failed to log system event:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Start performance timer
   */
  startTimer(operationId) {
    this.performanceTimer.set(operationId, {
      start: process.hrtime.bigint(),
      checkpoints: []
    });
  }

  /**
   * Add checkpoint to performance timer
   */
  addTimerCheckpoint(operationId, label) {
    const timer = this.performanceTimer.get(operationId);
    if (timer) {
      timer.checkpoints.push({
        label,
        time: process.hrtime.bigint()
      });
    }
  }

  /**
   * End performance timer and get results
   */
  endTimer(operationId) {
    const timer = this.performanceTimer.get(operationId);
    if (!timer) return null;
    
    const end = process.hrtime.bigint();
    const totalDuration = Number(end - timer.start) / 1000000; // Convert to milliseconds
    
    const checkpoints = {};
    let lastTime = timer.start;
    
    for (const checkpoint of timer.checkpoints) {
      const duration = Number(checkpoint.time - lastTime) / 1000000;
      checkpoints[checkpoint.label] = duration;
      lastTime = checkpoint.time;
    }
    
    this.performanceTimer.delete(operationId);
    
    return {
      totalDuration,
      checkpoints
    };
  }

  /**
   * Get or create user session
   */
  getOrCreateSession(userIP, userAgent) {
    const sessionKey = `${userIP}-${userAgent}`;
    
    if (this.sessionCache.has(sessionKey)) {
      return this.sessionCache.get(sessionKey);
    }
    
    const sessionId = uuidv4();
    this.sessionCache.set(sessionKey, sessionId);
    
    // Create session record (async, don't wait)
    this.createSessionRecord(sessionId, userIP, userAgent).catch(error => {
      console.error('❌ Failed to create session record:', error);
    });
    
    return sessionId;
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      if (!this.isInitialized) {
        throw new Error('Database service not initialized');
      }
      
      const dbStats = await this.db.getStats();
      
      return {
        ...dbStats,
        serviceName: 'DatabaseService',
        isInitialized: this.isInitialized,
        sessionCacheSize: this.sessionCache.size,
        activeTimers: this.performanceTimer.size
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Query recent transactions
   */
  async getRecentTransactions(limit = 10) {
    try {
      return await this.db.find('ImageGenerationTransaction', {}, {
        sortBy: 'timestamp',
        sortOrder: 'desc',
        limit
      });
    } catch (error) {
      console.error('❌ Failed to get recent transactions:', error);
      throw error;
    }
  }

  /**
   * Get transactions by session
   */
  async getSessionTransactions(sessionId, limit = 50) {
    try {
      return await this.db.find('ImageGenerationTransaction', { sessionId }, {
        sortBy: 'timestamp',
        sortOrder: 'desc',
        limit
      });
    } catch (error) {
      console.error('❌ Failed to get session transactions:', error);
      throw error;
    }
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

  async updateSessionStats(sessionId, success) {
    try {
      const session = await this.db.findById('UserSession', sessionId);
      if (session) {
        const updates = {
          lastActivity: new Date().toISOString(),
          totalRequests: (session.totalRequests || 0) + 1
        };
        
        if (success) {
          updates.successfulGenerations = (session.successfulGenerations || 0) + 1;
          updates.totalImagesGenerated = (session.totalImagesGenerated || 0) + 1;
        } else {
          updates.failedGenerations = (session.failedGenerations || 0) + 1;
        }
        
        await this.db.update('UserSession', sessionId, updates);
      }
    } catch (error) {
      console.error('❌ Failed to update session stats:', error);
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