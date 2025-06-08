const axios = require('axios');
const config = require('../config');

/**
 * Image Generation Service
 * Handles API calls to the image generation service
 */
class ImageGenerationService {
  constructor() {
    this.apiConfig = config.apiConfig;
  }

  /**
   * Generate image using AI API
   */
  async generateImage(prompt, imageType = 'logo') {
    try {
      console.log(`🎨 Generating ${imageType} with prompt: ${prompt}`);
      
      const requestBody = {
        model: this.apiConfig.modelName,
        prompt: prompt,
        n: 1,
        response_format: 'url'
      };

      console.log('📡 API Request:', {
        url: `${this.apiConfig.baseURL}/images/generations`,
        model: requestBody.model,
        prompt: requestBody.prompt
      });
      
      const response = await axios.post(
        `${this.apiConfig.baseURL}/images/generations`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout
        }
      );

      console.log('✅ API Response status:', response.status);
      
      if (response.data && response.data.data && response.data.data[0]) {
        const imageUrl = response.data.data[0].url;
        console.log('🖼️ Generated image URL:', imageUrl);
        return imageUrl;
      } else {
        console.error('❌ Invalid API response format:', response.data);
        throw new Error('Invalid response format from image generation API');
      }
    } catch (error) {
      console.error('❌ Image generation error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Handle specific error cases
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
  }

  /**
   * Create final prompt with appropriate styling based on image type
   */
  createFinalPrompt(enhancedPrompt, imageType) {
    if (imageType === 'logo') {
      return `Professional logo design: ${enhancedPrompt}. Clean, modern, suitable for branding, high quality, vector-style`;
    } else {
      return `Simple icon design: ${enhancedPrompt}. Minimalist, clear, suitable for favicon or app icon, clean lines`;
    }
  }

  /**
   * Validate image type
   */
  validateImageType(imageType) {
    return ['logo', 'icon'].includes(imageType);
  }
}

module.exports = new ImageGenerationService(); 