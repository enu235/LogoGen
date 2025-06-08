const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const fileService = require('./services/fileService');
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

    // Request logging in development
    if (config.isDevelopment()) {
      this.app.use((req, res, next) => {
        console.log(`📝 ${req.method} ${req.path} - ${new Date().toISOString()}`);
        next();
      });
    }
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
    this.app.use((error, req, res, next) => {
      console.error('💥 Unhandled error:', error);
      
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
   * Initialize application (setup directories, etc.)
   */
  async initialize() {
    try {
      // Create necessary directories
      await fileService.createDirectories();
      
      // Initialize prompt enhancement service
      const promptEnhancementService = require('./services/promptEnhancementService');
      await promptEnhancementService.initializeTemplates();
      
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
        console.log('\n✨ Ready to generate amazing logos and icons!\n');
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
    return new Promise((resolve) => {
      if (this.server) {
        console.log('🛑 Shutting down server gracefully...');
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