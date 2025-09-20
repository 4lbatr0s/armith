import AWS from 'aws-sdk';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const PRESIGNED_URL_EXPIRY = 300; // 5 minutes for upload
const DOWNLOAD_URL_EXPIRY = 86400; // 24 hours for download (AI processing)

// Storage configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 's3' or 'local'
const LOCAL_UPLOAD_PATH = process.env.LOCAL_UPLOAD_PATH || './uploads/kyc-uploads';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Ensure local upload directory exists
if (STORAGE_TYPE === 'local') {
  if (!fs.existsSync(LOCAL_UPLOAD_PATH)) {
    fs.mkdirSync(LOCAL_UPLOAD_PATH, { recursive: true });
  }
}

/**
 * Storage Service for handling file operations
 * Supports both AWS S3 and local file storage
 */
class StorageService {
  constructor() {
    this.s3 = s3;
    this.bucketName = BUCKET_NAME;
    this.presignedUrlExpiry = PRESIGNED_URL_EXPIRY;
    this.downloadUrlExpiry = DOWNLOAD_URL_EXPIRY;
    this.storageType = STORAGE_TYPE;
    this.localUploadPath = LOCAL_UPLOAD_PATH;
    this.baseUrl = BASE_URL;
    
    // Configure multer for local storage
    try {
      this.multerConfig = multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, this.localUploadPath);
        },
        filename: (req, file, cb) => {
          const fileExtension = path.extname(file.originalname);
          const fileName = `${uuidv4()}${fileExtension}`;
          cb(null, fileName);
        }
      });
      
      this.upload = multer({ 
        storage: this.multerConfig,
        limits: {
          fileSize: 10 * 1024 * 1024 // 10MB limit
        },
        fileFilter: (req, file, cb) => {
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
          if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'), false);
          }
        }
      });
      
      console.log('✅ Multer configured successfully for local storage');
    } catch (error) {
      console.error('❌ Failed to configure multer:', error);
      this.upload = null;
    }
  }

  /**
   * Generate upload URL (S3 presigned or local endpoint)
   * @param {string} fileType - MIME type of the file
   * @returns {Promise<Object>} Upload data with URLs and metadata
   */
  async generatePresignedUploadUrl(fileType) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(fileType)) {
      throw new Error('Invalid file type. Only JPEG and PNG are allowed.');
    }

    // Generate unique filename
    const fileExtension = fileType.split('/')[1];
    
    if (this.storageType === 's3') {
      const fileName = `kyc-uploads/${uuidv4()}.${fileExtension}`;
      return await this._generateS3UploadUrl(fileType, fileName);
    } else {
      const fileName = `${uuidv4()}.${fileExtension}`; // Just filename for local storage
      return await this._generateLocalUploadUrl(fileType, fileName);
    }
  }

  /**
   * Generate S3 presigned upload URL
   * @private
   */
  async _generateS3UploadUrl(fileType, fileName) {
    if (!this.bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    try {
      // Generate presigned URL for upload (PUT)
      const uploadUrl = await this.s3.getSignedUrlPromise('putObject', {
        Bucket: this.bucketName,
        Key: fileName,
        ContentType: fileType,
        Expires: this.presignedUrlExpiry, // URL expires in 5 minutes
        Metadata: {
          uploadedAt: new Date().toISOString(),
          service: 'kyc-flow'
        }
      });

      // Generate temporary download URL (expires in 24 hours for AI processing)
      const downloadUrl = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucketName,
        Key: fileName,
        Expires: this.downloadUrlExpiry // 24 hours - enough time for AI processing
      });

      return {
        uploadUrl,
        downloadUrl,
        fileName,
        expiresIn: this.presignedUrlExpiry,
        storageType: 's3'
      };
    } catch (error) {
      console.error('Error generating S3 presigned URL:', error);
      throw new Error('Failed to generate S3 upload URL');
    }
  }

  /**
   * Generate local upload URL (endpoint)
   * @private
   */
  async _generateLocalUploadUrl(fileType, fileName) {
    const uploadUrl = `${this.baseUrl}/kyc/local-upload`;
    const downloadUrl = `${this.baseUrl}/kyc/files/${fileName}`;

    return {
      uploadUrl,
      downloadUrl,
      fileName,
      expiresIn: this.presignedUrlExpiry,
      storageType: 'local'
    };
  }

  /**
   * Validate image URL format
   * @param {string} url - URL to validate
   * @returns {boolean} Whether the URL is valid
   */
  isValidImageUrl(url) {
    try {
      const urlObj = new URL(url);
      // Check if URL is accessible (basic format validation)
      return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
    } catch {
      return false;
    }
  }

  /**
   * Get multer middleware for local uploads
   * @returns {Function} Multer middleware
   */
  getMulterMiddleware() {
    if (!this.upload) {
      console.error('❌ Multer not initialized. Creating fallback middleware...');
      // Create a simple fallback multer instance
      this.upload = multer({ 
        storage: multer.memoryStorage(),
        limits: {
          fileSize: 10 * 1024 * 1024 // 10MB limit
        },
        fileFilter: (req, file, cb) => {
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
          if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'), false);
          }
        }
      });
      console.log('✅ Fallback multer middleware created');
    }
    return this.upload.single('file');
  }

  /**
   * Delete file from S3
   * @param {string} fileName - S3 object key
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(fileName) {
    if (!this.bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: fileName
      }).promise();

      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Check if file exists (S3 or local)
   * @param {string} fileName - File name/path
   * @returns {Promise<boolean>} Whether file exists
   */
  async fileExists(fileName) {
    if (this.storageType === 's3') {
      return await this._s3FileExists(fileName);
    } else {
      return await this._localFileExists(fileName);
    }
  }

  /**
   * Check if file exists in S3
   * @private
   */
  async _s3FileExists(fileName) {
    if (!this.bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    try {
      await this.s3.headObject({
        Bucket: this.bucketName,
        Key: fileName
      }).promise();

      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      console.error('Error checking S3 file existence:', error);
      throw new Error('Failed to check S3 file existence');
    }
  }

  /**
   * Check if file exists locally
   * @private
   */
  async _localFileExists(fileName) {
    try {
      const filePath = path.join(this.localUploadPath, fileName);
      return fs.existsSync(filePath);
    } catch (error) {
      console.error('Error checking local file existence:', error);
      throw new Error('Failed to check local file existence');
    }
  }

  /**
   * Get file metadata from S3
   * @param {string} fileName - S3 object key
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(fileName) {
    if (!this.bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    try {
      const result = await this.s3.headObject({
        Bucket: this.bucketName,
        Key: fileName
      }).promise();

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
   * Generate presigned download URL for private files
   * @param {string} fileName - S3 object key
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {Promise<Object>} Download URL data
   */
  async generatePresignedDownloadUrl(fileName, expiresIn = this.downloadUrlExpiry) {
    if (!this.bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    try {
      // Verify file exists before generating URL
      const exists = await this.fileExists(fileName);
      if (!exists) {
        throw new Error('File not found');
      }

      const downloadUrl = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucketName,
        Key: fileName,
        Expires: expiresIn
      });

      return {
        downloadUrl,
        expiresIn
      };
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Generate secure download URL for AI processing
   * @param {string} fileName - S3 object key
   * @returns {Promise<Object>} Secure download URL data
   */
  async generateSecureDownloadUrl(fileName) {
    if (!this.bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    try {
      // Verify file exists and is in kyc-uploads directory
      if (!fileName.startsWith('kyc-uploads/')) {
        throw new Error('Invalid file path');
      }

      const exists = await this.fileExists(fileName);
      if (!exists) {
        throw new Error('File not found');
      }

      // Generate short-lived URL for AI processing (2 hours)
      const downloadUrl = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucketName,
        Key: fileName,
        Expires: 7200 // 2 hours - enough for AI processing
      });

      return {
        downloadUrl,
        expiresIn: 7200
      };
    } catch (error) {
      console.error('Error generating secure download URL:', error);
      throw new Error('Failed to generate secure download URL');
    }
  }

  /**
   * Clean up old files from S3
   * @param {number} daysOld - Number of days old to consider for cleanup
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldFiles(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const listParams = {
        Bucket: this.bucketName,
        Prefix: 'kyc-uploads/'
      };

      const listedObjects = await this.s3.listObjectsV2(listParams).promise();
      
      if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        return { deleted: 0, message: 'No files to clean up' };
      }

      const objectsToDelete = listedObjects.Contents
        .filter(obj => obj.LastModified < cutoffDate)
        .map(obj => ({ Key: obj.Key }));

      if (objectsToDelete.length === 0) {
        return { deleted: 0, message: 'No old files found' };
      }

      const deleteParams = {
        Bucket: this.bucketName,
        Delete: {
          Objects: objectsToDelete
        }
      };

      const deleteResult = await this.s3.deleteObjects(deleteParams).promise();
      
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
   * Extract S3 key from URL
   * @param {string} url - S3 URL
   * @returns {string|null} S3 key or null if invalid
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
   * Get service configuration
   * @returns {Object} Service configuration
   */
  getConfig() {
    return {
      storageType: this.storageType,
      bucketName: this.bucketName,
      presignedUrlExpiry: this.presignedUrlExpiry,
      downloadUrlExpiry: this.downloadUrlExpiry,
      localUploadPath: this.localUploadPath,
      baseUrl: this.baseUrl,
      region: process.env.AWS_REGION || 'us-east-1'
    };
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
  isValidImageUrl,
  deleteFile,
  fileExists,
  getFileMetadata,
  generatePresignedDownloadUrl,
  generateSecureDownloadUrl,
  cleanupOldFiles,
  extractKeyFromUrl,
  getMulterMiddleware
} = storageService;

export {
  PRESIGNED_URL_EXPIRY,
  DOWNLOAD_URL_EXPIRY
};
