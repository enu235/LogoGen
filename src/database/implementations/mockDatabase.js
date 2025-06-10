const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Mock Database Implementation
 * 
 * This is an example implementation using JSON files for persistence.
 * It demonstrates the interface that real database implementations should follow.
 * 
 * Easy to replace with:
 * - SQL databases (PostgreSQL, MySQL, SQLite)
 * - NoSQL databases (MongoDB, Cosmos DB, DynamoDB)
 * - Cloud databases (Firebase, Supabase)
 */
class MockDatabase {
  constructor(options = {}) {
    this.dataDir = options.dataDir || 'data/database';
    this.isConnected = false;
    this.connectionOptions = options;
    
    // In-memory cache for better performance
    this.cache = new Map();
    this.cacheEnabled = options.enableCache !== false;
    this.maxCacheSize = options.maxCacheSize || 1000;
    
    console.log('🗄️ MockDatabase initialized with data directory:', this.dataDir);
  }

  /**
   * Connect to the database
   * In real implementations, this would establish connection to actual database
   */
  async connect() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Create subdirectories for each model
      const models = [
        'ImageGenerationTransaction',
        'ApiRequestLog',
        'SystemEventLog', 
        'UserSession',
        'PerformanceMetrics',
        'ConfigurationChangeLog'
      ];
      
      for (const model of models) {
        await fs.mkdir(path.join(this.dataDir, model), { recursive: true });
      }
      
      this.isConnected = true;
      console.log('✅ MockDatabase connected successfully');
      
      // Log connection event
      await this.logSystemEvent('database_connect', 'MockDatabase', 'info', 'Database connection established', {
        dataDir: this.dataDir,
        cacheEnabled: this.cacheEnabled
      });
      
      return true;
    } catch (error) {
      console.error('❌ MockDatabase connection failed:', error);
      throw new Error(`Failed to connect to MockDatabase: ${error.message}`);
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect() {
    try {
      if (this.isConnected) {
        // Log disconnection event
        await this.logSystemEvent('database_disconnect', 'MockDatabase', 'info', 'Database connection closed');
        
        // Clear cache
        this.cache.clear();
        this.isConnected = false;
        
        console.log('✅ MockDatabase disconnected successfully');
      }
      return true;
    } catch (error) {
      console.error('❌ MockDatabase disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  isConnectedToDatabase() {
    return this.isConnected;
  }

  /**
   * Generic create method
   */
  async create(model, data) {
    this.validateConnection();
    
    try {
      const id = data.id || uuidv4();
      const timestamp = new Date().toISOString();
      
      const record = {
        ...data,
        id,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      const filePath = path.join(this.dataDir, model, `${id}.json`);
      await fs.writeFile(filePath, JSON.stringify(record, null, 2));
      
      // Update cache
      if (this.cacheEnabled) {
        this.updateCache(`${model}:${id}`, record);
      }
      
      console.log(`📝 Created ${model} record:`, id);
      return record;
    } catch (error) {
      console.error(`❌ Failed to create ${model} record:`, error);
      throw error;
    }
  }

  /**
   * Generic read method
   */
  async findById(model, id) {
    this.validateConnection();
    
    try {
      // Check cache first
      if (this.cacheEnabled) {
        const cached = this.cache.get(`${model}:${id}`);
        if (cached) {
          console.log(`💾 Retrieved ${model} from cache:`, id);
          return cached;
        }
      }
      
      const filePath = path.join(this.dataDir, model, `${id}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const record = JSON.parse(data);
      
      // Update cache
      if (this.cacheEnabled) {
        this.updateCache(`${model}:${id}`, record);
      }
      
      console.log(`📖 Retrieved ${model} record:`, id);
      return record;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // Record not found
      }
      console.error(`❌ Failed to find ${model} record:`, error);
      throw error;
    }
  }

  /**
   * Generic update method
   */
  async update(model, id, updates) {
    this.validateConnection();
    
    try {
      const existing = await this.findById(model, id);
      if (!existing) {
        throw new Error(`${model} record with id ${id} not found`);
      }
      
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      const filePath = path.join(this.dataDir, model, `${id}.json`);
      await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
      
      // Update cache
      if (this.cacheEnabled) {
        this.updateCache(`${model}:${id}`, updated);
      }
      
      console.log(`✏️ Updated ${model} record:`, id);
      return updated;
    } catch (error) {
      console.error(`❌ Failed to update ${model} record:`, error);
      throw error;
    }
  }

  /**
   * Generic delete method
   */
  async delete(model, id) {
    this.validateConnection();
    
    try {
      const filePath = path.join(this.dataDir, model, `${id}.json`);
      await fs.unlink(filePath);
      
      // Remove from cache
      if (this.cacheEnabled) {
        this.cache.delete(`${model}:${id}`);
      }
      
      console.log(`🗑️ Deleted ${model} record:`, id);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false; // Record not found
      }
      console.error(`❌ Failed to delete ${model} record:`, error);
      throw error;
    }
  }

  /**
   * Find records with basic filtering
   */
  async find(model, filter = {}, options = {}) {
    this.validateConnection();
    
    try {
      const modelDir = path.join(this.dataDir, model);
      const files = await fs.readdir(modelDir);
      const records = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(modelDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          const record = JSON.parse(data);
          
          // Apply basic filter
          if (this.matchesFilter(record, filter)) {
            records.push(record);
          }
        }
      }
      
      // Apply sorting
      if (options.sortBy) {
        records.sort((a, b) => {
          const aVal = a[options.sortBy];
          const bVal = b[options.sortBy];
          if (options.sortOrder === 'desc') {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }
      
      // Apply pagination
      let result = records;
      if (options.limit) {
        const offset = options.offset || 0;
        result = records.slice(offset, offset + options.limit);
      }
      
      console.log(`🔍 Found ${result.length} ${model} records (${records.length} total)`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to find ${model} records:`, error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    this.validateConnection();
    
    try {
      const stats = {
        models: {},
        totalRecords: 0,
        cacheSize: this.cache.size,
        dataDirectory: this.dataDir
      };
      
      const models = await fs.readdir(this.dataDir);
      
      for (const model of models) {
        const modelPath = path.join(this.dataDir, model);
        const stat = await fs.stat(modelPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(modelPath);
          const recordCount = files.filter(f => f.endsWith('.json')).length;
          
          stats.models[model] = {
            recordCount,
            lastModified: stat.mtime
          };
          stats.totalRecords += recordCount;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Utility method to log system events
   */
  async logSystemEvent(eventType, component, level, message, details = {}) {
    try {
      await this.create('SystemEventLog', {
        eventType,
        component,
        level,
        message,
        details,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Don't throw errors for logging failures
      console.error('❌ Failed to log system event:', error);
    }
  }

  // Private helper methods

  validateConnection() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  matchesFilter(record, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (record[key] !== value) {
        return false;
      }
    }
    return true;
  }

  updateCache(key, value) {
    if (!this.cacheEnabled) return;
    
    // Simple LRU: remove oldest if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }
}

module.exports = MockDatabase; 