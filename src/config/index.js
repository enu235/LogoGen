require('dotenv').config();

/**
 * Configuration Service
 * Centralized configuration management with validation
 */
class ConfigService {
  constructor() {
    this.validateRequiredConfig();
    this.initializeConfig();
  }

  validateRequiredConfig() {
    if (!process.env.API_KEY) {
      console.error('ERROR: API_KEY environment variable is required');
      process.exit(1);
    }

    // Validate LLM configuration if enabled
    const llmEnabled = process.env.ENABLE_PROMPT_ENHANCEMENT === 'true';
    const useSharedKey = process.env.USE_SHARED_API_KEY === 'true';
    const llmKey = process.env.LLM_API_KEY;
    const isPlaceholder = !llmKey || llmKey.includes('your_') || llmKey === 'your_llm_api_key_here';

    if (llmEnabled && !useSharedKey && isPlaceholder) {
      console.error('ERROR: LLM_API_KEY is required when ENABLE_PROMPT_ENHANCEMENT=true');
      console.error('Either set LLM_API_KEY or set USE_SHARED_API_KEY=true to use the same API key');
      process.exit(1);
    }
  }

  initializeConfig() {
    // API Configuration
    this.api = {
      baseURL: process.env.API_BASE_URL || 'https://api.x.ai/v1',
      apiKey: process.env.API_KEY,
      modelName: process.env.MODEL_NAME || 'grok-vision-beta'
    };

    // Image Configuration
    this.image = {
      logoSize: parseInt(process.env.LOGO_SIZE) || 1024,
      iconSize: parseInt(process.env.ICON_SIZE) || 64,
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760
    };

    // LLM Configuration
    const llmKey = process.env.LLM_API_KEY;
    const isPlaceholder = !llmKey || llmKey.includes('your_') || llmKey === 'your_llm_api_key_here';
    
    this.llm = {
      enabled: process.env.ENABLE_PROMPT_ENHANCEMENT === 'true',
      baseURL: process.env.LLM_API_BASE_URL || process.env.API_BASE_URL || 'https://api.x.ai/v1',
      modelName: process.env.LLM_MODEL_NAME || 'grok-beta',
      useSharedKey: process.env.USE_SHARED_API_KEY === 'true'
    };

    // Set the API key with proper shared key handling
    if (this.llm.useSharedKey) {
      this.llm.apiKey = process.env.API_KEY;
    } else if (!isPlaceholder) {
      this.llm.apiKey = llmKey;
    } else {
      this.llm.apiKey = null;
    }

    // Server Configuration
    this.server = {
      port: process.env.PORT || 3000,
      nodeEnv: process.env.NODE_ENV || 'development'
    };

    // Directory Configuration
    this.directories = {
      generated: 'public/generated',
      generatedOriginal: 'public/generated/original',
      temp: 'temp'
    };

    // Database Configuration
    this.database = {
      enabled: process.env.ENABLE_DATABASE_LOGGING === 'true',
      type: process.env.DATABASE_TYPE || 'mock', // mock, postgresql, mongodb, cosmos
      logTransactions: process.env.LOG_TRANSACTIONS === 'true' || process.env.ENABLE_DATABASE_LOGGING === 'true',
      logApiRequests: process.env.LOG_API_REQUESTS === 'true' || process.env.ENABLE_DATABASE_LOGGING === 'true',
      logSystemEvents: process.env.LOG_SYSTEM_EVENTS === 'true' || process.env.ENABLE_DATABASE_LOGGING === 'true',
      connectionString: process.env.DATABASE_CONNECTION_STRING,
      retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS) || 3,
      retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY) || 1000,
      dataDirectory: process.env.DATABASE_DATA_DIR || 'data/database'
    };
  }

  // Getters for easy access
  get apiConfig() { return this.api; }
  get imageConfig() { return this.image; }
  get llmConfig() { return this.llm; }
  get serverConfig() { return this.server; }
  get directoryConfig() { return this.directories; }
  get databaseConfig() { return this.database; }

  // Helper methods
  isProduction() {
    return this.server.nodeEnv === 'production';
  }

  isDevelopment() {
    return this.server.nodeEnv === 'development';
  }

  logConfiguration() {
    console.log(`🚀 LogoGen server running on port ${this.server.port}`);
    console.log(`🔧 API Base URL: ${this.api.baseURL}`);
    console.log(`🤖 Model: ${this.api.modelName}`);
    console.log(`🔑 API Key configured: ${!!this.api.apiKey}`);
    console.log(`🧠 LLM Prompt Enhancement: Enabled: ${this.llm.enabled}`);
    if (this.llm.enabled) {
      console.log(`   LLM Base URL: ${this.llm.baseURL}`);
      console.log(`   LLM Model: ${this.llm.modelName}`);
      console.log(`   LLM API Key configured: ${!!this.llm.apiKey}`);
      console.log(`   Using shared API key: ${this.llm.useSharedKey}`);
    }
    console.log(`💾 Database Logging: ${this.database.enabled ? 'Enabled' : 'Disabled'}`);
    if (this.database.enabled) {
      console.log(`   Database Type: ${this.database.type}`);
      console.log(`   Log Transactions: ${this.database.logTransactions}`);
      console.log(`   Log API Requests: ${this.database.logApiRequests}`);
      console.log(`   Log System Events: ${this.database.logSystemEvents}`);
      if (this.database.type === 'mock') {
        console.log(`   Data Directory: ${this.database.dataDirectory}`);
      }
    }
  }
}

// Export singleton instance
const configService = new ConfigService();
module.exports = configService; 