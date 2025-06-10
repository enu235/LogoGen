/**
 * Database Models
 * Defines the structure for all logged data
 */

/**
 * Image Generation Transaction Model
 */
const ImageGenerationTransaction = {
  id: 'string',                    // Unique transaction ID
  timestamp: 'datetime',           // When the transaction occurred
  sessionId: 'string',             // User session identifier
  userIP: 'string',                // User IP address (optional)
  userAgent: 'string',             // User agent string (optional)
  
  // Request Data
  originalPrompt: 'string',        // User's original prompt
  enhancedPrompt: 'string',        // AI-enhanced prompt (if used)
  finalPrompt: 'string',           // Final prompt sent to AI
  imageType: 'string',             // 'logo' or 'icon'
  enhancePromptRequested: 'boolean', // Whether enhancement was requested
  
  // Response Data
  success: 'boolean',              // Whether generation succeeded
  errorMessage: 'string',          // Error message if failed
  imageUrl: 'string',              // Generated image URL from AI
  processedFilename: 'string',     // Processed image filename
  originalFilename: 'string',      // Original image filename
  processedFilePath: 'string',     // Path to processed image
  originalFilePath: 'string',      // Path to original image
  fileSize: 'number',              // Processed file size in bytes
  dimensions: 'object',            // Image dimensions {width, height}
  
  // Performance Metrics
  totalDuration: 'number',         // Total time in milliseconds
  promptEnhancementDuration: 'number', // Time for prompt enhancement
  imageGenerationDuration: 'number',  // Time for AI generation
  imageProcessingDuration: 'number',  // Time for image processing
  
  // API Details
  apiModel: 'string',              // AI model used
  apiBaseUrl: 'string',            // API endpoint used
  llmModel: 'string',              // LLM model for enhancement
  
  // Status
  status: 'string',                // 'pending', 'completed', 'failed'
  createdAt: 'datetime',
  updatedAt: 'datetime'
};

/**
 * API Request Log Model
 */
const ApiRequestLog = {
  id: 'string',
  timestamp: 'datetime',
  sessionId: 'string',
  userIP: 'string',
  userAgent: 'string',
  
  // Request Details
  method: 'string',                // HTTP method
  endpoint: 'string',              // API endpoint
  requestBody: 'object',           // Request payload
  requestHeaders: 'object',        // Request headers (sanitized)
  
  // Response Details
  statusCode: 'number',            // HTTP status code
  responseBody: 'object',          // Response payload
  responseHeaders: 'object',       // Response headers
  
  // Performance
  duration: 'number',              // Request duration in milliseconds
  
  // Error Details
  errorOccurred: 'boolean',
  errorMessage: 'string',
  errorStack: 'string',
  
  createdAt: 'datetime'
};

/**
 * System Event Log Model
 */
const SystemEventLog = {
  id: 'string',
  timestamp: 'datetime',
  
  // Event Details
  eventType: 'string',             // 'startup', 'shutdown', 'error', 'config_change', etc.
  component: 'string',             // Which service/component
  level: 'string',                 // 'info', 'warn', 'error', 'debug'
  message: 'string',               // Event message
  details: 'object',               // Additional event data
  
  // Context
  environment: 'string',           // 'development', 'production'
  version: 'string',               // Application version
  
  createdAt: 'datetime'
};

/**
 * User Session Model
 */
const UserSession = {
  id: 'string',                    // Session ID
  userIP: 'string',
  userAgent: 'string',
  
  // Session Data
  startTime: 'datetime',
  lastActivity: 'datetime',
  endTime: 'datetime',
  
  // Activity Metrics
  totalRequests: 'number',
  successfulGenerations: 'number',
  failedGenerations: 'number',
  totalImagesGenerated: 'number',
  
  // Geographic/Technical Info
  country: 'string',               // Optional: from IP geolocation
  browser: 'string',               // Parsed from user agent
  os: 'string',                    // Parsed from user agent
  
  createdAt: 'datetime',
  updatedAt: 'datetime'
};

/**
 * Performance Metrics Model
 */
const PerformanceMetrics = {
  id: 'string',
  timestamp: 'datetime',
  
  // System Metrics
  memoryUsage: 'object',           // Memory usage stats
  cpuUsage: 'number',              // CPU usage percentage
  diskUsage: 'object',             // Disk usage stats
  
  // Application Metrics
  activeConnections: 'number',
  requestsPerMinute: 'number',
  averageResponseTime: 'number',
  errorRate: 'number',
  
  // Business Metrics
  totalGenerations: 'number',
  successRate: 'number',
  mostPopularImageType: 'string',
  averagePromptLength: 'number',
  
  createdAt: 'datetime'
};

/**
 * Configuration Change Log Model
 */
const ConfigurationChangeLog = {
  id: 'string',
  timestamp: 'datetime',
  
  // Change Details
  configKey: 'string',             // Which configuration changed
  oldValue: 'string',              // Previous value
  newValue: 'string',              // New value
  changeReason: 'string',          // Why it was changed
  
  // Source
  changedBy: 'string',             // System, admin, etc.
  source: 'string',                // Environment variable, admin panel, etc.
  
  createdAt: 'datetime'
};

module.exports = {
  ImageGenerationTransaction,
  ApiRequestLog,
  SystemEventLog,
  UserSession,
  PerformanceMetrics,
  ConfigurationChangeLog,
  
  // Helper function to get all model names
  getModelNames() {
    return [
      'ImageGenerationTransaction',
      'ApiRequestLog', 
      'SystemEventLog',
      'UserSession',
      'PerformanceMetrics',
      'ConfigurationChangeLog'
    ];
  },
  
  // Helper function to get model by name
  getModel(name) {
    return this[name];
  }
}; 