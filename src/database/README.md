# Database Infrastructure

This directory contains the database abstraction layer and implementations for LogoGen. The infrastructure is designed to be database-agnostic and easily swappable.

## Architecture Overview

```
src/database/
├── models/
│   └── index.js                    # Data models and schemas
├── implementations/
│   ├── mockDatabase.js            # JSON file-based implementation (current)
│   ├── postgresqlDatabase.js      # PostgreSQL implementation (future)
│   ├── mongodbDatabase.js         # MongoDB implementation (future)
│   └── cosmosdbDatabase.js        # Azure Cosmos DB implementation (future)
└── README.md                      # This file
```

## Current Implementation

### MockDatabase (JSON Files)
- **Purpose**: Development, testing, and demonstrations
- **Storage**: Local JSON files in `data/database/`
- **Features**: 
  - File-based persistence
  - In-memory caching
  - Basic querying and filtering
  - Automatic directory structure creation

## Data Models

### 📊 ImageGenerationTransaction
Logs every image generation request with complete details:
```javascript
{
  id: "uuid",
  timestamp: "2024-01-01T12:00:00.000Z",
  sessionId: "user-session-id",
  userIP: "127.0.0.1",
  userAgent: "Mozilla/5.0...",
  originalPrompt: "A modern tech logo",
  enhancedPrompt: "A modern tech logo with sleek design...",
  finalPrompt: "Professional logo design: A modern tech logo...",
  imageType: "logo",
  success: true,
  processedFilename: "logo_modern_tech_1234567890.png",
  fileSize: 156789,
  dimensions: { width: 1024, height: 1024 },
  totalDuration: 5432,
  apiModel: "grok-vision-beta"
}
```

### 📝 ApiRequestLog
Logs all HTTP requests for monitoring and debugging:
```javascript
{
  id: "uuid",
  timestamp: "2024-01-01T12:00:00.000Z",
  method: "POST",
  endpoint: "/api/generate",
  statusCode: 200,
  duration: 5432,
  userIP: "127.0.0.1",
  errorOccurred: false
}
```

### 📋 SystemEventLog
Logs system events, errors, and application lifecycle:
```javascript
{
  id: "uuid",
  timestamp: "2024-01-01T12:00:00.000Z",
  eventType: "app_startup",
  component: "Application",
  level: "info",
  message: "Application initialized successfully",
  environment: "production"
}
```

### 👤 UserSession
Tracks user sessions and activity metrics:
```javascript
{
  id: "uuid",
  userIP: "127.0.0.1",
  startTime: "2024-01-01T12:00:00.000Z",
  totalRequests: 5,
  successfulGenerations: 3,
  failedGenerations: 1
}
```

## Configuration

### Environment Variables

```bash
# Database type selection
DATABASE_TYPE=mock                    # 'mock', 'postgresql', 'mongodb', 'cosmosdb'

# Mock database configuration  
DATABASE_DATA_DIR=data/database       # Directory for JSON files
DATABASE_ENABLE_CACHE=true           # Enable in-memory caching
DATABASE_MAX_CACHE_SIZE=1000         # Maximum cache entries

# PostgreSQL configuration (future)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=logogen
DATABASE_USERNAME=logogen_user
DATABASE_PASSWORD=your_password

# MongoDB configuration (future)
DATABASE_CONNECTION_STRING=mongodb://localhost:27017/logogen

# Cosmos DB configuration (future)
DATABASE_CONNECTION_STRING=AccountEndpoint=https://...
DATABASE_NAME=logogen
```

## Usage Examples

### Basic Database Operations

```javascript
const databaseService = require('../services/databaseService');

// Initialize database
await databaseService.initialize();

// Log an image generation
await databaseService.logImageGeneration(requestData, responseData, performanceData);

// Get statistics
const stats = await databaseService.getStats();

// Query recent transactions
const transactions = await databaseService.getRecentTransactions(10);
```

### Performance Timing

```javascript
// Start timing an operation
const operationId = 'my-operation';
databaseService.startTimer(operationId);

// Add checkpoints
await someAsyncOperation();
databaseService.addTimerCheckpoint(operationId, 'step_1');

await anotherAsyncOperation();
databaseService.addTimerCheckpoint(operationId, 'step_2');

// Get timing results
const performance = databaseService.endTimer(operationId);
// Returns: { totalDuration: 1234, checkpoints: { step_1: 567, step_2: 890 } }
```

## API Endpoints

### Database Statistics
```bash
GET /api/stats
```
Returns comprehensive database statistics:
```json
{
  "success": true,
  "stats": {
    "database": {
      "totalRecords": 150,
      "models": {
        "ImageGenerationTransaction": { "recordCount": 45 },
        "ApiRequestLog": { "recordCount": 89 },
        "SystemEventLog": { "recordCount": 16 }
      }
    }
  }
}
```

### Recent Transactions
```bash
GET /api/transactions?limit=10
```

### System Events
```bash
GET /api/events?limit=20&level=error
```

## Future Database Implementations

### PostgreSQL Implementation
```javascript
// src/database/implementations/postgresqlDatabase.js
const { Pool } = require('pg');

class PostgreSQLDatabase {
  constructor(options) {
    this.pool = new Pool({
      host: options.host,
      port: options.port,
      database: options.database,
      user: options.username,
      password: options.password
    });
  }

  async connect() {
    await this.pool.connect();
    await this.createTables();
  }

  async create(model, data) {
    const query = `INSERT INTO ${model} (data) VALUES ($1) RETURNING *`;
    const result = await this.pool.query(query, [JSON.stringify(data)]);
    return result.rows[0];
  }

  // ... implement other methods
}
```

### MongoDB Implementation
```javascript
// src/database/implementations/mongodbDatabase.js
const { MongoClient } = require('mongodb');

class MongoDBDatabase {
  constructor(options) {
    this.connectionString = options.connectionString;
    this.databaseName = options.database;
  }

  async connect() {
    this.client = new MongoClient(this.connectionString);
    await this.client.connect();
    this.db = this.client.db(this.databaseName);
  }

  async create(model, data) {
    const collection = this.db.collection(model);
    const result = await collection.insertOne(data);
    return { ...data, _id: result.insertedId };
  }

  // ... implement other methods
}
```

### Cosmos DB Implementation
```javascript
// src/database/implementations/cosmosdbDatabase.js
const { CosmosClient } = require('@azure/cosmos');

class CosmosDBDatabase {
  constructor(options) {
    this.client = new CosmosClient(options.connectionString);
    this.databaseId = options.database;
  }

  async connect() {
    const { database } = await this.client.databases.createIfNotExists({
      id: this.databaseId
    });
    this.database = database;
  }

  async create(model, data) {
    const { container } = await this.database.containers.createIfNotExists({
      id: model
    });
    const { resource } = await container.items.create(data);
    return resource;
  }

  // ... implement other methods
}
```

## Migration Guide

### Switching Database Implementations

1. **Install required dependencies**:
   ```bash
   # For PostgreSQL
   npm install pg

   # For MongoDB
   npm install mongodb

   # For Cosmos DB
   npm install @azure/cosmos
   ```

2. **Update environment variables**:
   ```bash
   DATABASE_TYPE=postgresql
   DATABASE_HOST=your-postgres-host
   DATABASE_USERNAME=your-username
   DATABASE_PASSWORD=your-password
   ```

3. **Create implementation file**:
   - Follow the interface defined in `mockDatabase.js`
   - Implement all required methods: `connect`, `disconnect`, `create`, `findById`, `update`, `delete`, `find`

4. **Update service loader**:
   ```javascript
   // In src/services/databaseService.js
   loadDatabaseImplementation(dbType) {
     switch (dbType) {
       case 'postgresql':
         return require('../database/implementations/postgresqlDatabase');
       // ... other cases
     }
   }
   ```

### Data Migration

For migrating from MockDatabase to a real database:

```javascript
// Migration script example
const mockDb = new MockDatabase({ dataDir: 'data/database' });
const targetDb = new PostgreSQLDatabase(config);

await mockDb.connect();
await targetDb.connect();

// Migrate each model
for (const model of ['ImageGenerationTransaction', 'ApiRequestLog']) {
  const records = await mockDb.find(model);
  for (const record of records) {
    await targetDb.create(model, record);
  }
}
```

## Monitoring and Maintenance

### Health Checks
The database service provides health check information:
```bash
GET /api/health
```

### Performance Monitoring
- Query response times are logged
- Cache hit/miss ratios (for implementations that support it)
- Connection pool status
- Storage usage metrics

### Backup Strategies

#### MockDatabase
- Simple file copying: `cp -r data/database backup/`
- Version control: Include in git repository for development

#### PostgreSQL
- Use `pg_dump` for backups
- Set up automated backup schedules
- Consider point-in-time recovery

#### MongoDB
- Use `mongodump` for backups
- Replica sets for high availability
- Atlas automated backups

#### Cosmos DB
- Built-in automatic backups
- Point-in-time restore capabilities
- Cross-region replication

## Security Considerations

### Data Sanitization
- Sensitive headers are automatically stripped
- API keys and tokens are never logged
- User data is anonymized where possible

### Access Control
- Database credentials stored in environment variables
- Connection string encryption for cloud databases
- Principle of least privilege for database users

### Compliance
- GDPR considerations for user data
- Data retention policies
- Right to deletion implementation

This database infrastructure provides a solid foundation that can grow with your application while maintaining consistency and reliability. 