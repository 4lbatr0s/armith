import { v4 as uuidv4 } from 'uuid';
import { createError, determineStatus } from '../error-codes.js';
import { 
  IdCheckRequestSchema,
  SelfieCheckRequestSchema 
} from '../schemas.js';
import { 
  validateRequest 
} from '../validators.js';
import { 
  getIdPrompt, 
  SELFIE_PROMPT, 
} from '../prompts.js';
import storageService from '../services/storageService.js';
import { readDatabase, writeDatabase } from '../utils/database.js';
import llmService from '../services/llmService.js';

// Initialize LLM Service
llmService.initialize();


// Get supported countries
export const getSupportedCountries = async (req, res) => {
  const { SUPPORTED_COUNTRIES } = await import('../prompts.js');
  res.json({
    supportedCountries: SUPPORTED_COUNTRIES,
    message: 'List of supported country codes for ID verification'
  });
};

// Get LLM service status
export const getLLMStatus = async (req, res) => {
  try {
    const status = llmService.getStatus();
    res.json({
      status: 'success',
      llmService: status,
      message: 'LLM Service status retrieved successfully'
    });
  } catch (error) {
    console.error('LLM status check error:', error);
    res.status(500).json({
      status: 'failed',
      errors: [createError('INTERNAL_SERVER_ERROR')]
    });
  }
};

// Generate secure download URL for AI processing
export const generateSecureDownloadUrlEndpoint = async (req, res) => {
  try {
    const { fileName } = req.body;
    
    if (!fileName) {
      return res.status(400).json({
        status: 'failed',
        errors: [{
          code: 'MISSING_FILENAME',
          message: 'File name is required'
        }]
      });
    }

    const downloadData = await storageService.generateSecureDownloadUrl(fileName);
    
    res.json({
      success: true,
      downloadUrl: downloadData.downloadUrl,
      expiresIn: downloadData.expiresIn
    });
  } catch (error) {
    console.error('Secure download URL generation error:', error);
    res.status(500).json({
      status: 'failed',
      errors: [createError('INTERNAL_SERVER_ERROR')]
    });
  }
};



// Generate presigned upload URL
export const generateUploadUrl = async (req, res) => {
  try {
    
    const { fileType } = req.body;
    const uploadData = await storageService.generatePresignedUploadUrl(fileType);
    
    res.json({
      success: true,
      ...uploadData
    });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    res.status(500).json({
      status: 'failed',
    errors: [createError('INTERNAL_SERVER_ERROR')]
    });
  }
};

// ID verification endpoint
export const verifyId = async (req, res) => {
  try {
    // Validate request
    const validation = validateRequest(IdCheckRequestSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        status: 'failed',
        errors: validation.details.map(detail => ({
          code: 'INVALID_REQUEST',
          message: `${detail.field}: ${detail.message}`
        }))
      });
    }

    const { countryCode, frontImageUrl, backImageUrl } = validation.data;

    // Validate image URLs
    if (!storageService.isValidImageUrl(frontImageUrl) || (backImageUrl && !storageService.isValidImageUrl(backImageUrl))) {
      return res.status(400).json({
        status: 'failed',
        errors: [createError('INVALID_IMAGE_URL')]
      });
    }

    // Prepare prompt and images
    const promptTemplate = getIdPrompt(countryCode);
    
    // Create image messages for LangChain
    const imageMessages = [
      {
        type: "image_url",
        image_url: { url: frontImageUrl }
      }
    ];
    
    if (backImageUrl) {
      imageMessages.push({
        type: "image_url", 
        image_url: { url: backImageUrl }
      });
    }

    // Call LLM service for ID verification
    const llmResult = await llmService.verifyIdDocument(promptTemplate, imageMessages);
    
    if (!llmResult.success) {
      return res.status(500).json({
        status: 'failed',
        errors: [llmResult.error]
      });
    }

    const idData = llmResult.data;
    
    // Determine status (expired ID check is now handled in validator)
    const status = determineStatus(idData.errors);
    
    // Use error messages directly instead of mapping
    const rejectionReasons = idData.errors.map(error => error.message);

    // Save to database
    const userId = uuidv4();
    const database = await readDatabase();
    const userRecord = {
      id: userId,
      country: countryCode,
      idResult: {
        ...idData,
        status,
        rejectionReasons
      },
      selfieResult: null,
      status: status,
      createdAt: new Date().toISOString(),
      frontImageUrl,
      backImageUrl
    };  
  
    database.users.push(userRecord);
    await writeDatabase(database);

    // Response
    const response = {
      status,
      data: {
        fullName: idData.fullName || '',
        identityNumber: idData.identityNumber || '',
        dateOfBirth: idData.dateOfBirth || '',
        expiryDate: idData.expiryDate || '',
        gender: idData.gender || '',
        nationality: idData.nationality || '',
        serialNumber: idData.serialNumber || '',
        mrz: idData.mrz || '',
        address: idData.address || ''
      },
      errors: idData.errors || [],
      rejectionReasons,
      userId
    };

    res.json(response);

  } catch (error) {
    console.error('ID check error:', error);
    res.status(500).json({
      status: 'failed',
      errors: [createError('INTERNAL_SERVER_ERROR')]
    });
  }
};

// Selfie verification endpoint
export const verifySelfie = async (req, res) => {
  try {
    // Validate request
    const validation = validateRequest(SelfieCheckRequestSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        status: 'failed',
        errors: validation.details.map(detail => ({
          code: 'INVALID_REQUEST',
          message: `${detail.field}: ${detail.message}`
        }))
      });
    }

    const { idPhotoUrl, selfieUrls } = validation.data;

    // Validate image URLs
    const allUrls = [idPhotoUrl, ...selfieUrls];
    if (!allUrls.every(url => storageService.isValidImageUrl(url))) {
      return res.status(400).json({
        status: 'failed',
        errors: [createError('INVALID_IMAGE_URL')]
      });
    }

    // Prepare prompt and images
    const promptTemplate = SELFIE_PROMPT;
    
    // Create image messages for LangChain
    const imageMessages = [
      {
        type: "image_url",
        image_url: { 
          url: idPhotoUrl,
          detail: "high"
        }
      },
      ...selfieUrls.map(url => ({
        type: "image_url",
        image_url: { 
          url: url,
          detail: "high"
        }
      }))
    ];

    // Call LLM service for selfie verification
    const llmResult = await llmService.verifySelfie(promptTemplate, imageMessages);
    
    if (!llmResult.success) {
      return res.status(500).json({
        status: 'failed',
        errors: [llmResult.error]
      });
    }

    const selfieData = llmResult.data;
    
    // Extract confidence for status determination
    let confidence = null;
    if (selfieData.matchConfidence) {
      confidence = parseInt(selfieData.matchConfidence.toString().replace('%', ''));
    }

    // Determine status (validation is now handled in validator)
    const status = determineStatus(selfieData.errors, selfieData.isMatch, confidence);

    // Response
    const response = {
      status,
      matchConfidence: selfieData.matchConfidence || '',
      isMatch: selfieData.isMatch,
      spoofingRisk: selfieData.spoofingRisk || false,
      imageQualityIssues: selfieData.imageQualityIssues || [],
      errors: selfieData.errors || [],
      rejectionReasons: selfieData.errors.map(error => error.message) // Use error messages directly
    };

    res.json(response);

  } catch (error) {
    console.error('Selfie check error:', error);
    res.status(500).json({
      status: 'failed',
      errors: [createError('INTERNAL_SERVER_ERROR')]
    });
  }
};

// Get user verification status
export const getUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const database = await readDatabase();
    const user = database.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'failed',
        errors: [{
          code: 'USER_NOT_FOUND',
          message: 'User verification record not found'
        }]
      });
    }

    res.json({
      status: user.status,
      idResult: user.idResult,
      selfieResult: user.selfieResult,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      status: 'failed',
      errors: [createError('INTERNAL_SERVER_ERROR')]
    });
  }
}; 