const express = require('express');
const path = require('path');
const config = require('../config');
const fileService = require('../services/fileService');
const imageGenerationService = require('../services/imageGenerationService');
const imageProcessingService = require('../services/imageProcessingService');
const promptEnhancementService = require('../services/promptEnhancementService');
const databaseService = require('../services/databaseService');

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
    
    // Start performance timer
    databaseService.startTimer(operationId);
    
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
    
    // Enhance prompt if requested and available
    let enhancedPrompt = originalPrompt;
    const shouldEnhance = promptEnhancementService.isEnhancementEnabled() && 
                         (enhancePromptFlag === undefined || enhancePromptFlag === true || enhancePromptFlag === 'true');
    
    if (shouldEnhance) {
      enhancedPrompt = await promptEnhancementService.enhancePrompt(originalPrompt, imageType);
      databaseService.addTimerCheckpoint(operationId, 'prompt_enhancement');
    }
    
    requestData.enhancedPrompt = enhancedPrompt;
    
    // Create final prompt with styling
    const finalPrompt = imageGenerationService.createFinalPrompt(enhancedPrompt, imageType);
    requestData.finalPrompt = finalPrompt;
    
    // Generate image
    const imageUrl = await imageGenerationService.generateImage(finalPrompt, imageType);
    databaseService.addTimerCheckpoint(operationId, 'image_generation');
    
    // Process and save image
    const processedImage = await imageProcessingService.downloadAndProcessImage(imageUrl, imageType, originalPrompt);
    databaseService.addTimerCheckpoint(operationId, 'image_processing');
    
    // Get performance data
    const performanceData = databaseService.endTimer(operationId);
    
    // Prepare response data for logging
    const responseData = {
      imageUrl,
      processedFilename: processedImage.filename,
      originalFilename: processedImage.originalFilename,
      processedFilePath: processedImage.path,
      originalFilePath: processedImage.originalPath,
      fileSize: processedImage.size,
      dimensions: processedImage.dimensions
    };
    
    // Log successful transaction
    await databaseService.logImageGeneration(
      requestData,
      responseData,
      {
        totalDuration: performanceData.totalDuration,
        promptEnhancementDuration: performanceData.checkpoints.prompt_enhancement || 0,
        imageGenerationDuration: performanceData.checkpoints.image_generation || 0,
        imageProcessingDuration: performanceData.checkpoints.image_processing || 0
      }
    );
    
    // Send response
    const responsePayload = {
      success: true,
      data: {
        ...processedImage,
        originalPrompt,
        enhancedPrompt: promptEnhancementService.isEnhancementEnabled() ? enhancedPrompt : null,
        finalPrompt,
        imageType,
        generatedAt: new Date().toISOString(),
        performanceMs: Math.round(performanceData.totalDuration)
      }
    };
    
    res.json(responsePayload);
    
    console.log(`✅ Image generation completed successfully: ${processedImage.filename} (${Math.round(performanceData.totalDuration)}ms)`);
    
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    
    // Get performance data (if available)
    const performanceData = databaseService.endTimer(operationId) || { totalDuration: 0 };
    
    // Log failed transaction
    try {
      const requestData = {
        originalPrompt: req.body.prompt,
        imageType: req.body.imageType || 'logo',
        enhancePromptRequested: req.body.enhancePrompt !== false,
        userIP: req.ip,
        userAgent: req.get('user-agent'),
        enhancedPrompt: null,
        finalPrompt: null
      };
      
      await databaseService.logImageGeneration(
        requestData,
        null,
        {
          totalDuration: performanceData.totalDuration,
          promptEnhancementDuration: 0,
          imageGenerationDuration: 0,
          imageProcessingDuration: 0
        },
        { message: error.message }
      );
    } catch (logError) {
      console.error('❌ Failed to log failed transaction:', logError);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate image'
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/api/health', async (req, res) => {
  try {
    const directories = await fileService.checkDirectories();
    const dbStats = await databaseService.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      config: {
        apiBaseUrl: config.apiConfig.baseURL,
        modelName: config.apiConfig.modelName,
        hasApiKey: !!config.apiConfig.apiKey,
        logoSize: config.imageConfig.logoSize,
        iconSize: config.imageConfig.iconSize,
        llmEnhancement: {
          enabled: config.llmConfig.enabled,
          llmBaseUrl: config.llmConfig.baseURL,
          llmModel: config.llmConfig.modelName,
          hasLlmApiKey: !!config.llmConfig.apiKey,
          usingSharedKey: config.llmConfig.useSharedKey,
          available: promptEnhancementService.isEnhancementEnabled()
        },
        imageProcessing: imageProcessingService.getProcessingConfig(),
        database: {
          isConnected: dbStats.isInitialized,
          totalRecords: dbStats.totalRecords,
          modelsCount: Object.keys(dbStats.models || {}).length
        }
      },
      directories
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
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