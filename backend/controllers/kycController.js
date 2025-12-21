import { v4 as uuidv4 } from 'uuid';
import { ERRORS, STATUS } from '../kyc/config.js';
import { verifyId as kycVerifyId, verifySelfie as kycVerifySelfie } from '../kyc/verify.js';
import {
  IdCheckRequestSchema,
  SelfieCheckRequestSchema,
  validateRequest
} from '../schemas.js';
import storageService from '../services/storageService.js';
import { readDatabase, writeDatabase, readSettings } from '../utils/database.js';

// Helper function to get current thresholds from settings
const getThresholds = async () => {
  const settings = await readSettings();
  return settings.thresholds;
};

// Helper function to get verification rules from settings
const getVerificationRules = async () => {
  const settings = await readSettings();
  return settings.verificationRules;
};

// Get supported countries
export const getSupportedCountries = async (req, res) => {
  // Only Turkish ID is supported
  res.json({
    supportedCountries: {
      tr: { name: 'Turkish Republic ID Card' }
    },
    message: 'List of supported country codes for ID verification'
  });
};

// Get LLM service status
export const getLLMStatus = async (req, res) => {
  try {
    res.json({
      status: 'success',
      llmService: {
        initialized: true,
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        supportedCountries: ['tr']
      },
      message: 'KYC Service status retrieved successfully'
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

// Generate secure download URL for AI processing
export const generateSecureDownloadUrlEndpoint = async (req, res) => {
  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({
        status: STATUS.FAILED,
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
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

// Generate presigned upload URL
export const generateUploadUrl = async (req, res) => {
  try {
    const { fileType, userId, documentType } = req.body;
    
    // Validate documentType if provided
    const validDocumentTypes = ['id-front', 'id-back', 'selfie'];
    if (documentType && !validDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [{
          code: 'INVALID_DOCUMENT_TYPE',
          message: `Document type must be one of: ${validDocumentTypes.join(', ')}`
        }]
      });
    }
    
    const uploadData = await storageService.generatePresignedUploadUrl(fileType, userId, documentType);

    res.json({
      success: true,
      ...uploadData
    });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
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
        status: STATUS.FAILED,
        errors: validation.details.map(detail => ({
          code: 'INVALID_REQUEST',
          message: `${detail.field}: ${detail.message}`
        }))
      });
    }

    const { countryCode, frontImageUrl, backImageUrl } = validation.data;

    // Only TR is supported
    if (countryCode.toLowerCase() !== 'tr') {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [{
          code: 'UNSUPPORTED_COUNTRY',
          message: 'Only Turkish ID (TR) is currently supported'
        }]
      });
    }

    // Validate image URLs
    if (!storageService.isValidImageUrl(frontImageUrl) || (backImageUrl && !storageService.isValidImageUrl(backImageUrl))) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [ERRORS.INVALID_IMAGE_URL]
      });
    }

    // Call KYC verification
    const result = await kycVerifyId(frontImageUrl, backImageUrl);

    if (!result.success) {
      return res.status(500).json({
        status: result.status,
        errors: [result.error]
      });
    }

    // Generate rejection reasons from errors
    const rejectionReasons = result.errors.map(error => error.message);

    // Get verification rules from settings
    const verificationRules = await getVerificationRules();
    
    // Save to database
    const userId = uuidv4();
    const database = await readDatabase();
    
    // Determine overall status based on settings:
    let overallStatus;
    let message;
    
    if (result.status === STATUS.FAILED) {
      overallStatus = STATUS.FAILED;
    } else if (result.status === STATUS.REJECTED) {
      overallStatus = STATUS.REJECTED;
    } else {
      // ID approved - check if selfie is required
      if (verificationRules.requireSelfie) {
        // Selfie required -> status is pending
        overallStatus = STATUS.PENDING;
        message = 'ID verification successful. Please complete selfie verification.';
      } else {
        // Selfie not required -> user is fully verified
        overallStatus = STATUS.APPROVED;
        message = 'Verification complete! ID verification successful.';
      }
    }
    
    const userRecord = {
      id: userId,
      country: countryCode,
      idResult: {
        ...result.data,
        confidence: result.confidence,
        status: result.status,
        errors: result.errors,
        rejectionReasons
      },
      selfieResult: null,
      status: overallStatus,
      createdAt: new Date().toISOString(),
      frontImageUrl,
      backImageUrl
    };

    database.users.push(userRecord);
    await writeDatabase(database);

    // Response
    res.json({
      status: overallStatus,           // Overall status
      idStatus: result.status,         // ID-specific status
      data: result.data,
      confidence: result.confidence,
      errors: result.errors,
      rejectionReasons,
      userId,
      images: {
        front: frontImageUrl,
        back: backImageUrl || null
      },
      message,
      verificationRules                // Send rules so frontend knows what's required
    });

  } catch (error) {
    console.error('ID check error:', error);
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
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
        status: STATUS.FAILED,
        errors: validation.details.map(detail => ({
          code: 'INVALID_REQUEST',
          message: `${detail.field}: ${detail.message}`
        }))
      });
    }

    const { idPhotoUrl, selfieUrls, verificationId } = validation.data;

    // Validate image URLs
    const allUrls = [idPhotoUrl, ...selfieUrls];
    if (!allUrls.every(url => storageService.isValidImageUrl(url))) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [ERRORS.INVALID_IMAGE_URL]
      });
    }

    // Call KYC verification
    const result = await kycVerifySelfie(idPhotoUrl, selfieUrls);

    if (!result.success) {
      return res.status(500).json({
        status: result.status,
        errors: [result.error]
      });
    }

    // Generate rejection reasons from errors
    const rejectionReasons = result.errors.map(error => error.message);

    // Get verification rules from settings
    const verificationRules = await getVerificationRules();

    // Update database if verificationId provided
    let overallStatus = result.status;
    
    if (verificationId) {
      const database = await readDatabase();
      const userIndex = database.users.findIndex(u => u.id === verificationId);
      
      if (userIndex !== -1) {
        // Update user record with selfie result
        database.users[userIndex].selfieResult = {
          ...result.data,
          status: result.status,
          errors: result.errors,
          rejectionReasons
        };
        database.users[userIndex].selfieImageUrl = selfieUrls[0];
        
        // Calculate overall status based on settings
        const idStatus = database.users[userIndex].idResult?.status;
        const selfieStatus = result.status;
        
        // Check what's required according to settings
        const idRequired = verificationRules.requireIdCard;
        const selfieRequired = verificationRules.requireSelfie;
        
        // Determine approval based on requirements
        const idOk = !idRequired || idStatus === STATUS.APPROVED;
        const selfieOk = !selfieRequired || selfieStatus === STATUS.APPROVED;
        
        // Check for failures
        const hasFailed = (idRequired && idStatus === STATUS.FAILED) || 
                          (selfieRequired && selfieStatus === STATUS.FAILED);
        const hasRejection = (idRequired && idStatus === STATUS.REJECTED) || 
                             (selfieRequired && selfieStatus === STATUS.REJECTED);
        
        if (hasFailed) {
          overallStatus = STATUS.FAILED;
        } else if (hasRejection) {
          overallStatus = STATUS.REJECTED;
        } else if (idOk && selfieOk) {
          overallStatus = STATUS.APPROVED;
        } else {
          overallStatus = STATUS.PENDING;
        }
        
        database.users[userIndex].status = overallStatus;
        await writeDatabase(database);
      }
    }

    // Response
    res.json({
      status: overallStatus,           // Overall verification status
      selfieStatus: result.status,     // Selfie-specific status
      data: result.data,
      errors: result.errors,
      rejectionReasons,
      images: {
        idPhoto: idPhotoUrl,
        selfies: selfieUrls
      },
      verificationId,
      verificationRules
    });

  } catch (error) {
    console.error('Selfie check error:', error);
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

// Get user verification status - full details
export const getUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const database = await readDatabase();
    const user = database.users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({
        status: STATUS.FAILED,
        errors: [{
          code: 'USER_NOT_FOUND',
          message: 'User verification record not found'
        }]
      });
    }

    // Get current settings
    const verificationRules = await getVerificationRules();
    const thresholds = await getThresholds();

    // Determine what's missing for verification
    const idCompleted = !!user.idResult;
    const selfieCompleted = !!user.selfieResult;
    const idApproved = user.idResult?.status === STATUS.APPROVED;
    const selfieApproved = user.selfieResult?.status === STATUS.APPROVED;
    
    // Calculate verification progress based on rules
    const idRequired = verificationRules.requireIdCard;
    const selfieRequired = verificationRules.requireSelfie;
    
    let verificationProgress = {
      idVerification: {
        required: idRequired,
        completed: idCompleted,
        approved: idApproved
      },
      selfieVerification: {
        required: selfieRequired,
        completed: selfieCompleted,
        approved: selfieApproved
      },
      isFullyVerified: (!idRequired || idApproved) && (!selfieRequired || selfieApproved)
    };
    
    // Return full verification details
    res.json({
      id: user.id,
      status: user.status,
      country: user.country,
      createdAt: user.createdAt,
      
      // Verification Rules
      verificationRules,
      
      // Verification Progress
      progress: verificationProgress,
      
      // ID Verification
      idVerification: user.idResult ? {
        status: user.idResult.status,
        data: {
          fullName: user.idResult.fullName,
          identityNumber: user.idResult.identityNumber,
          dateOfBirth: user.idResult.dateOfBirth,
          expiryDate: user.idResult.expiryDate,
          gender: user.idResult.gender,
          nationality: user.idResult.nationality,
          serialNumber: user.idResult.serialNumber,
          mrz: user.idResult.mrz,
          address: user.idResult.address,
          documentCondition: user.idResult.documentCondition,
          countryCode: user.idResult.countryCode
        },
        confidence: user.idResult.confidence || {
          fullName: user.idResult.fullNameConfidence,
          identityNumber: user.idResult.identityNumberConfidence,
          dateOfBirth: user.idResult.dateOfBirthConfidence,
          expiryDate: user.idResult.expiryDateConfidence,
          imageQuality: user.idResult.imageQuality
        },
        errors: user.idResult.errors || [],
        rejectionReasons: user.idResult.rejectionReasons || []
      } : null,
      
      // Selfie Verification
      selfieVerification: user.selfieResult ? {
        status: user.selfieResult.status,
        data: {
          isMatch: user.selfieResult.isMatch,
          matchConfidence: user.selfieResult.matchConfidence,
          spoofingRisk: user.selfieResult.spoofingRisk,
          faceCount: user.selfieResult.faceCount,
          lightingCondition: user.selfieResult.lightingCondition,
          faceSize: user.selfieResult.faceSize,
          faceCoverage: user.selfieResult.faceCoverage,
          faceDetectionConfidence: user.selfieResult.faceDetectionConfidence,
          imageQuality: user.selfieResult.imageQuality,
          imageQualityIssues: user.selfieResult.imageQualityIssues
        },
        errors: user.selfieResult.errors || [],
        rejectionReasons: user.selfieResult.rejectionReasons || []
      } : null,
      
      // Images
      images: {
        idFront: user.frontImageUrl,
        idBack: user.backImageUrl,
        selfie: user.selfieImageUrl || null
      },
      
      // Thresholds (for reference) - from settings
      thresholds
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};
