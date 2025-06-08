const axios = require('axios');
const sharp = require('sharp');
const config = require('../config');
const fileService = require('./fileService');

/**
 * Image Processing Service
 * Handles image download, processing, and saving
 */
class ImageProcessingService {
  constructor() {
    this.imageConfig = config.imageConfig;
  }

  /**
   * Download and process image from URL
   */
  async downloadAndProcessImage(imageUrl, imageType, originalPrompt) {
    try {
      console.log(`📥 Starting download from: ${imageUrl}`);
      
      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl);
      
      // Generate timestamps and filenames
      const timestamp = Date.now();
      const originalFilename = fileService.generateSafeFilename(originalPrompt, imageType, timestamp, true);
      const processedFilename = fileService.generateSafeFilename(originalPrompt, imageType, timestamp, false);
      
      // Get file paths
      const paths = fileService.getFilePaths(processedFilename, originalFilename);
      
      // Save original image
      await fileService.saveFile(paths.originalPath, imageBuffer);
      console.log(`💾 Original image saved: ${originalFilename}`);
      
      // Process image based on type
      const processedBuffer = await this.processImage(imageBuffer, imageType);
      
      // Save processed image
      await fileService.saveFile(paths.processedPath, processedBuffer);
      console.log(`✨ Processed image saved: ${processedFilename}`);
      
      // Get dimensions for response
      const dimensions = await this.getImageDimensions(processedBuffer);
      
      return {
        filename: processedFilename,
        path: paths.publicProcessedPath,
        originalFilename,
        originalPath: paths.publicOriginalPath,
        size: processedBuffer.length,
        dimensions
      };
      
    } catch (error) {
      console.error('❌ Image processing error:', error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Download image from URL
   */
  async downloadImage(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 45000, // 45 second timeout
        maxContentLength: this.imageConfig.maxFileSize
      });

      console.log(`✅ Download completed, size: ${response.data.byteLength} bytes`);
      
      if (response.data.byteLength > this.imageConfig.maxFileSize) {
        throw new Error(`Image too large: ${response.data.byteLength} bytes (max: ${this.imageConfig.maxFileSize})`);
      }
      
      return Buffer.from(response.data);
    } catch (error) {
      console.error('❌ Image download error:', error);
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Process image based on type (logo or icon)
   */
  async processImage(imageBuffer, imageType) {
    try {
      console.log(`🎨 Processing ${imageType} image...`);
      
      let processedBuffer;
      
      if (imageType === 'icon') {
        // Process as icon (small size, square crop)
        processedBuffer = await sharp(imageBuffer)
          .resize(this.imageConfig.iconSize, this.imageConfig.iconSize, {
            fit: 'cover',
            position: 'center'
          })
          .png({
            quality: 90,
            compressionLevel: 6
          })
          .toBuffer();
      } else {
        // Process as logo (larger size, maintain aspect ratio)
        processedBuffer = await sharp(imageBuffer)
          .resize(this.imageConfig.logoSize, this.imageConfig.logoSize, {
            fit: 'inside',
            withoutEnlargement: false
          })
          .png({
            quality: 95,
            compressionLevel: 6
          })
          .toBuffer();
      }

      console.log(`✅ Image processed successfully, size: ${processedBuffer.length} bytes`);
      return processedBuffer;
      
    } catch (error) {
      console.error('❌ Image processing error:', error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Get image dimensions from buffer
   */
  async getImageDimensions(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      console.error('❌ Error getting image dimensions:', error);
      // Return default dimensions based on config
      return {
        width: this.imageConfig.logoSize,
        height: this.imageConfig.logoSize
      };
    }
  }

  /**
   * Validate image buffer
   */
  async validateImageBuffer(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      // Check if it's a valid image
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image: no dimensions');
      }
      
      // Check size limits
      if (imageBuffer.length > this.imageConfig.maxFileSize) {
        throw new Error(`Image too large: ${imageBuffer.length} bytes`);
      }
      
      console.log(`✅ Image validation passed: ${metadata.width}x${metadata.height}, ${imageBuffer.length} bytes`);
      return true;
      
    } catch (error) {
      console.error('❌ Image validation failed:', error);
      throw error;
    }
  }

  /**
   * Get supported image formats
   */
  getSupportedFormats() {
    return ['png', 'jpg', 'jpeg', 'webp'];
  }

  /**
   * Get image processing configuration
   */
  getProcessingConfig() {
    return {
      logoSize: this.imageConfig.logoSize,
      iconSize: this.imageConfig.iconSize,
      maxFileSize: this.imageConfig.maxFileSize,
      supportedFormats: this.getSupportedFormats()
    };
  }
}

module.exports = new ImageProcessingService(); 