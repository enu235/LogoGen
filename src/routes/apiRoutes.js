const express = require('express');
const path = require('path');
const config = require('../config');
const fileService = require('../services/fileService');
const imageGenerationService = require('../services/imageGenerationService');
const imageProcessingService = require('../services/imageProcessingService');
const promptEnhancementService = require('../services/promptEnhancementService');

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
  try {
    const { prompt, imageType = 'logo', enhancePrompt: enhancePromptFlag } = req.body;
    
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
    
    // Enhance prompt if requested and available
    let enhancedPrompt = originalPrompt;
    const shouldEnhance = promptEnhancementService.isEnhancementEnabled() && 
                         (enhancePromptFlag === undefined || enhancePromptFlag === true || enhancePromptFlag === 'true');
    
    if (shouldEnhance) {
      enhancedPrompt = await promptEnhancementService.enhancePrompt(originalPrompt, imageType);
    }
    
    // Create final prompt with styling
    const finalPrompt = imageGenerationService.createFinalPrompt(enhancedPrompt, imageType);
    
    // Generate image
    const imageUrl = await imageGenerationService.generateImage(finalPrompt, imageType);
    
    // Process and save image
    const processedImage = await imageProcessingService.downloadAndProcessImage(imageUrl, imageType, originalPrompt);
    
    // Send response
    res.json({
      success: true,
      data: {
        ...processedImage,
        originalPrompt,
        enhancedPrompt: promptEnhancementService.isEnhancementEnabled() ? enhancedPrompt : null,
        finalPrompt,
        imageType,
        generatedAt: new Date().toISOString()
      }
    });
    
    console.log(`✅ Image generation completed successfully: ${processedImage.filename}`);
    
  } catch (error) {
    console.error('❌ Image generation failed:', error);
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
        imageProcessing: imageProcessingService.getProcessingConfig()
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

module.exports = router; 