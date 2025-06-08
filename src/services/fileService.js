const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

/**
 * File Service
 * Handles all file operations and directory management
 */
class FileService {
  constructor() {
    this.directories = config.directoryConfig;
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    try {
      await fs.mkdir(this.directories.generated, { recursive: true });
      await fs.mkdir(this.directories.generatedOriginal, { recursive: true });
      await fs.mkdir(this.directories.temp, { recursive: true });
      console.log('✅ Directories created successfully');
    } catch (error) {
      console.error('❌ Error creating directories:', error);
      throw error;
    }
  }

  /**
   * Save file to disk
   */
  async saveFile(filepath, buffer) {
    try {
      await fs.writeFile(filepath, buffer);
      console.log(`✅ File saved successfully: ${filepath}`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving file ${filepath}:`, error);
      throw error;
    }
  }

  /**
   * Generate safe filename from prompt
   */
  generateSafeFilename(prompt, imageType, timestamp, isOriginal = false) {
    const safePrompt = prompt
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    const suffix = isOriginal ? '_original' : '';
    return `${imageType}_${safePrompt}_${timestamp}${suffix}.png`;
  }

  /**
   * Get file paths for saving images
   */
  getFilePaths(filename, originalFilename) {
    return {
      processedPath: path.join(this.directories.generated, filename),
      originalPath: path.join(this.directories.generatedOriginal, originalFilename),
      publicProcessedPath: `/generated/${filename}`,
      publicOriginalPath: `/generated/original/${originalFilename}`
    };
  }

  /**
   * List generated images
   */
  async listGeneratedImages() {
    try {
      const files = await fs.readdir(this.directories.generated);
      const imageFiles = files.filter(file => 
        file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
      );
      
      const images = await Promise.all(
        imageFiles.map(async (filename) => {
          const stats = await fs.stat(path.join(this.directories.generated, filename));
          return {
            filename,
            path: `/generated/${filename}`,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
      );
      
      return images.sort((a, b) => new Date(b.created) - new Date(a.created));
    } catch (error) {
      console.error('❌ Error listing images:', error);
      throw error;
    }
  }

  /**
   * Check if directories exist
   */
  async checkDirectories() {
    try {
      const checks = await Promise.all([
        this.directoryExists(this.directories.generated),
        this.directoryExists(this.directories.temp)
      ]);
      
      return {
        generatedExists: checks[0],
        tempExists: checks[1]
      };
    } catch (error) {
      console.error('❌ Error checking directories:', error);
      return {
        generatedExists: false,
        tempExists: false
      };
    }
  }

  /**
   * Check if directory exists
   */
  async directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Load prompt templates
   */
  async loadPromptTemplates() {
    try {
      const jsonData = await fs.readFile('./prompt-templates.json', 'utf-8');
      const templates = JSON.parse(jsonData);
      console.log('✅ Prompt templates loaded successfully:', Object.keys(templates));
      return templates;
    } catch (error) {
      console.error('❌ Failed to load prompt templates:', error);
      throw error;
    }
  }
}

module.exports = new FileService(); 