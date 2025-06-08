#!/usr/bin/env node

/**
 * LogoGen Server - AI Logo & Icon Generator
 * 
 * Entry point for the LogoGen application
 * Uses modular architecture with separate services
 */

const Application = require('./src/app');

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Graceful shutdown handling
 */
let application;

const gracefulShutdown = async (signal) => {
  console.log(`\n📟 Received ${signal}. Starting graceful shutdown...`);
  
  if (application) {
    try {
      await application.stop();
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  } else {
    process.exit(0);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Start the application
 */
async function startServer() {
  try {
    console.log('🚀 Starting LogoGen Server...\n');
    
    // Create and start the application
    application = new Application();
    await application.start();
    
  } catch (error) {
    console.error('❌ Failed to start LogoGen server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
