/**
 * KYC Controller
 * Handles ID card and selfie verification endpoints
 */

import { ERRORS, STATUS, formatStructuredError, THRESHOLDS } from '../kyc/config.js';
import { verifyId as kycVerifyId, verifySelfie as kycVerifySelfie } from '../kyc/verify.js';
import { IdCheckRequestSchema, SelfieCheckRequestSchema, validateRequest } from '../schemas.js';
import storageService from '../services/storageService.js';
import { Profile, IdCardValidation, SelfieValidation, KycConfiguration } from '../models/index.js';
import { createDefaultConfig } from '../kyc/defaults.js';
import logger from '../lib/logger.js';
import { VerificationService } from '../src/services/verification.service.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getUserConfig(userId) {
  if (!userId) return null;

  try {
    let config = await KycConfiguration.findOne({ userId, environment: 'production' });
    if (!config) {
      config = await KycConfiguration.create(createDefaultConfig(userId));
    }
    return config;
  } catch (error) {
    logger.error({ error: error.message, userId }, 'Failed to get user config');
    return null;
  }
}

function getVerificationRulesFromConfig(config) {
  return config ? config.verificationSteps : { requireIdCard: true, requireSelfie: true };
}

// Deduplicate rejection reasons by numericCode
const deduplicateReasons = (existing, newReasons) => {
  const seen = new Set();
  return [...(existing || []), ...newReasons].filter(reason => {
    if (!reason || !reason.numericCode) return true; // Keep old strings or non-standard objects
    if (seen.has(reason.numericCode)) return false;
    seen.add(reason.numericCode);
    return true;
  });
};

// ============================================================================
// ENDPOINTS
// ============================================================================ //

export const getSupportedCountries = async (req, res) => {
  res.json({
    countries: [
      { code: 'TR', name: 'Turkey', supportedDocuments: ['NATIONAL_ID'] },
      { code: 'DE', name: 'Germany', supportedDocuments: ['NATIONAL_ID', 'PASSPORT'] },
      { code: 'GB', name: 'United Kingdom', supportedDocuments: ['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE'] }
    ]
  });
};

/**
 * Get LLM service status
 */
export const getLLMStatus = async (req, res) => {
  try {
    res.json({
      status: 'success',
      llmService: {
        initialized: true,
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        supportedCountries: ['TR', 'DE', 'GB']
      },
      message: 'KYC Service status retrieved successfully'
    });
  } catch (error) {
    logger.error({ error }, 'LLM status check error');
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

/**
 * Generate secure download URL for AI processing
 */
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
    logger.error({ error, fileName: req.body.fileName }, 'Secure download URL generation error');
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

/**
 * Generate presigned upload URL
 */
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
    logger.error({ error }, 'Upload URL generation error');
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

/**
 * ID verification endpoint
 */
export const verifyId = async (req, res) => {
  try {
    const validation = validateRequest(IdCheckRequestSchema, req.body);

    if (!validation.success) {

      logger.warn({ details: validation.details }, 'Invalid ID verification request');

      return res.status(400).json({
        status: STATUS.FAILED,
        errors: validation.details.map(d => ({ code: ERRORS.INVALID_REQUEST.code, message: `${d.field}: ${d.message}` }))
      });
    }

    const { countryCode = 'TR', frontImageUrl, backImageUrl } = validation.data;

    const authUserId = req.auth?.userId;

    const userConfig = await getUserConfig(authUserId);

    // Ensure config has correct countryCode
    const effectiveConfig = {

      ...(userConfig?.toObject() || createDefaultConfig(authUserId || 'system', countryCode)),

      countryCode: countryCode.toUpperCase()
    };

    logger.info({ authUserId, countryCode }, 'Starting ID verification with new flow');

    // Call NEW Verification Service
    const result = await VerificationService.verifyId(effectiveConfig, {
      front: frontImageUrl,
      back: backImageUrl
    });

    if (!result.success) {

      logger.error({ result }, 'ID verification failed internally');

      return res.status(500).json({ status: result.status, errors: result.errors });
    }

    const verificationRules = effectiveConfig.verificationSteps || { requireIdCard: true, requireSelfie: true };
    const rejectionReasons = result.errors.map(e => formatStructuredError(e.code, e.field, e.message));

    // Determine overall status
    let overallStatus = result.status;
    if (result.status === STATUS.APPROVED && verificationRules.requireSelfie) {
      overallStatus = STATUS.PENDING;
    }

    // Find or create Profile
    // Try to find existing profile by userId first, or by country+identityNumber if identityNumber exists
    let profile = await Profile.findOne({ userId: authUserId });

    if (!profile && result.data?.identityNumber) {
      // Try to find by country + identityNumber
      profile = await Profile.findOne({
        country: countryCode.toUpperCase(),
        identityNumber: result.data.identityNumber
      });
    }

    if (profile) {
      // Update existing profile
      profile.country = countryCode.toUpperCase();
      profile.status = overallStatus.toUpperCase();
      profile.idVerificationStatus = result.status.toUpperCase();

      // Only update ID card information if ID verification is APPROVED
      if (result.status === STATUS.APPROVED) {
        profile.fullName = `${result.data?.firstName} ${result.data?.lastName}`.trim() || profile.fullName;
        profile.firstName = result.data?.firstName || profile.firstName;
        profile.lastName = result.data?.lastName || profile.lastName;
        profile.identityNumber = result.data?.identityNumber || profile.identityNumber;
        profile.dateOfBirth = result.data?.dateOfBirth ? new Date(result.data.dateOfBirth) : profile.dateOfBirth;
        profile.gender = result.data?.gender || profile.gender;
        profile.nationality = result.data?.nationality || profile.nationality;

        // Additional ID card information
        profile.serialNumber = result.data?.serialNumber || profile.serialNumber;
        profile.expiryDate = result.data?.expiryDate ? new Date(result.data.expiryDate) : profile.expiryDate;
        profile.address = result.data?.address || profile.address;
        profile.documentCondition = result.data?.documentCondition?.toUpperCase() || profile.documentCondition;
        profile.overallConfidence = result.confidence?.overallConfidence || result.confidence?.imageQuality || profile.overallConfidence;

        // Image URLs
        profile.idFrontImageUrl = frontImageUrl;
        if (backImageUrl) profile.idBackImageUrl = backImageUrl;
      }

      // Verification metadata (always update)
      profile.verificationAttempts = (profile.verificationAttempts || 0) + 1;
      profile.lastVerificationAttempt = new Date();
      if (rejectionReasons.length > 0) {
        profile.rejectionReasons = deduplicateReasons(profile.rejectionReasons, rejectionReasons);
      }

      await profile.save();

    } else {
      // Create new profile
      profile = await Profile.create({
        userId: authUserId,
        fullName: `${result.data?.firstName} ${result.data?.lastName}`.trim(),
        firstName: result.data?.firstName,
        lastName: result.data?.lastName,
        identityNumber: result.data?.identityNumber,
        dateOfBirth: result.data?.dateOfBirth ? new Date(result.data.dateOfBirth) : null,
        gender: result.data?.gender,
        nationality: result.data?.nationality,
        country: countryCode.toUpperCase(),
        status: overallStatus.toUpperCase(),
        idVerificationStatus: result.status.toUpperCase(),

        // Additional ID card information
        serialNumber: result.data?.serialNumber,
        expiryDate: result.data?.expiryDate ? new Date(result.data.expiryDate) : null,
        address: result.data?.address,
        documentCondition: result.data?.documentCondition?.toUpperCase(),
        overallConfidence: result.confidence?.overallConfidence || result.confidence?.imageQuality,

        // Image URLs
        idFrontImageUrl: frontImageUrl,
        idBackImageUrl: backImageUrl || null,

        // Verification metadata
        verificationAttempts: 1,
        lastVerificationAttempt: new Date(),
        rejectionReasons: rejectionReasons,
      });
    }

    // Create IdCardValidation
    await IdCardValidation.create({
      profileId: profile._id,
      countryCode: countryCode.toUpperCase(),
      frontImageUrl,
      backImageUrl,
      fullName: `${result.data?.firstName} ${result.data?.lastName}`.trim(),
      firstName: result.data?.firstName,
      lastName: result.data?.lastName,
      identityNumber: result.data?.identityNumber,
      dateOfBirth: result.data?.dateOfBirth ? new Date(result.data.dateOfBirth) : null,
      expiryDate: result.data?.expiryDate ? new Date(result.data.expiryDate) : null,
      gender: result.data?.gender,
      nationality: result.data?.nationality,
      serialNumber: result.data?.serialNumber,
      mrz: result.mrz?.raw,
      mrzInfo: result.mrz?.parsed,
      address: result.data?.address,
      documentCondition: result.data?.documentCondition?.toUpperCase(),
      fullNameConfidence: Math.min(result.confidence?.firstNameConfidence || 0, result.confidence?.lastNameConfidence || 0),
      firstNameConfidence: result.confidence?.firstNameConfidence,
      lastNameConfidence: result.confidence?.lastNameConfidence,
      identityNumberConfidence: result.confidence?.identityNumberConfidence,
      dateOfBirthConfidence: result.confidence?.dateOfBirthConfidence,
      expiryDateConfidence: result.confidence?.expiryDateConfidence,
      mrzConfidence: result.confidence?.mrzConfidence,
      imageQuality: result.confidence?.imageQuality || result.data?.quality?.imageQuality,
      status: result.status.toUpperCase(),
      errors: result.errors,
      rejectionReasons,
    });

    logger.info({ profileId: profile._id, status: overallStatus }, 'ID verification completed');

    const confidenceScores = [
      { threshold: effectiveConfig.idCardThresholds?.minFullNameConfidence || THRESHOLDS.fullNameConfidence, confidenceValueName: 'firstName', confidenceScore: result.confidence?.firstNameConfidence },
      { threshold: effectiveConfig.idCardThresholds?.minFullNameConfidence || THRESHOLDS.fullNameConfidence, confidenceValueName: 'lastName', confidenceScore: result.confidence?.lastNameConfidence },
      { threshold: effectiveConfig.idCardThresholds?.minIdentityNumberConfidence || THRESHOLDS.identityNumberConfidence, confidenceValueName: 'identityNumber', confidenceScore: result.confidence?.identityNumberConfidence },
      { threshold: effectiveConfig.idCardThresholds?.minDateOfBirthConfidence || THRESHOLDS.dateOfBirthConfidence, confidenceValueName: 'dateOfBirth', confidenceScore: result.confidence?.dateOfBirthConfidence },
      { threshold: effectiveConfig.idCardThresholds?.minExpiryDateConfidence || THRESHOLDS.expiryDateConfidence, confidenceValueName: 'expiryDate', confidenceScore: result.confidence?.expiryDateConfidence },
      { threshold: effectiveConfig.idCardThresholds?.minImageQuality || THRESHOLDS.imageQuality, confidenceValueName: 'imageQuality', confidenceScore: result.confidence?.imageQuality || result.data?.quality?.imageQuality }
    ];

    res.json({
      status: overallStatus,
      idStatus: result.status,
      data: result.data,
      confidence: result.confidence,
      confidenceScores,
      errors: result.errors,
      rejectionReasons,
      profileId: profile._id,
      images: { front: frontImageUrl, back: backImageUrl || null },
      message: overallStatus === STATUS.PENDING ? 'ID verification successful. Please complete selfie verification.' : 'Verification complete!',
      verificationRules,
    });

  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Unexpected error in verifyId');
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/**
 * Selfie verification endpoint
 */
export const verifySelfie = async (req, res) => {
  try {
    const validation = validateRequest(SelfieCheckRequestSchema, req.body);
    if (!validation.success) {
      logger.warn({ details: validation.details }, 'Invalid selfie verification request');
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: validation.details.map(d => ({ code: ERRORS.INVALID_REQUEST.code, message: `${d.field}: ${d.message}` }))
      });
    }

    const { idPhotoUrl, selfieUrls, profileId: profileIdFromBody, verificationId } = validation.data;
    // Support both profileId and verificationId (legacy)
    const profileId = profileIdFromBody || verificationId;

    const allUrls = [idPhotoUrl, ...selfieUrls];
    if (!allUrls.every(url => storageService.isValidImageUrl(url))) {
      return res.status(400).json({ status: STATUS.FAILED, errors: [ERRORS.INVALID_IMAGE_URL] });
    }

    const authUserId = req.auth?.userId;
    const userConfig = await getUserConfig(authUserId);
    const verificationRules = getVerificationRulesFromConfig(userConfig);

    logger.info({ authUserId, profileId }, 'Starting selfie verification');

    const result = await kycVerifySelfie(idPhotoUrl, selfieUrls, userConfig);

    if (!result.success) {
      logger.error({ result }, 'Selfie verification failed internally');
      return res.status(500).json({ status: result.status, errors: [result.error] });
    }

    const rejectionReasons = result.errors.map(e => formatStructuredError(e.code, e.field, e.message));
    let overallStatus = result.status;

    // Update profile if profileId provided
    if (profileId) {
      const profile = await Profile.findById(profileId);
      if (profile) {
        const idValidation = await IdCardValidation.findOne({ profileId });
        const idStatus = idValidation?.status || 'PENDING';

        // Determine overall status
        const idOk = !verificationRules.requireIdCard || idStatus === 'APPROVED';
        const selfieOk = !verificationRules.requireSelfie || result.status === STATUS.APPROVED;

        if (idOk && selfieOk) {
          overallStatus = STATUS.APPROVED;
        } else if (result.status === STATUS.FAILED || idStatus === 'FAILED') {
          overallStatus = STATUS.FAILED;
        } else if (result.status === STATUS.REJECTED || idStatus === 'REJECTED') {
          overallStatus = STATUS.REJECTED;
        }

        profile.status = overallStatus.toUpperCase();
        profile.selfieVerificationStatus = result.status.toUpperCase();
        profile.idVerificationStatus = idStatus;

        // Selfie verification summary
        profile.selfieMatchConfidence = result.data?.matchConfidence || profile.selfieMatchConfidence;
        profile.selfieSpoofingRisk = result.data?.spoofingRisk || profile.selfieSpoofingRisk;
        profile.selfieImageUrl = selfieUrls[0] || profile.selfieImageUrl;

        // Verification metadata
        profile.verificationAttempts = (profile.verificationAttempts || 0) + 1;
        profile.lastVerificationAttempt = new Date();
        if (rejectionReasons.length > 0) {
          profile.rejectionReasons = deduplicateReasons(profile.rejectionReasons, rejectionReasons);
        }

        await profile.save();

        // Create SelfieValidation
        await SelfieValidation.create({
          profileId: profile._id,
          idPhotoUrl,
          selfieUrls,
          isMatch: result.data?.isMatch,
          matchConfidence: result.data?.matchConfidence,
          spoofingRisk: result.data?.spoofingRisk,
          faceCount: result.data?.faceCount,
          imageQualityIssues: result.data?.imageQualityIssues,
          lightingCondition: result.data?.lightingCondition?.toUpperCase(),
          faceSize: result.data?.faceSize?.toUpperCase(),
          faceCoverage: result.data?.faceCoverage?.toUpperCase(),
          imageQuality: result.data?.imageQuality,
          faceDetectionConfidence: result.data?.faceDetectionConfidence,
          status: result.status.toUpperCase(),
          errors: result.errors,
          rejectionReasons,
        });

        logger.info({ profileId, status: overallStatus }, 'Selfie verification completed and profile updated');
      } else {
        logger.warn({ profileId }, 'Profile not found during selfie verification');
      }
    }

    const confidenceScores = [
      { threshold: userConfig?.selfieThresholds?.minMatchConfidence || THRESHOLDS.matchConfidence, confidenceValueName: 'matchConfidence', confidenceScore: result.data?.matchConfidence },
      { threshold: userConfig?.selfieThresholds?.minFacialFeatureConfidence || THRESHOLDS.faceDetectionConfidence, confidenceValueName: 'faceDetectionConfidence', confidenceScore: result.data?.faceDetectionConfidence },
      { threshold: userConfig?.selfieThresholds?.maxSpoofingRisk || THRESHOLDS.spoofingRiskMax, confidenceValueName: 'spoofingRisk', confidenceScore: result.data?.spoofingRisk }
    ];

    res.json({
      status: overallStatus,
      selfieStatus: result.status,
      data: result.data,
      confidenceScores,
      errors: result.errors,
      rejectionReasons,
      images: { idPhoto: idPhotoUrl, selfies: selfieUrls },
      profileId,
      verificationRules,
    });

  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Unexpected error in verifySelfie');
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/**
 * Get user verification status
 */
export const getUserStatus = async (req, res) => {
  try {
    const { profileId } = req.params;

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ status: STATUS.FAILED, errors: [{ code: 'NOT_FOUND', message: 'Profile not found' }] });
    }

    const [idValidation, selfieValidation] = await Promise.all([
      IdCardValidation.findOne({ profileId }),
      SelfieValidation.findOne({ profileId }),
    ]);

    const authUserId = req.auth?.userId;
    const userConfig = await getUserConfig(authUserId);
    const verificationRules = getVerificationRulesFromConfig(userConfig);

    // Get thresholds from config
    const thresholds = userConfig ? {
      fullNameConfidence: userConfig.idCardThresholds?.minFullNameConfidence,
      identityNumberConfidence: userConfig.idCardThresholds?.minIdentityNumberConfidence,
      dateOfBirthConfidence: userConfig.idCardThresholds?.minDateOfBirthConfidence,
      expiryDateConfidence: userConfig.idCardThresholds?.minExpiryDateConfidence,
      imageQuality: userConfig.idCardThresholds?.minImageQuality,
      matchConfidence: userConfig.selfieThresholds?.minMatchConfidence,
      faceDetectionConfidence: userConfig.selfieThresholds?.minFacialFeatureConfidence,
      spoofingRiskMax: userConfig.selfieThresholds?.maxSpoofingRisk,
      minAge: userConfig.validationRules?.minAge,
      maxAge: userConfig.validationRules?.maxAge || 120,
    } : {};

    const idCompleted = !!idValidation;
    const selfieCompleted = !!selfieValidation;
    const idApproved = idValidation?.status === 'APPROVED';
    const selfieApproved = selfieValidation?.status === 'APPROVED';

    // Simplified status check
    const isFullyVerified = (!verificationRules.requireIdCard || idApproved) &&
      (!verificationRules.requireSelfie || selfieApproved);

    // Get profile data (if ID is approved, use profile data; otherwise use validation data)
    const idData = idApproved && profile.idVerificationStatus === 'APPROVED' ? {
      fullName: profile.fullName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      identityNumber: profile.identityNumber,
      dateOfBirth: profile.dateOfBirth,
      expiryDate: profile.expiryDate,
      gender: profile.gender,
      nationality: profile.nationality,
      serialNumber: profile.serialNumber,
      address: profile.address,
      documentCondition: profile.documentCondition,
    } : (idValidation ? {
      fullName: idValidation.fullName,
      firstName: idValidation.firstName,
      lastName: idValidation.lastName,
      identityNumber: idValidation.identityNumber,
      dateOfBirth: idValidation.dateOfBirth,
      expiryDate: idValidation.expiryDate,
      gender: idValidation.gender,
      nationality: idValidation.nationality,
      serialNumber: idValidation.serialNumber,
      address: idValidation.address,
      documentCondition: idValidation.documentCondition,
    } : null);

    // Get MRZ data from validation (not stored in profile)
    const mrzData = idValidation ? {
      mrz: idValidation.mrz,
      mrzInfo: idValidation.mrzInfo,
    } : null;

    res.json({
      id: profile._id,
      status: profile.status,
      country: profile.country,
      rejectionReasons: profile.rejectionReasons || [],
      createdAt: profile.createdAt,
      verificationRules,
      progress: {
        idVerification: { required: verificationRules.requireIdCard, completed: idCompleted, approved: idApproved },
        selfieVerification: { required: verificationRules.requireSelfie, completed: selfieCompleted, approved: selfieApproved },
        isFullyVerified,
      },
      idVerification: idValidation ? {
        status: idValidation.status,
        data: idData ? { ...idData, ...mrzData } : null,
        confidence: {
          fullName: idValidation.fullNameConfidence,
          firstName: idValidation.firstNameConfidence,
          lastName: idValidation.lastNameConfidence,
          identityNumber: idValidation.identityNumberConfidence,
          dateOfBirth: idValidation.dateOfBirthConfidence,
          expiryDate: idValidation.expiryDateConfidence,
          imageQuality: idValidation.imageQuality,
        },
        confidenceScores: [
          { threshold: thresholds.fullNameConfidence, confidenceValueName: 'firstName', confidenceScore: idValidation.firstNameConfidence },
          { threshold: thresholds.fullNameConfidence, confidenceValueName: 'lastName', confidenceScore: idValidation.lastNameConfidence },
          { threshold: thresholds.identityNumberConfidence, confidenceValueName: 'identityNumber', confidenceScore: idValidation.identityNumberConfidence },
          { threshold: thresholds.dateOfBirthConfidence, confidenceValueName: 'dateOfBirth', confidenceScore: idValidation.dateOfBirthConfidence },
          { threshold: thresholds.expiryDateConfidence, confidenceValueName: 'expiryDate', confidenceScore: idValidation.expiryDateConfidence },
          { threshold: thresholds.imageQuality, confidenceValueName: 'imageQuality', confidenceScore: idValidation.imageQuality }
        ],
        rejectionReasons: idValidation.rejectionReasons || [],
        errors: idValidation.errors || [],
      } : null,
      selfieVerification: selfieValidation ? {
        status: selfieValidation.status,
        data: { isMatch: selfieValidation.isMatch, matchConfidence: selfieValidation.matchConfidence, spoofingRisk: selfieValidation.spoofingRisk },
        confidenceScores: [
          { threshold: thresholds.matchConfidence, confidenceValueName: 'matchConfidence', confidenceScore: selfieValidation.matchConfidence },
          { threshold: thresholds.faceDetectionConfidence, confidenceValueName: 'faceDetectionConfidence', confidenceScore: selfieValidation.faceDetectionConfidence },
          { threshold: thresholds.spoofingRiskMax, confidenceValueName: 'spoofingRisk', confidenceScore: selfieValidation.spoofingRisk }
        ],
        rejectionReasons: selfieValidation.rejectionReasons || [],
        errors: selfieValidation.errors || [],
      } : null,
      images: {
        idFront: profile.idFrontImageUrl || idValidation?.frontImageUrl,
        idBack: profile.idBackImageUrl || idValidation?.backImageUrl,
        selfie: profile.selfieImageUrl || selfieValidation?.selfieUrls?.[0]
      },
      thresholds,
    });

  } catch (error) {
    logger.error({ error, profileId: req.params.profileId }, 'Status check error');
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};
