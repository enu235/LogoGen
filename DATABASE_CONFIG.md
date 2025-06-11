# Database Configuration Guide

LogoGen now supports optional database logging for comprehensive analytics and monitoring. This feature can be enabled or disabled via environment variables.

## Quick Setup

### Enable Database Logging
To enable all database logging features:
```bash
ENABLE_DATABASE_LOGGING=true
```

### Disable Database Logging
To disable all database logging (default):
```bash
ENABLE_DATABASE_LOGGING=false
```

## Configuration Options

### Main Control
- `ENABLE_DATABASE_LOGGING`: Master switch for all database functionality (default: `false`)

### Granular Control
You can enable specific types of logging while keeping others disabled:

- `LOG_TRANSACTIONS`: Log image generation transactions (default: inherits from `ENABLE_DATABASE_LOGGING`)
- `LOG_API_REQUESTS`: Log all HTTP API requests/responses (default: inherits from `ENABLE_DATABASE_LOGGING`)
- `LOG_SYSTEM_EVENTS`: Log application events and errors (default: inherits from `ENABLE_DATABASE_LOGGING`)

### Database Type
- `DATABASE_TYPE`: Choose database implementation (default: `mock`)
  - `mock`: JSON file-based storage (no setup required)
  - `postgresql`: PostgreSQL database
  - `mongodb`: MongoDB database
  - `cosmos`: Azure Cosmos DB

### Connection Settings
- `DATABASE_CONNECTION_STRING`: Connection string for external databases
- `DATABASE_RETRY_ATTEMPTS`: Number of retry attempts for database operations (default: `3`)
- `DATABASE_RETRY_DELAY`: Delay between retries in milliseconds (default: `1000`)
- `DATABASE_DATA_DIR`: Directory for mock database files (default: `data/database`)

## Examples

### Development - No Logging
```bash
ENABLE_DATABASE_LOGGING=false
```

### Development - Full Logging with Mock Database
```bash
ENABLE_DATABASE_LOGGING=true
DATABASE_TYPE=mock
DATABASE_DATA_DIR=data/database
```

### Production - Only Transaction Logging
```bash
ENABLE_DATABASE_LOGGING=false
LOG_TRANSACTIONS=true
DATABASE_TYPE=postgresql
DATABASE_CONNECTION_STRING=postgresql://user:pass@localhost:5432/logogen
```

### Production - Full Logging with PostgreSQL
```bash
ENABLE_DATABASE_LOGGING=true
DATABASE_TYPE=postgresql
DATABASE_CONNECTION_STRING=postgresql://user:pass@localhost:5432/logogen
```

## What Gets Logged

### Image Generation Transactions (`LOG_TRANSACTIONS=true`)
- User prompts (original, enhanced, final)
- Generated image details and file paths
- Performance metrics and timing
- Success/failure status
- API model and configuration used

### API Requests (`LOG_API_REQUESTS=true`)
- HTTP method, endpoint, and status codes
- Request/response timing
- User IP and user agent
- Error details if requests fail

### System Events (`LOG_SYSTEM_EVENTS=true`)
- Application startup/shutdown
- Service initialization
- Error conditions and stack traces
- Performance milestones

## Benefits

- **Analytics**: Track usage patterns and success rates
- **Performance Monitoring**: Identify bottlenecks and optimization opportunities
- **Debugging**: Comprehensive error tracking with context
- **Audit Trail**: Complete history of all operations
- **Compliance**: Regulatory requirements for data access logs

## Performance Impact

When disabled (`ENABLE_DATABASE_LOGGING=false`):
- **Zero performance impact** - all database operations are skipped
- **No additional dependencies** - database service remains inactive
- **No storage usage** - no data files or connections created

When enabled:
- **Minimal performance impact** - asynchronous logging operations
- **Configurable storage** - choose appropriate database for your scale
- **Graceful degradation** - logging failures don't affect main functionality 