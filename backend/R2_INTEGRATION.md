# Remote Storage Integration

This document explains how to set up and use remote storage (Cloudflare R2 or AWS S3) for file storage in the KYC flow system.

## Overview

The KYC flow system now supports only remote storage solutions:
- **Cloudflare R2**: Cost-effective object storage with no egress fees
- **AWS S3**: Industry-standard object storage

Both provide:
- **Presigned URLs** for secure file uploads and downloads
- **Private file access** with time-limited URLs
- **Global CDN** integration
- **Scalable storage** for production use

## Setup Instructions

### Option 1: Cloudflare R2 Setup

#### 1. Create Cloudflare R2 Bucket

1. Log in to your Cloudflare dashboard
2. Go to **R2 Object Storage**
3. Click **Create bucket**
4. Choose a bucket name (e.g., `kyc-flow-uploads`)
5. Select your preferred location

### 2. Configure Custom Domain (Optional but Recommended)

1. In your R2 bucket settings, go to **Settings** → **Custom Domains**
2. Add a custom domain (e.g., `uploads.yourdomain.com`)
3. Configure DNS records as instructed
4. This gives you clean, branded URLs for your files

### 3. Create R2 API Token

1. Go to **Manage R2 API tokens**
2. Click **Create API token**
3. Choose **Custom token**
4. Set permissions:
   - **Zone:Zone:Read** (if using custom domain)
   - **Account:Cloudflare R2:Edit**
5. Set **Account resources** to your account
6. Set **Zone resources** to your domain (if using custom domain)
7. Copy the **Access Key ID** and **Secret Access Key**

### Option 2: AWS S3 Setup

#### 1. Create AWS S3 Bucket

1. Log in to your AWS Console
2. Go to **S3** service
3. Click **Create bucket**
4. Choose a bucket name (e.g., `kyc-flow-uploads`)
5. Select your preferred region
6. Configure bucket settings (versioning, encryption, etc.)

#### 2. Create IAM User

1. Go to **IAM** service
2. Click **Users** → **Create user**
3. Choose **Programmatic access**
4. Attach policy: `AmazonS3FullAccess` (or create custom policy)
5. Copy the **Access Key ID** and **Secret Access Key**

#### 3. Configure CORS (Optional)

Add CORS configuration to your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### 4. Environment Configuration

#### For Cloudflare R2:
```bash
cp env.r2.example .env
```

Fill in your R2 credentials:

```env
# Storage Configuration
STORAGE_TYPE=r2

# Cloudflare R2 Credentials
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=https://your-bucket.your-domain.com
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_REGION=auto
```

#### For AWS S3:
```bash
cp env.s3.example .env
```

Fill in your AWS credentials:

```env
# Storage Configuration
STORAGE_TYPE=s3

# AWS S3 Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
```

### 5. Test the Integration

Run the test script to verify everything is working:

```bash
node scripts/testR2.js
```

## API Usage

### Generate Upload URL

```javascript
// Generate presigned upload URL
const uploadData = await storageService.generatePresignedUploadUrl('image/jpeg');

// Response:
{
  uploadUrl: "https://your-bucket.your-account-id.r2.cloudflarestorage.com/...",
  downloadUrl: "https://your-bucket.your-account-id.r2.cloudflarestorage.com/...",
  fileName: "kyc-uploads/1234567890-uuid.jpg",
  expiresIn: 3600,
  storageType: "r2"
}
```

### Upload File

```javascript
// Upload file using presigned URL
const response = await fetch(uploadData.uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': 'image/jpeg'
  }
});
```

### Generate Download URL

```javascript
// Generate presigned download URL for AI processing
const downloadData = await storageService.generateSecureDownloadUrl(fileName);

// Response:
{
  downloadUrl: "https://your-bucket.your-account-id.r2.cloudflarestorage.com/...",
  expiresIn: 300
}

// Generate presigned download URL for general use
const downloadData = await storageService.generatePresignedDownloadUrl(fileName, 3600);

// Response:
{
  downloadUrl: "https://your-bucket.your-account-id.r2.cloudflarestorage.com/...",
  expiresIn: 3600
}
```

## File Structure

Files are organized in R2 with the following structure:

```
kyc-uploads/
├── 1703123456789-uuid1.jpg    # ID card front
├── 1703123456790-uuid2.jpg    # ID card back
├── 1703123456791-uuid3.jpg    # Selfie 1
├── 1703123456792-uuid4.jpg    # Selfie 2
└── ...
```

## Security Features

### Presigned URLs
- **Upload URLs**: Expire in 1 hour
- **Download URLs**: Expire in 5 minutes (for AI processing) or 1 hour (for general use)
- **All URLs are presigned**: No public access without valid presigned URLs

### File Validation
- Only image files (JPEG, PNG) are allowed
- File size limit: 10MB
- Content-Type validation

### Access Control
- Files are private by default
- Access only through presigned URLs
- No public access without valid presigned URLs

## Cost Optimization

### R2 Pricing Benefits
- **No egress fees** (unlike AWS S3)
- **Low storage costs** ($0.015/GB/month)
- **Free tier**: 10GB storage, 1M requests/month

### Best Practices
1. **Use custom domains** to avoid R2 subdomain costs
2. **Set up lifecycle policies** to delete old files
3. **Compress images** before upload
4. **Use appropriate file formats** (JPEG for photos, PNG for documents)

## Monitoring and Maintenance

### Health Checks
```javascript
// Check R2 service health
const health = await r2StorageService.healthCheck();
console.log(health);
```

### File Management
```javascript
// List files
const files = await r2StorageService.listFiles('kyc-uploads');

// Delete file
await r2StorageService.deleteFile('kyc-uploads/file.jpg');

// Get file info
const info = await r2StorageService.getFileInfo('kyc-uploads/file.jpg');
```

### Cleanup Old Files
```javascript
// Clean up files older than 7 days
const result = await storageService.cleanupOldFiles(7);
console.log(`Deleted ${result.deleted} old files`);
```

## Troubleshooting

### Common Issues

1. **"R2 service not available"**
   - Check environment variables
   - Verify API token permissions
   - Ensure bucket exists

2. **"Failed to generate upload URL"**
   - Check R2 credentials
   - Verify bucket name
   - Check network connectivity

3. **"Invalid file path"**
   - Ensure file names start with `kyc-uploads/`
   - Check file extension is allowed

4. **"File not found"**
   - Verify file exists in bucket
   - Check file name spelling
   - Ensure file hasn't been deleted

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will show detailed logs of R2 operations.

## Migration from Local Storage

If you're migrating from local storage:

1. **Set storage type**:
   ```env
   STORAGE_TYPE=r2
   ```

2. **Upload existing files** to R2 bucket
3. **Update file URLs** in your database
4. **Test thoroughly** before going live

## Performance Considerations

### Upload Performance
- **Parallel uploads**: Upload multiple files simultaneously
- **Chunked uploads**: For large files, consider multipart uploads
- **Retry logic**: Implement retry for failed uploads

### Download Performance
- **CDN caching**: Use Cloudflare's CDN for faster downloads
- **Image optimization**: Serve optimized images
- **Lazy loading**: Load images on demand

## Security Best Practices

1. **Rotate API keys** regularly
2. **Use least privilege** for API tokens
3. **Monitor access logs** for suspicious activity
4. **Implement rate limiting** on upload endpoints
5. **Validate file types** and sizes
6. **Scan uploaded files** for malware (optional)

## Support

For issues with R2 integration:
1. Check the test script output
2. Review Cloudflare R2 documentation
3. Check your API token permissions
4. Verify bucket configuration

## Example Implementation

Here's a complete example of uploading and processing a file:

```javascript
import storageService from './services/storageService.js';

async function uploadAndProcessFile(file) {
  try {
    // 1. Generate upload URL
    const uploadData = await storageService.generatePresignedUploadUrl(file.type);
    
    // 2. Upload file
    const uploadResponse = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }
    
    // 3. Generate secure download URL for AI processing
    const downloadData = await storageService.generateSecureDownloadUrl(uploadData.fileName);
    
    // 4. Process file with AI
    const aiResult = await processWithAI(downloadData.downloadUrl);
    
    return {
      fileName: uploadData.fileName,
      downloadUrl: uploadData.downloadUrl,
      aiResult: aiResult
    };
    
  } catch (error) {
    console.error('Upload and processing failed:', error);
    throw error;
  }
}
```

