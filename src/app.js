const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const fileService = require('./services/fileService');
const databaseService = require('./services/databaseService');
const apiRoutes = require('./routes/apiRoutes');

/**
 * Express Application Setup
 * Configures middleware and routes
 */
class Application {
  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware
   */
  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
        },
      },
    }));

    // CORS
    this.app.use(cors());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files
    this.app.use(express.static('public'));

    // Request logging middleware
    this.app.use(this.requestLoggingMiddleware.bind(this));

    // Request logging in development
    if (config.isDevelopment()) {
      this.app.use((req, res, next) => {
        console.log(`📝 ${req.method} ${req.path} - ${new Date().toISOString()}`);
        next();
      });
    }
  }

  /**
   * Request logging middleware
   */
  requestLoggingMiddleware(req, res, next) {
    const startTime = process.hrtime.bigint();
    
    // Store response data for logging
    const originalSend = res.send;
    res.send = function(data) {
      res.locals.responseData = data;
      return originalSend.call(this, data);
    };

    // Log when response finishes
    res.on('finish', async () => {
      try {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        // Don't log static file requests or health checks in production
        if (config.isProduction() && (req.path.startsWith('/generated') || req.path === '/api/health')) {
          return;
        }
        
        await databaseService.logApiRequest(req, res, duration);
      } catch (error) {
        console.error('❌ Request logging failed:', error);
      }
    });

    next();
  }

  /**
   * Initialize routes
   */
  initializeRoutes() {
    this.app.use('/', apiRoutes);
  }

  /**
   * Initialize error handling
   */
  initializeErrorHandling() {
    // Global error handler
    this.app.use(async (error, req, res, next) => {
      console.error('💥 Unhandled error:', error);
      
      // Log error to database
      try {
        await databaseService.logSystemEvent('application_error', 'ExpressApp', 'error', error.message, {
          stack: error.stack,
          endpoint: req.path,
          method: req.method,
          userAgent: req.get('user-agent'),
          userIP: req.ip
        });
      } catch (logError) {
        console.error('❌ Failed to log error to database:', logError);
      }
      
      // Don't leak error details in production
      const errorMessage = config.isProduction() 
        ? 'Internal server error' 
        : error.message;
      
      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
      res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Initialize application (setup directories, database, etc.)
   */
  async initialize() {
    try {
      console.log('🔄 Initializing application...');
      
      // Create necessary directories
      await fileService.createDirectories();
      
      // Initialize database service
      try {
        await databaseService.initialize();
      } catch (error) {
        console.error('Failed to initialize database service:', error);
        // Continue without database logging
      }
      
      // Initialize prompt enhancement service
      const promptEnhancementService = require('./services/promptEnhancementService');
      try {
        await promptEnhancementService.initialize();
      } catch (error) {
        console.error('Failed to initialize prompt enhancement service:', error);
        // Continue without prompt enhancement
      }
      
      // Request logging middleware (only if database logging is enabled)
      if (config.databaseConfig.enabled && config.databaseConfig.logApiRequests) {
        this.app.use((req, res, next) => {
          const startTime = Date.now();
          
          // Capture response data
          const originalSend = res.send;
          res.send = function(data) {
            res.locals.responseData = data;
            return originalSend.call(this, data);
          };

          // Log request after response
          res.on('finish', async () => {
            const duration = Date.now() - startTime;
            await databaseService.logApiRequest({
              method: req.method,
              endpoint: req.path,
              userIP: req.ip,
              userAgent: req.get('user-agent'),
              statusCode: res.statusCode,
              duration,
              timestamp: new Date().toISOString()
            });
          });

          next();
        });
      }
      
      // Log application startup
      await databaseService.logSystemEvent('app_startup', 'Application', 'info', 'Application initialized successfully', {
        environment: config.serverConfig.nodeEnv,
        port: config.serverConfig.port,
        apiBaseUrl: config.apiConfig.baseURL,
        llmEnabled: config.llmConfig.enabled
      });
      
      console.log('✅ Application initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Initialize the application
      await this.initialize();
      
      // Start the server
      const port = config.serverConfig.port;
      this.server = this.app.listen(port, () => {
        console.log('\n🎉 LogoGen Server Started Successfully!\n');
        config.logConfiguration();
        console.log(`\n🌐 Server URL: http://localhost:${port}`);
        console.log('📋 API Endpoints:');
        console.log('   GET  /              - Web interface');
        console.log('   POST /api/generate  - Generate image');
        console.log('   GET  /api/health    - Health check');
        console.log('   GET  /api/images    - List images');
        console.log('   GET  /api/config    - Get configuration');
        console.log('   GET  /api/stats     - Database statistics');
        console.log('\n✨ Ready to generate amazing logos and icons!\n');
        
        // Log server start
        databaseService.logSystemEvent('server_start', 'Application', 'info', 'HTTP server started', {
          port,
          environment: config.serverConfig.nodeEnv
        }).catch(error => {
          console.error('❌ Failed to log server start:', error);
        });
      });

      return this.server;
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop the server gracefully
   */
  async stop() {
    return new Promise(async (resolve) => {
      if (this.server) {
        console.log('🛑 Shutting down server gracefully...');
        
        // Log shutdown
        try {
          await databaseService.logSystemEvent('server_shutdown', 'Application', 'info', 'HTTP server shutting down');
          await databaseService.shutdown();
        } catch (error) {
          console.error('❌ Failed to log shutdown or close database:', error);
        }
        
        this.server.close(() => {
          console.log('✅ Server shut down successfully');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the Express app instance
   */
  getApp() {
    return this.app;
  }
}

module.exports = Application; 