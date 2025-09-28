import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Storage Service - Cloudflare R2
 * Handles file uploads, downloads, and management using Cloudflare R2
 */
class StorageService {
  constructor() {
    this.client = null;
    this.bucketName = process.env.R2_BUCKET_NAME;
    this.region = process.env.R2_REGION || 'auto';
    this.presignedUrlExpiry = 300; // 5 minutes for upload
    this.downloadUrlExpiry = 86400; // 24 hours for download
    this.initialize();
  }

  initialize() {
    try {
      // Validate required environment variables
      const requiredEnvVars = [
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_BUCKET_NAME',
        'R2_ENDPOINT'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.warn(`⚠️  Missing R2 environment variables: ${missingVars.join(', ')}`);
        console.warn('R2 storage service will not be available');
        return;
      }

      // Initialize S3 client for R2
      this.client = new S3Client({
        region: this.region,
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
        forcePathStyle: true, // Required for R2
      });

      console.log('✅ Storage service initialized with R2');
    } catch (error) {
      console.error('❌ Failed to initialize R2 storage service:', error);
    }
  }

  /**
   * Check if R2 service is available
   */
  isAvailable() {
    return this.client !== null && this.bucketName;
  }

  /**
   * Get R2 configuration
   */
  getConfig() {
    return {
      storageType: 'r2',
      bucketName: this.bucketName,
      region: this.region,
      isAvailable: this.isAvailable()
    };
  }

  /**
   * Generate a unique filename
   */
  generateFileName(originalName, prefix = 'kyc-uploads') {
    const fileExtension = path.extname(originalName) || '.jpg';
    const timestamp = Date.now();
    const uuid = uuidv4();
    return `${prefix}/${timestamp}-${uuid}${fileExtension}`;
  }

  /**
   * Generate presigned upload URL
   */
  async generatePresignedUploadUrl(fileType = 'image/jpeg', fileName = null) {
    if (!this.isAvailable()) {
      throw new Error('R2 storage service is not available');
    }

    try {
      // Generate unique filename if not provided
      if (!fileName) {
        const fileExtension = fileType.split('/')[1];
        fileName = `kyc-uploads/${uuidv4()}.${fileExtension}`;
      }
      const contentType = this.getContentType(fileType);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        ContentType: contentType,
        Metadata: {
          'upload-timestamp': new Date().toISOString(),
          'upload-source': 'kyc-flow'
        }
      });

      // Generate presigned URL for upload
      const presignedUrl = await getSignedUrl(this.client, command, { 
        expiresIn: this.presignedUrlExpiry
      });

      // Generate presigned download URL for immediate access
      const downloadCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName
      });
      
      const presignedDownloadUrl = await getSignedUrl(this.client, downloadCommand, { 
        expiresIn: this.downloadUrlExpiry
      });

      return {
        uploadUrl: presignedUrl,
        fileName: fileName,
        downloadUrl: presignedDownloadUrl,
        expiresIn: this.presignedUrlExpiry,
        contentType: contentType,
        storageType: 'r2'
      };
    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Generate presigned download URL
   */
  async generatePresignedDownloadUrl(fileName, expiresIn = 3600) {
    if (!this.isAvailable()) {
      throw new Error('R2 storage service is not available');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName
      });

      const presignedUrl = await getSignedUrl(this.client, command, { 
        expiresIn: expiresIn
      });

      return {
        downloadUrl: presignedUrl,
        expiresIn: expiresIn
      };
    } catch (error) {
      console.error('Error generating presigned download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Generate secure download URL (for AI processing)
   */
  async generateSecureDownloadUrl(fileName) {
    if (!this.isAvailable()) {
      throw new Error('R2 storage service is not available');
    }

    try {
      // Generate a short-lived URL for AI processing (5 minutes)
      const result = await this.generatePresignedDownloadUrl(fileName, 300);
      
      return {
        downloadUrl: result.downloadUrl,
        expiresIn: result.expiresIn
      };
    } catch (error) {
      console.error('Error generating secure download URL:', error);
      throw new Error('Failed to generate secure download URL');
    }
  }

  /**
   * Generate presigned URL for an existing file
   * @param {string} fileName - File name/key
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {Promise<Object>} Presigned URL data
   */
  async generatePresignedUrl(fileName, expiresIn = 3600) {
    if (!this.isAvailable()) {
      throw new Error('R2 storage service is not available');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName
      });

      const presignedUrl = await getSignedUrl(this.client, command, { 
        expiresIn: expiresIn
      });

      return {
        downloadUrl: presignedUrl,
        expiresIn: expiresIn
      };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate presigned URL');
    }
  }

  /**
   * Get public URL for a file (if custom domain is configured)
   * Note: This should only be used for public files, prefer presigned URLs for security
   */
  getPublicUrl(fileName) {
    if (!this.publicUrl) {
      throw new Error('R2 public URL not configured. Use presigned URLs for secure access.');
    }
    
    // Remove trailing slash from public URL if present
    const baseUrl = this.publicUrl.replace(/\/$/, '');
    return `${baseUrl}/${fileName}`;
  }

  /**
   * Validate if a URL is a valid R2 URL
   */
  isValidImageUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Check if it's a valid URL
    try {
      const urlObj = new URL(url);
      
      // Check if it's from our R2 domain
      if (this.publicUrl) {
        const publicUrlObj = new URL(this.publicUrl);
        return urlObj.hostname === publicUrlObj.hostname;
      }
      
      // Fallback: check if it's a valid HTTP/HTTPS URL
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(fileName) {
    if (!this.isAvailable()) {
      throw new Error('R2 storage service is not available');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName
      });

      await this.client.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get content type based on file type
   */
  getContentType(fileType) {
    const contentTypes = {
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg',
      'image/png': 'image/png',
      'image/gif': 'image/gif',
      'image/webp': 'image/webp'
    };

    return contentTypes[fileType] || 'application/octet-stream';
  }

  /**
   * Get file info (metadata) with presigned download URL
   */
  async getFileInfo(fileName, downloadUrlExpiresIn = 3600) {
    if (!this.isAvailable()) {
      throw new Error('R2 storage service is not available');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName
      });

      const response = await this.client.send(command);
      
      // Generate presigned download URL
      const downloadData = await this.generatePresignedUrl(fileName, downloadUrlExpiresIn);
      
      return {
        fileName: fileName,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata || {},
        downloadUrl: downloadData.downloadUrl,
        downloadUrlExpiresIn: downloadData.expiresIn
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      throw new Error('Failed to get file info');
    }
  }

  /**
   * List files in a prefix with presigned download URLs
   */
  async listFiles(prefix = 'kyc-uploads', maxKeys = 100, downloadUrlExpiresIn = 3600) {
    if (!this.isAvailable()) {
      throw new Error('R2 storage service is not available');
    }

    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      const response = await this.client.send(command);
      
      // Generate presigned URLs for each file
      const filesWithUrls = await Promise.all(
        (response.Contents || []).map(async (file) => {
          try {
            const downloadData = await this.generatePresignedUrl(file.Key, downloadUrlExpiresIn);
            return {
              ...file,
              downloadUrl: downloadData.downloadUrl,
              downloadUrlExpiresIn: downloadData.expiresIn
            };
          } catch (error) {
            console.warn(`Failed to generate presigned URL for ${file.Key}:`, error);
            return {
              ...file,
              downloadUrl: null,
              downloadUrlExpiresIn: 0
            };
          }
        })
      );
      
      return {
        files: filesWithUrls,
        isTruncated: response.IsTruncated || false,
        nextContinuationToken: response.NextContinuationToken
      };
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(fileName) {
    if (!this.isAvailable()) {
      throw new Error('R2 storage service is not available');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileName
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      console.error('Error checking file existence:', error);
      throw new Error('Failed to check file existence');
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileName) {
    if (!this.isAvailable()) {
      throw new Error('R2 storage service is not available');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileName
      });

      const result = await this.client.send(command);

      return {
        size: result.ContentLength,
        lastModified: result.LastModified,
        contentType: result.ContentType,
        metadata: result.Metadata
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(daysOld = 7) {
    if (!this.isAvailable()) {
      throw new Error('R2 storage service is not available');
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'kyc-uploads/'
      });

      const listedObjects = await this.client.send(listCommand);
      
      if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        return { deleted: 0, message: 'No files to clean up' };
      }

      const objectsToDelete = listedObjects.Contents
        .filter(obj => obj.LastModified < cutoffDate)
        .map(obj => ({ Key: obj.Key }));

      if (objectsToDelete.length === 0) {
        return { deleted: 0, message: 'No old files found' };
      }

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: objectsToDelete
        }
      });

      const deleteResult = await this.client.send(deleteCommand);
      
      return {
        deleted: deleteResult.Deleted.length,
        errors: deleteResult.Errors.length,
        message: `Deleted ${deleteResult.Deleted.length} old files`
      };
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      throw new Error('Failed to cleanup old files');
    }
  }

  /**
   * Extract key from URL
   */
  extractKeyFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.startsWith('/') ? pathname.slice(1) : pathname;
    } catch {
      return null;
    }
  }

  /**
   * Health check for R2 service
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return {
        status: 'unavailable',
        message: 'R2 service not configured'
      };
    }

    try {
      // Try to list objects to test connectivity
      const result = await this.listFiles('health-check', 1);
      
      return {
        status: 'healthy',
        message: 'R2 service is working',
        bucketName: this.bucketName,
        region: this.region
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `R2 service error: ${error.message}`
      };
    }
  }
}

// Create and export a singleton instance
console.log('🔧 Initializing Storage Service...');
const storageService = new StorageService();
console.log('✅ Storage Service initialized successfully');

export default storageService;

// Also export individual functions for backward compatibility
export const {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  generateSecureDownloadUrl,
  generatePresignedUrl,
  isValidImageUrl,
  deleteFile,
  fileExists,
  getFileMetadata,
  getFileInfo,
  listFiles,
  cleanupOldFiles,
  extractKeyFromUrl,
  healthCheck,
  getConfig
} = storageService;
