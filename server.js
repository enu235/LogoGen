require('dotenv').config();
const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;
const xml2js = require('xml2js');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Added 'unsafe-inline'
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Create necessary directories
const createDirectories = async () => {
  try {
    await fs.mkdir('public/generated', { recursive: true });
    await fs.mkdir('temp', { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
};

createDirectories();

// Configuration
const API_CONFIG = {
  baseURL: process.env.API_BASE_URL || 'https://api.x.ai/v1',
  apiKey: process.env.API_KEY,
  modelName: process.env.MODEL_NAME || 'grok-vision-beta'
};

const IMAGE_CONFIG = {
  logoSize: parseInt(process.env.LOGO_SIZE) || 1024,
  iconSize: parseInt(process.env.ICON_SIZE) || 64,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760
};

// LLM Configuration
const LLM_CONFIG = {
  enabled: process.env.ENABLE_PROMPT_ENHANCEMENT === 'true',
  baseURL: process.env.LLM_API_BASE_URL || process.env.API_BASE_URL || 'https://api.x.ai/v1',
  modelName: process.env.LLM_MODEL_NAME || 'grok-beta',
  useSharedKey: process.env.USE_SHARED_API_KEY === 'true'
};

// Set the API key with proper shared key handling
const llmKey = process.env.LLM_API_KEY;
const isPlaceholder = !llmKey || llmKey.includes('your_') || llmKey === 'your_llm_api_key_here';

if (LLM_CONFIG.useSharedKey) {
  LLM_CONFIG.apiKey = process.env.API_KEY;
} else if (!isPlaceholder) {
  LLM_CONFIG.apiKey = llmKey;
} else {
  LLM_CONFIG.apiKey = null;
}

// Validate required environment variables
if (!API_CONFIG.apiKey) {
  console.error('ERROR: API_KEY environment variable is required');
  process.exit(1);
}

if (LLM_CONFIG.enabled && !LLM_CONFIG.apiKey) {
  console.error('ERROR: LLM_API_KEY is required when ENABLE_PROMPT_ENHANCEMENT=true');
  console.error('Either set LLM_API_KEY or set USE_SHARED_API_KEY=true to use the same API key');
  process.exit(1);
}

let promptTemplates = {};

// Load prompt templates
const loadPromptTemplates = async () => {
  try {
    const jsonData = await fs.readFile('./prompt-templates.json', 'utf-8');
    promptTemplates = JSON.parse(jsonData);
    console.log('✅ Prompt templates loaded successfully:', Object.keys(promptTemplates));
  } catch (error) {
    console.error('❌ Failed to load prompt templates:', error);
    process.exit(1);
  }
};

// Call this function at server startup
loadPromptTemplates();

// Image generation function
const generateImage = async (prompt, imageType = 'logo') => {
  try {
    console.log(`Generating ${imageType} with prompt: ${prompt}`);
    
    const requestBody = {
      model: API_CONFIG.modelName,
      prompt: prompt,
      n: 1,
      response_format: 'url'
    };

    console.log('API Request:', {
      url: `${API_CONFIG.baseURL}/images/generations`,
      model: requestBody.model,
      prompt: requestBody.prompt
    });
    
    const response = await axios.post(
      `${API_CONFIG.baseURL}/images/generations`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      }
    );

    console.log('API Response status:', response.status);
    
    if (response.data && response.data.data && response.data.data[0]) {
      const imageUrl = response.data.data[0].url;
      console.log('Generated image URL:', imageUrl);
      return imageUrl;
    } else {
      console.error('Invalid API response format:', response.data);
      throw new Error('Invalid response format from image generation API');
    }
  } catch (error) {
    console.error('Image generation error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      throw new Error('Invalid API key. Please check your API_KEY in the .env file.');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.response?.status === 403) {
      throw new Error('Access forbidden. Please check your API permissions.');
    } else {
      throw new Error(`Failed to generate image: ${error.response?.data?.error?.message || error.message}`);
    }
  }
};

// Download and process image
const downloadAndProcessImage = async (imageUrl, imageType, originalPrompt) => {
  try {
    console.log(`Starting download from: ${imageUrl}`);
    
    // Download the image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 45000 // Increased timeout
    });

    console.log(`Download completed, size: ${response.data.byteLength} bytes`);
    
    const imageBuffer = Buffer.from(response.data);
    const timestamp = Date.now();
    const safePrompt = originalPrompt.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
    
    // Create original folder if it doesn't exist
    const originalDir = path.join('public', 'generated', 'original');
    await fs.mkdir(originalDir, { recursive: true });
    
    // Save original image
    const originalFilename = `${imageType}_${safePrompt}_${timestamp}_original.png`;
    const originalFilepath = path.join(originalDir, originalFilename);
    await fs.writeFile(originalFilepath, imageBuffer);
    console.log(`Original image saved to: ${originalFilepath}`);
    
    console.log(`Starting image processing for ${imageType}...`);
    
    let processedBuffer;
    let filename;

    if (imageType === 'icon') {
      // Process as icon (small size)
      processedBuffer = await sharp(imageBuffer)
        .resize(IMAGE_CONFIG.iconSize, IMAGE_CONFIG.iconSize, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toBuffer();
      filename = `icon_${safePrompt}_${timestamp}.png`;
    } else {
      // Process as logo (larger size, maintain aspect ratio)
      processedBuffer = await sharp(imageBuffer)
        .resize(IMAGE_CONFIG.logoSize, IMAGE_CONFIG.logoSize, {
          fit: 'inside',
          withoutEnlargement: false
        })
        .png()
        .toBuffer();
      filename = `logo_${safePrompt}_${timestamp}.png`;
    }

    console.log(`Image processed successfully, processed size: ${processedBuffer.length} bytes`);

    // Save the processed image
    const filepath = path.join('public', 'generated', filename);
    console.log(`Saving processed image to: ${filepath}`);
    await fs.writeFile(filepath, processedBuffer);
    
    console.log(`Image saved successfully: ${filename}`);

    return {
      filename,
      path: `/generated/${filename}`,
      originalFilename,
      originalPath: `/generated/original/${originalFilename}`,
      size: processedBuffer.length,
      dimensions: imageType === 'icon' ? 
        { width: IMAGE_CONFIG.iconSize, height: IMAGE_CONFIG.iconSize } :
        { width: IMAGE_CONFIG.logoSize, height: IMAGE_CONFIG.logoSize }
    };
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
};

// Prompt enhancement function
const enhancePrompt = async (originalPrompt, imageType) => {
  if (!LLM_CONFIG.enabled) {
    console.log('📝 Prompt enhancement disabled, using original prompt');
    return originalPrompt;
  }

  try {
    console.log(`🤖 Enhancing prompt with LLM: ${originalPrompt}`);
    console.log('📋 Using template type:', imageType);
    
    const template = promptTemplates[imageType] || promptTemplates.logo;
    const prompt = template.replace('${prompt}', originalPrompt);
    console.log('🔍 Using prompt template:', prompt);

    const requestBody = {
      model: LLM_CONFIG.modelName,
      prompt: prompt,
      max_tokens: 100,
      temperature: 0.7,
      stop: ["\n", "```"]  // Stop generation at newlines or code blocks
    };

    console.log('📤 LLM Request:', {
      url: `${LLM_CONFIG.baseURL}/completions`,
      model: requestBody.model,
      prompt: requestBody.prompt
    });

    const response = await axios.post(
      `${LLM_CONFIG.baseURL}/completions`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('📥 LLM Response:', {
      status: response.status,
      headers: response.headers,
      data: JSON.stringify(response.data, null, 2)
    });

    console.log('📥 Response data type:', typeof response.data);
    if (response.data) {
      console.log('📥 Response data keys:', Object.keys(response.data));
    }

    // Handle x.ai API response format
    if (response.data?.choices?.[0]?.text) {
      const enhancedPrompt = response.data.choices[0].text.trim();
      
      // Validate enhanced prompt
      if (!enhancedPrompt || enhancedPrompt.length < 10) {
        console.warn('⚠️ Enhanced prompt too short or empty, using original');
        return originalPrompt;
      }
      
      // Check if the enhanced prompt is significantly different and not just a repeat
      if (enhancedPrompt.toLowerCase() === originalPrompt.toLowerCase() ||
          enhancedPrompt.toLowerCase().includes('enhance this design prompt')) {
        console.warn('⚠️ Enhanced prompt identical or invalid, using original');
        return originalPrompt;
      }
      
      console.log(`✨ Prompt enhanced: "${originalPrompt}" → "${enhancedPrompt}"`);
      return enhancedPrompt;
    } else {
      console.warn('⚠️ Invalid LLM response format:', response.data);
      return originalPrompt;
    }
  } catch (error) {
    console.error('🚨 LLM enhancement error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      stack: error.stack
    });
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      console.error('❌ Invalid LLM API key');
    } else if (error.response?.status === 429) {
      console.error('❌ LLM rate limit exceeded');
    } else if (error.response?.status === 400) {
      console.error('❌ Invalid LLM request:', error.response?.data);
    }
    
    console.warn('⚠️ Falling back to original prompt due to LLM error');
    return originalPrompt;
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, imageType = 'logo' } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!['logo', 'icon'].includes(imageType)) {
      return res.status(400).json({ error: 'Image type must be either "logo" or "icon"' });
    }

    const originalPrompt = prompt.trim();
    const enhancedPrompt = await enhancePrompt(originalPrompt, imageType);
    const finalPrompt = imageType === 'logo'
      ? `Professional logo design: ${enhancedPrompt}. Clean, modern, suitable for branding, high quality, vector-style`
      : `Simple icon design: ${enhancedPrompt}. Minimalist, clear, suitable for favicon or app icon, clean lines`;

    console.log(`Processing request for ${imageType}:`);
    console.log(`  Original: ${originalPrompt}`);
    console.log(`  Enhanced: ${enhancedPrompt}`);
    console.log(`  Final: ${finalPrompt}`);

    // Generate image
    const imageUrl = await generateImage(finalPrompt, imageType);
    
    // Download and process image
    const processedImage = await downloadAndProcessImage(imageUrl, imageType, originalPrompt);

    res.json({
      success: true,
      data: {
        ...processedImage,
        originalPrompt,
        enhancedPrompt: LLM_CONFIG.enabled ? enhancedPrompt : null,
        finalPrompt,
        imageType,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generation endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate image'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config: {
      apiBaseUrl: API_CONFIG.baseURL,
      modelName: API_CONFIG.modelName,
      hasApiKey: !!API_CONFIG.apiKey,
      logoSize: IMAGE_CONFIG.logoSize,
      iconSize: IMAGE_CONFIG.iconSize
    },
    directories: {
      generatedExists: require('fs').existsSync('public/generated'),
      tempExists: require('fs').existsSync('temp')
    }
  });
});

// List generated images endpoint
app.get('/api/images', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const files = await fs.readdir('public/generated');
    const imageFiles = files.filter(file => 
      file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
    );
    
    const images = await Promise.all(
      imageFiles.map(async (filename) => {
        const stats = await fs.stat(path.join('public/generated', filename));
        return {
          filename,
          path: `/generated/${filename}`,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
    );
    
    res.json({
      success: true,
      count: images.length,
      images: images.sort((a, b) => new Date(b.created) - new Date(a.created))
    });
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list images'
    });
  }
});

// Test endpoint for LLM enhancement
app.post('/api/test-enhance', async (req, res) => {
  try {
    const { prompt, imageType = 'logo' } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!['logo', 'icon'].includes(imageType)) {
      return res.status(400).json({ error: 'Image type must be either "logo" or "icon"' });
    }

    const originalPrompt = prompt.trim();
    const enhancedPrompt = await enhancePrompt(originalPrompt, imageType);

    res.json({
      success: true,
      data: {
        originalPrompt,
        enhancedPrompt,
        imageType,
        llmConfig: {
          enabled: LLM_CONFIG.enabled,
          model: LLM_CONFIG.modelName,
          baseURL: LLM_CONFIG.baseURL,
          hasKey: !!LLM_CONFIG.apiKey,
          useSharedKey: LLM_CONFIG.useSharedKey
        }
      }
    });
  } catch (error) {
    console.error('Enhancement test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test prompt enhancement'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 LogoGen server running on port ${PORT}`);
  console.log(`🔧 API Base URL: ${API_CONFIG.baseURL}`);
  console.log(`🤖 Model: ${API_CONFIG.modelName}`);
  console.log(`🔑 API Key configured: ${!!API_CONFIG.apiKey}`);
  console.log(`🧠 LLM Prompt Enhancement: Enabled: ${LLM_CONFIG.enabled}`);
  if (LLM_CONFIG.enabled) {
    console.log(`   LLM Base URL: ${LLM_CONFIG.baseURL}`);
    console.log(`   LLM Model: ${LLM_CONFIG.modelName}`);
    console.log(`   LLM API Key configured: ${!!LLM_CONFIG.apiKey}`);
    console.log(`   Using shared API key: ${LLM_CONFIG.useSharedKey}`);
  }
});
