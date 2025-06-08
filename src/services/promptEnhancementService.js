const axios = require('axios');
const config = require('../config');
const fileService = require('./fileService');

/**
 * Prompt Enhancement Service
 * Handles LLM-based prompt enhancement
 */
class PromptEnhancementService {
  constructor() {
    this.llmConfig = config.llmConfig;
    this.promptTemplates = {};
    this.initializeTemplates();
  }

  /**
   * Initialize prompt templates
   */
  async initializeTemplates() {
    try {
      this.promptTemplates = await fileService.loadPromptTemplates();
    } catch (error) {
      console.error('❌ Failed to load prompt templates:', error);
      // Continue without templates - enhancement will use original prompts
      this.promptTemplates = {
        logo: "Enhance this design prompt by adding specific visual details. Keep it concise and focused only on the design elements. No code or formatting:\n\"${prompt}\"\nEnhanced version:",
        icon: "Enhance this design prompt by adding specific visual details. Keep it concise and focused only on the design elements. No code or formatting:\n\"${prompt}\"\nEnhanced version:"
      };
    }
  }

  /**
   * Enhance prompt using LLM if enabled
   */
  async enhancePrompt(originalPrompt, imageType) {
    // Return original prompt if LLM enhancement is disabled
    if (!this.llmConfig.enabled) {
      console.log('💡 LLM enhancement disabled - using original prompt');
      return originalPrompt;
    }

    // Return original prompt if no API key is available
    if (!this.llmConfig.apiKey) {
      console.log('⚠️ No LLM API key available - using original prompt');
      return originalPrompt;
    }

    try {
      console.log(`🧠 Enhancing ${imageType} prompt: ${originalPrompt}`);
      
      const template = this.promptTemplates[imageType] || this.promptTemplates.logo;
      const prompt = template.replace('${prompt}', originalPrompt);
      
      const requestBody = {
        model: this.llmConfig.modelName,
        prompt: prompt,
        max_tokens: 100,
        temperature: 0.7,
        stop: ["\n", "```"]
      };

      console.log('🔄 LLM Request:', {
        url: `${this.llmConfig.baseURL}/completions`,
        model: requestBody.model,
        prompt: requestBody.prompt.substring(0, 100) + '...'
      });

      const response = await axios.post(
        `${this.llmConfig.baseURL}/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.llmConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      if (response.data?.choices?.[0]?.text) {
        const enhancedPrompt = response.data.choices[0].text.trim();
        
        // Validate enhanced prompt quality
        if (this.isValidEnhancedPrompt(enhancedPrompt, originalPrompt)) {
          console.log(`✨ Prompt enhanced successfully: ${enhancedPrompt}`);
          return enhancedPrompt;
        } else {
          console.log('⚠️ Enhanced prompt quality check failed - using original');
          return originalPrompt;
        }
      } else {
        console.log('⚠️ Invalid LLM response format - using original prompt');
        return originalPrompt;
      }
    } catch (error) {
      console.error('❌ Prompt enhancement error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Always return original prompt on error
      console.log('🔄 Falling back to original prompt');
      return originalPrompt;
    }
  }

  /**
   * Validate if enhanced prompt is actually better than original
   */
  isValidEnhancedPrompt(enhancedPrompt, originalPrompt) {
    // Basic quality checks
    if (!enhancedPrompt || enhancedPrompt.length < 10) {
      return false;
    }

    // Check if it's too similar to original (no real enhancement)
    if (enhancedPrompt.toLowerCase() === originalPrompt.toLowerCase()) {
      return false;
    }

    // Check for common LLM failure patterns
    const failurePatterns = [
      'enhance this design prompt',
      'enhanced version:',
      'here is the enhanced',
      'i cannot',
      'i can\'t',
      'as an ai'
    ];

    const lowerEnhanced = enhancedPrompt.toLowerCase();
    for (const pattern of failurePatterns) {
      if (lowerEnhanced.includes(pattern)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if enhancement is enabled
   */
  isEnhancementEnabled() {
    return this.llmConfig.enabled && !!this.llmConfig.apiKey;
  }

  /**
   * Get enhancement configuration for client
   */
  getEnhancementConfig() {
    return {
      enabled: this.llmConfig.enabled,
      available: this.isEnhancementEnabled(),
      model: this.llmConfig.modelName,
      baseURL: this.llmConfig.baseURL
    };
  }
}

module.exports = new PromptEnhancementService(); 