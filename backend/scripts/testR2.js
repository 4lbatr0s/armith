import storageService from '../services/storageService.js';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Test script for Storage Service (R2)
 */
async function testStorageService() {
  console.log('🧪 Testing Storage Service (R2)...\n');

  try {
    // Test 1: Check service availability
    console.log('1️⃣ Testing service availability...');
    const isAvailable = storageService.isAvailable();
    console.log(`   Service Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);
    
    if (!isAvailable) {
      console.log('   ⚠️  Service not configured. Please check your environment variables.');
      console.log('   Required variables: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT');
      return;
    }

    // Test 2: Get configuration
    console.log('\n2️⃣ Testing configuration...');
    const config = storageService.getConfig();
    console.log('   Configuration:', JSON.stringify(config, null, 2));

    // Test 3: Health check
    console.log('\n3️⃣ Testing health check...');
    const healthCheck = await storageService.healthCheck();
    console.log('   Health Check:', JSON.stringify(healthCheck, null, 2));

    // Test 4: Generate presigned upload URL (tenant-scoped)
    console.log('\n4️⃣ Testing presigned upload URL generation...');
    const scriptTenantId =
      process.env.SCRIPT_STORAGE_TENANT_ID || 'local-r2-script-tenant';
    const uploadResult = await storageService.generatePresignedUploadUrl(
      'image/jpeg',
      scriptTenantId,
      null
    );
    console.log('   Upload URL generated:', uploadResult.uploadUrl ? '✅ Yes' : '❌ No');
    console.log('   File name:', uploadResult.fileName);
    console.log('   Download URL (presigned):', uploadResult.downloadUrl ? '✅ Yes' : '❌ No');
    console.log('   Storage Type:', uploadResult.storageType);
    console.log('   Expires in:', uploadResult.expiresIn, 'seconds');

    // Test 5: Test presigned URL generation for existing files
    console.log('\n5️⃣ Testing presigned URL generation for existing files...');
    try {
      const presignedResult = await storageService.generatePresignedUrl(uploadResult.fileName, 1800);
      console.log('   Presigned URL generated:', presignedResult.downloadUrl ? '✅ Yes' : '❌ No');
      console.log('   Expires in:', presignedResult.expiresIn, 'seconds');
    } catch (error) {
      console.log('   Presigned URL generation:', '⚠️  File not uploaded yet (expected for test)');
    }

    // Test 6: Test URL validation
    console.log('\n6️⃣ Testing URL validation...');
    const testUrl = uploadResult.downloadUrl;
    const isValid = storageService.isValidImageUrl(testUrl);
    console.log(`   URL validation: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

    console.log('\n🎉 Storage service test completed successfully!');

  } catch (error) {
    console.error('\n❌ Storage service test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testStorageService();

