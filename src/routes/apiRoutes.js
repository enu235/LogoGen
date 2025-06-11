const express = require('express');
const path = require('path');
const config = require('../config');
const fileService = require('../services/fileService');
const imageGenerationService = require('../services/imageGenerationService');
const imageProcessingService = require('../services/imageProcessingService');
const promptEnhancementService = require('../services/promptEnhancementService');
const databaseService = require('../services/databaseService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * Home route - serve the main HTML page
 */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

/**
 * Generate image route
 */
router.post('/api/generate', async (req, res) => {
  const operationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { prompt, imageType = 'logo', enhancePrompt: enhancePromptFlag } = req.body;
    
    // Log system event for image generation start
    await databaseService.logSystemEvent('image_generation_start', {
      message: 'Starting image generation process',
      prompt: prompt,
      imageType,
      enhancePromptRequested: enhancePromptFlag !== false
    });
    
    // Start performance timer
    databaseService.startPerformanceTimer(operationId);
    
    // Validate input
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }
    
    if (!imageGenerationService.validateImageType(imageType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Image type must be either "logo" or "icon"' 
      });
    }

    const originalPrompt = prompt.trim();
    console.log(`🚀 Starting image generation process for ${imageType}: ${originalPrompt}`);
    
    // Prepare request data for logging
    const requestData = {
      originalPrompt,
      imageType,
      enhancePromptRequested: enhancePromptFlag !== false,
      userIP: req.ip,
      userAgent: req.get('user-agent')
    };
    
    let finalPrompt = prompt;
    let enhancedPrompt = null;
    
    // Enhance prompt if requested
    if (enhancePromptFlag !== false) {
      databaseService.addPerformanceCheckpoint(operationId, 'prompt_enhancement_start');
      
      try {
        enhancedPrompt = await promptEnhancementService.enhancePrompt(prompt, imageType);
        if (enhancedPrompt && enhancedPrompt !== prompt) {
          finalPrompt = enhancedPrompt;
        }
        databaseService.addPerformanceCheckpoint(operationId, 'prompt_enhancement_complete');
      } catch (error) {
        console.warn('Prompt enhancement failed, using original prompt:', error.message);
        databaseService.addPerformanceCheckpoint(operationId, 'prompt_enhancement_failed');
      }
    }
    
    requestData.enhancedPrompt = enhancedPrompt;
    requestData.finalPrompt = finalPrompt;
    
    // Generate image
    databaseService.addPerformanceCheckpoint(operationId, 'image_generation_start');
    const generatedImageUrl = await imageGenerationService.generateImage(finalPrompt, imageType);
    databaseService.addPerformanceCheckpoint(operationId, 'image_generation_complete');
    
    // Process image
    databaseService.addPerformanceCheckpoint(operationId, 'image_processing_start');
    const processedImage = await imageProcessingService.downloadAndProcessImage(generatedImageUrl, imageType, originalPrompt);
    databaseService.addPerformanceCheckpoint(operationId, 'image_processing_complete');
    
    // End performance timer and log
    const performanceData = databaseService.endPerformanceTimer(operationId, true);
    
    // Prepare response data for logging
    const responseData = {
      imageUrl: processedImage.imageUrl,
      processedFilename: processedImage.processedFilename,
      originalFilename: processedImage.originalFilename,
      processedFilePath: processedImage.processedFilePath,
      originalFilePath: processedImage.originalFilePath,
      fileSize: processedImage.fileSize,
      dimensions: processedImage.dimensions
    };
    
    // Log successful transaction
    await databaseService.logImageGeneration({
      operationId,
      userIP: req.ip,
      userAgent: req.get('user-agent'),
      originalPrompt: prompt,
      enhancedPrompt,
      finalPrompt,
      imageType,
      enhancePromptRequested: enhancePromptFlag !== false,
      success: true,
      imageUrl: processedImage.imageUrl,
      processedFilename: processedImage.processedFilename,
      originalFilename: processedImage.originalFilename,
      processedFilePath: processedImage.processedFilePath,
      originalFilePath: processedImage.originalFilePath,
      fileSize: processedImage.fileSize,
      dimensions: processedImage.dimensions,
      performance: performanceData,
      apiModel: config.apiConfig.modelName,
      apiBaseUrl: config.apiConfig.baseURL
    });
    
    // Send response
    res.json({
      success: true,
      imageUrl: processedImage.imageUrl,
      processedFilename: processedImage.processedFilename,
      originalFilename: processedImage.originalFilename,
      prompt: finalPrompt,
      originalPrompt: prompt,
      enhancedPrompt: enhancedPrompt,
      enhancePromptDetected: !!enhancedPrompt && enhancedPrompt !== prompt,
      imageType,
      fileSize: processedImage.fileSize,
      dimensions: processedImage.dimensions
    });
    
    console.log(`✅ Image generation completed successfully: ${processedImage.filename} (${Math.round(performanceData.totalDuration)}ms)`);
    
  } catch (error) {
    console.error('Error generating image:', error);

    // Log failed transaction
    await databaseService.logImageGeneration({
      operationId,
      userIP: req.ip,
      userAgent: req.get('user-agent'),
      originalPrompt: prompt,
      enhancedPrompt,
      finalPrompt,
      imageType,
      enhancePromptRequested: enhancePromptFlag !== false,
      success: false,
      errorMessage: error.message,
      performance: databaseService.endPerformanceTimer(operationId)
    });

    // Log system error event
    await databaseService.logSystemEvent('image_generation_error', {
      message: 'Image generation failed',
      prompt: prompt,
      imageType
    }, error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        imageGeneration: await imageGenerationService.healthCheck(),
        imageProcessing: await imageProcessingService.healthCheck(),
        promptEnhancement: await promptEnhancementService.healthCheck(),
        database: await databaseService.healthCheck()
      }
    };

    // Check if any service is unhealthy
    const allHealthy = Object.values(health.services).every(
      service => service.status === 'healthy' || service.status === 'disabled'
    );

    if (!allHealthy) {
      health.status = 'degraded';
      res.status(503);
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * List generated images endpoint
 */
router.get('/api/images', async (req, res) => {
  try {
    const images = await fileService.listGeneratedImages();
    
    res.json({
      success: true,
      count: images.length,
      images
    });
  } catch (error) {
    console.error('❌ Error listing images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list images'
    });
  }
});

/**
 * Get configuration endpoint (for frontend)
 */
router.get('/api/config', (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        imageTypes: ['logo', 'icon'],
        imageSizes: {
          logo: config.imageConfig.logoSize,
          icon: config.imageConfig.iconSize
        },
        maxFileSize: config.imageConfig.maxFileSize,
        promptEnhancement: promptEnhancementService.getEnhancementConfig(),
        supportedFormats: imageProcessingService.getSupportedFormats()
      }
    });
  } catch (error) {
    console.error('❌ Error getting configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

/**
 * Database statistics endpoint
 */
router.get('/api/stats', async (req, res) => {
  try {
    const stats = await databaseService.getStats();
    
    res.json({
      success: true,
      stats: {
        database: stats,
        summary: {
          totalRecords: stats.totalRecords,
          modelsWithData: Object.entries(stats.models || {})
            .filter(([, data]) => data.recordCount > 0)
            .map(([model, data]) => ({
              model,
              count: data.recordCount,
              lastModified: data.lastModified
            })),
          systemStatus: {
            isInitialized: stats.isInitialized,
            cacheSize: stats.cacheSize,
            activeTimers: stats.activeTimers
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database statistics'
    });
  }
});

/**
 * Recent transactions endpoint
 */
router.get('/api/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const transactions = await databaseService.getRecentTransactions(limit);
    
    res.json({
      success: true,
      count: transactions.length,
      transactions: transactions.map(t => ({
        id: t.id,
        timestamp: t.timestamp,
        imageType: t.imageType,
        originalPrompt: t.originalPrompt,
        success: t.success,
        totalDuration: t.totalDuration,
        fileSize: t.fileSize,
        errorMessage: t.errorMessage
      }))
    });
  } catch (error) {
    console.error('❌ Error getting recent transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent transactions'
    });
  }
});

/**
 * System events endpoint
 */
router.get('/api/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const level = req.query.level; // 'error', 'warn', 'info', 'debug'
    
    const filter = level ? { level } : {};
    const events = await databaseService.db.find('SystemEventLog', filter, {
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit
    });
    
    res.json({
      success: true,
      count: events.length,
      events: events.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        eventType: e.eventType,
        component: e.component,
        level: e.level,
        message: e.message,
        environment: e.environment
      }))
    });
  } catch (error) {
    console.error('❌ Error getting system events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system events'
    });
  }
});

module.exports = router; 