# LogoGen - Modular Architecture

This directory contains the modular architecture implementation of LogoGen, breaking down the monolithic `server.js` into separate, focused services.

## Architecture Overview

```
src/
├── app.js                           # Express application setup
├── config/                          # Configuration management
│   └── index.js                    # Centralized config with validation
├── services/                        # Business logic services
│   ├── fileService.js              # File operations & directory management
│   ├── imageGenerationService.js   # AI image generation API calls
│   ├── imageProcessingService.js   # Image download, processing & saving
│   ├── promptEnhancementService.js # LLM-based prompt enhancement
│   └── index.js                    # Service exports
├── routes/                          # HTTP routes and controllers
│   └── apiRoutes.js                # API endpoint definitions
└── README.md                       # This file
```

## Service Responsibilities

### 🔧 Configuration Service (`config/index.js`)
- **Purpose**: Centralized configuration management
- **Responsibilities**:
  - Environment variable validation
  - Configuration object creation
  - Default value handling
  - Configuration logging
- **Key Features**:
  - Validates required environment variables on startup
  - Provides typed configuration objects
  - Handles LLM configuration complexities
  - Supports development/production modes

### 📁 File Service (`services/fileService.js`)
- **Purpose**: File system operations and management
- **Responsibilities**:
  - Directory creation and validation
  - File saving operations
  - Filename generation and sanitization
  - Image listing and metadata
- **Key Features**:
  - Safe filename generation from prompts
  - Recursive directory creation
  - File existence checking
  - Image metadata extraction

### 🎨 Image Generation Service (`services/imageGenerationService.js`)
- **Purpose**: AI image generation API integration
- **Responsibilities**:
  - API calls to image generation service
  - Request formatting and validation
  - Error handling and retry logic
  - Response processing
- **Key Features**:
  - Configurable API endpoints
  - Comprehensive error handling
  - Request logging and monitoring
  - Image type validation

### 🖼️ Image Processing Service (`services/imageProcessingService.js`)
- **Purpose**: Image download, processing, and optimization
- **Responsibilities**:
  - Image download from URLs
  - Image resizing and optimization
  - Format conversion (PNG)
  - Quality and compression settings
- **Key Features**:
  - Smart resizing (logos vs icons)
  - Image validation
  - Memory-efficient processing
  - Configurable quality settings

### 🧠 Prompt Enhancement Service (`services/promptEnhancementService.js`)
- **Purpose**: LLM-based prompt enhancement
- **Responsibilities**:
  - LLM API integration
  - Prompt template management
  - Enhancement quality validation
  - Fallback handling
- **Key Features**:
  - Template-based enhancement
  - Quality checks on enhanced prompts
  - Graceful fallback to original prompts
  - Configurable enhancement settings

### 🌐 Application (`app.js`)
- **Purpose**: Express application setup and coordination
- **Responsibilities**:
  - Middleware configuration
  - Route setup
  - Error handling
  - Server lifecycle management
- **Key Features**:
  - Security middleware setup
  - Graceful startup and shutdown
  - Development/production configuration
  - Comprehensive error handling

### 🛣️ API Routes (`routes/apiRoutes.js`)
- **Purpose**: HTTP route definitions and controllers
- **Responsibilities**:
  - Route definitions
  - Request validation
  - Service orchestration
  - Response formatting
- **Key Features**:
  - RESTful API design
  - Input validation
  - Error response formatting
  - Service integration

## Benefits of Modular Architecture

### 🎯 **Separation of Concerns**
Each service has a single, well-defined responsibility, making the code easier to understand and maintain.

### 🔧 **Testability**
Services can be tested independently with mocked dependencies, enabling comprehensive unit testing.

### 📈 **Scalability**
Individual services can be optimized, cached, or even moved to separate processes/containers as needed.

### 🛠️ **Maintainability**
Changes to one service don't affect others, reducing the risk of introducing bugs.

### 🔄 **Reusability**
Services can be reused across different parts of the application or even in different applications.

### 🚀 **Development Velocity**
Multiple developers can work on different services simultaneously without conflicts.

## Usage Examples

### Import Individual Services
```javascript
const fileService = require('./services/fileService');
const imageGenerationService = require('./services/imageGenerationService');

// Use services
await fileService.createDirectories();
const imageUrl = await imageGenerationService.generateImage(prompt, 'logo');
```

### Import All Services
```javascript
const { 
  config, 
  fileService, 
  imageGenerationService 
} = require('./services');

// Use configuration
console.log(config.apiConfig.baseURL);
```

### Service Composition
```javascript
// In routes/apiRoutes.js
const enhancedPrompt = await promptEnhancementService.enhancePrompt(prompt, imageType);
const finalPrompt = imageGenerationService.createFinalPrompt(enhancedPrompt, imageType);
const imageUrl = await imageGenerationService.generateImage(finalPrompt, imageType);
const result = await imageProcessingService.downloadAndProcessImage(imageUrl, imageType, prompt);
```

## Error Handling Strategy

### Service-Level Error Handling
- Each service handles its own errors and provides meaningful error messages
- Services throw errors with context for upstream handling
- Fallback mechanisms where appropriate (e.g., prompt enhancement)

### Application-Level Error Handling
- Global error handlers in `app.js`
- Consistent error response format
- Production vs development error details

### Route-Level Error Handling
- Input validation and sanitization
- Service error catching and response formatting
- HTTP status code mapping

## Configuration Management

### Environment Variables
All configuration is centralized in `config/index.js`:
- API keys and endpoints
- Image processing settings
- LLM configuration
- Server settings

### Validation
- Required variables are validated on startup
- Type conversion and defaults
- Complex configuration logic (shared API keys)

### Access Patterns
```javascript
const config = require('./config');

// Typed access
const apiKey = config.apiConfig.apiKey;
const logoSize = config.imageConfig.logoSize;

// Helper methods
if (config.isDevelopment()) {
  // Development-only code
}
```

## Testing Strategy

### Unit Testing
- Each service can be tested independently
- Mock external dependencies (APIs, file system)
- Test error conditions and edge cases

### Integration Testing
- Test service interactions
- Database and file system integration
- API endpoint testing

### Example Test Structure
```javascript
// tests/services/fileService.test.js
const fileService = require('../../src/services/fileService');

describe('FileService', () => {
  describe('generateSafeFilename', () => {
    it('should sanitize special characters', () => {
      const result = fileService.generateSafeFilename('test/image!', 'logo', 123456);
      expect(result).toBe('logo_test_image_123456.png');
    });
  });
});
```

## Migration Notes

### From Monolithic `server.js`
The original 418-line `server.js` has been broken down as follows:
- Configuration → `config/index.js`
- File operations → `services/fileService.js`
- Image generation → `services/imageGenerationService.js`
- Image processing → `services/imageProcessingService.js`
- Prompt enhancement → `services/promptEnhancementService.js`
- Routes → `routes/apiRoutes.js`
- App setup → `app.js`
- Entry point → `server.js` (simplified)

### Backwards Compatibility
- All existing API endpoints work identically
- Environment variables remain the same
- Docker configuration unchanged
- Frontend compatibility maintained

## Future Enhancements

### Potential Service Additions
- **CacheService**: Implement intelligent caching
- **AnalyticsService**: Track usage and performance
- **QueueService**: Background job processing
- **ValidationService**: Centralized input validation
- **LoggingService**: Structured logging and monitoring

### Service Improvements
- **Database Integration**: Add persistence layer
- **Rate Limiting**: Implement request throttling
- **Circuit Breakers**: Add resilience patterns
- **Health Checks**: Detailed service health monitoring

This modular architecture provides a solid foundation for scaling LogoGen while maintaining code quality and developer productivity. 