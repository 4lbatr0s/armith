import storageService from '../services/storageService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Test script for actual file upload to R2
 */
async function testFileUpload() {
  console.log('🧪 Testing File Upload to R2...\n');

  try {
    // Test 1: Check service availability
    console.log('1️⃣ Checking service availability...');
    const isAvailable = storageService.isAvailable();
    console.log(`   Service Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);
    
    if (!isAvailable) {
      console.log('   ⚠️  Service not configured. Please check your environment variables.');
      return;
    }

    // Test 2: Generate presigned upload URL
    console.log('\n2️⃣ Generating presigned upload URL...');
    const uploadResult = await storageService.generatePresignedUploadUrl('image/jpeg');
    
    console.log('   📤 UPLOAD URL:');
    console.log(`   ${uploadResult.uploadUrl}`);
    console.log(`   📁 File Name: ${uploadResult.fileName}`);
    console.log(`   ⏰ Upload URL expires in: ${uploadResult.expiresIn} seconds`);
    console.log(`   🏷️  Storage Type: ${uploadResult.storageType}`);
    
    console.log('\n   📥 DOWNLOAD URL (presigned):');
    console.log(`   ${uploadResult.downloadUrl}`);
    console.log(`   ⏰ Download URL expires in: ${uploadResult.expiresIn} seconds`);

    // Test 3: Create a test image (simple 1x1 pixel JPEG)
    console.log('\n3️⃣ Creating test image data...');
    const testImageData = createTestImage();
    console.log(`   📊 Test image size: ${testImageData.length} bytes`);

    // Test 4: Upload the test image
    console.log('\n4️⃣ Uploading test image to R2...');
    const uploadResponse = await fetch(uploadResult.uploadUrl, {
      method: 'PUT',
      body: testImageData,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': testImageData.length.toString()
      }
    });

    if (uploadResponse.ok) {
      console.log('   ✅ Upload successful!');
      console.log(`   📊 Response status: ${uploadResponse.status}`);
    } else {
      console.log('   ❌ Upload failed!');
      console.log(`   📊 Response status: ${uploadResponse.status}`);
      console.log(`   📊 Response text: ${await uploadResponse.text()}`);
      return;
    }

    // Test 5: Verify file exists
    console.log('\n5️⃣ Verifying file exists...');
    const fileExists = await storageService.fileExists(uploadResult.fileName);
    console.log(`   📁 File exists: ${fileExists ? '✅ Yes' : '❌ No'}`);

    if (fileExists) {
      // Test 6: Get file metadata
      console.log('\n6️⃣ Getting file metadata...');
      const metadata = await storageService.getFileMetadata(uploadResult.fileName);
      console.log('   📊 File metadata:');
      console.log(`   - Size: ${metadata.size} bytes`);
      console.log(`   - Content Type: ${metadata.contentType}`);
      console.log(`   - Last Modified: ${metadata.lastModified}`);
      console.log(`   - Metadata: ${JSON.stringify(metadata.metadata, null, 2)}`);

      // Test 7: Generate new presigned download URL
      console.log('\n7️⃣ Generating new presigned download URL...');
      const downloadResult = await storageService.generatePresignedDownloadUrl(uploadResult.fileName, 3600);
      console.log('   📥 NEW DOWNLOAD URL (presigned):');
      console.log(`   ${downloadResult.downloadUrl}`);
      console.log(`   ⏰ Expires in: ${downloadResult.expiresIn} seconds`);

      // Test 8: Test download URL
      console.log('\n8️⃣ Testing download URL...');
      const downloadResponse = await fetch(downloadResult.downloadUrl);
      if (downloadResponse.ok) {
        console.log('   ✅ Download URL works!');
        console.log(`   📊 Downloaded size: ${downloadResponse.headers.get('content-length')} bytes`);
        console.log(`   📊 Content Type: ${downloadResponse.headers.get('content-type')}`);
      } else {
        console.log('   ❌ Download URL failed!');
        console.log(`   📊 Response status: ${downloadResponse.status}`);
      }

      // Test 9: Generate secure download URL for AI processing
      console.log('\n9️⃣ Generating secure download URL for AI processing...');
      const secureDownloadResult = await storageService.generateSecureDownloadUrl(uploadResult.fileName);
      console.log('   🔒 SECURE DOWNLOAD URL (for AI):');
      console.log(`   ${secureDownloadResult.downloadUrl}`);
      console.log(`   ⏰ Expires in: ${secureDownloadResult.expiresIn} seconds`);

      // Test 10: List files
      console.log('\n🔟 Listing files in kyc-uploads...');
      const fileList = await storageService.listFiles('kyc-uploads', 10, 3600);
      console.log(`   📁 Found ${fileList.files.length} files:`);
      fileList.files.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.Key}`);
        console.log(`      Size: ${file.Size} bytes`);
        console.log(`      Modified: ${file.LastModified}`);
        console.log(`      Download URL: ${file.downloadUrl ? '✅ Available' : '❌ Not available'}`);
      });

    } else {
      console.log('   ❌ File not found after upload!');
    }

    console.log('\n🎉 File upload test completed successfully!');

  } catch (error) {
    console.error('\n❌ File upload test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Create a simple test image (1x1 pixel JPEG)
 */
function createTestImage() {
  // This is a minimal 1x1 pixel JPEG image
  const jpegData = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
    0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
    0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14,
    0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02,
    0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x80, 0xFF, 0xD9
  ]);
  return jpegData;
}

// Run the test
testFileUpload();
