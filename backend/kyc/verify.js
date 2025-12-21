/**
 * KYC Verification Functions
 * Simple functions for ID and Selfie verification using Groq
 */

import Groq from 'groq-sdk';
import { 
  THRESHOLDS, 
  ERRORS, 
  STATUS, 
  validateTcKimlik, 
  validateDate, 
  determineStatus 
} from './config.js';
import { ID_PROMPT, SELFIE_PROMPT } from './prompts.js';

import dotenv from 'dotenv';
dotenv.config();

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model configuration
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEMPERATURE = 0.1;
const MAX_TOKENS = 2000;

// ============================================================================
// ID VERIFICATION
// ============================================================================

/**
 * Verify a Turkish ID card from images
 * @param {string} frontImageUrl - URL of the front of the ID card
 * @param {string} backImageUrl - URL of the back of the ID card (optional)
 * @returns {Promise<Object>} Verification result
 */
export async function verifyId(frontImageUrl, backImageUrl = null) {
  try {
    // Build image content array
    const imageContent = [
      { type: 'image_url', image_url: { url: frontImageUrl } }
    ];
    
    if (backImageUrl) {
      imageContent.push({ type: 'image_url', image_url: { url: backImageUrl } });
    }

    // Call Groq API
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: ID_PROMPT },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: `Analyze this Turkish ID card.${backImageUrl ? ' Front and back images provided.' : ' Front image provided.'}` },
            ...imageContent
          ]
        }
      ]
    });

    // Parse JSON response
    const data = parseJsonResponse(response.choices[0]?.message?.content);
    if (!data) {
      return {
        success: false,
        status: STATUS.FAILED,
        error: ERRORS.INVALID_JSON_RESPONSE
      };
    }

    // Validate extracted data
    const errors = validateIdData(data);
    
    // Merge LLM-detected errors with validation errors
    const allErrors = [...(data.errors || []), ...errors];
    const uniqueErrors = deduplicateErrors(allErrors);

    // Determine status
    const status = determineStatus(uniqueErrors);

    return {
      success: true,
      status,
      data: {
        fullName: data.fullName,
        identityNumber: data.identityNumber,
        dateOfBirth: data.dateOfBirth,
        expiryDate: data.expiryDate,
        gender: normalizeGender(data.gender),
        nationality: data.nationality,
        serialNumber: data.serialNumber,
        mrz: data.mrz,
        address: data.address,
        documentCondition: data.documentCondition,
        countryCode: data.countryCode || 'tr'
      },
      confidence: {
        fullName: data.fullNameConfidence,
        identityNumber: data.identityNumberConfidence,
        dateOfBirth: data.dateOfBirthConfidence,
        expiryDate: data.expiryDateConfidence,
        imageQuality: data.imageQuality
      },
      errors: uniqueErrors
    };

  } catch (error) {
    console.error('ID verification error:', error);
    return {
      success: false,
      status: STATUS.FAILED,
      error: ERRORS.GROQ_API_ERROR,
      details: error.message
    };
  }
}

// ============================================================================
// SELFIE VERIFICATION
// ============================================================================

/**
 * Verify a selfie against an ID photo
 * @param {string} idPhotoUrl - URL of the ID card photo
 * @param {string|string[]} selfieUrls - URL(s) of selfie image(s)
 * @returns {Promise<Object>} Verification result
 */
export async function verifySelfie(idPhotoUrl, selfieUrls) {
  try {
    // Normalize selfie URLs to array
    const selfies = Array.isArray(selfieUrls) ? selfieUrls : [selfieUrls];

    // Build image content array
    const imageContent = [
      { type: 'image_url', image_url: { url: idPhotoUrl } },
      ...selfies.map(url => ({ type: 'image_url', image_url: { url } }))
    ];

    // Call Groq API
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: SELFIE_PROMPT },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: `Compare the ID photo (first image) with the selfie${selfies.length > 1 ? 's' : ''} (${selfies.length} image${selfies.length > 1 ? 's' : ''}).` },
            ...imageContent
          ]
        }
      ]
    });

    // Parse JSON response
    const data = parseJsonResponse(response.choices[0]?.message?.content);
    if (!data) {
      return {
        success: false,
        status: STATUS.FAILED,
        error: ERRORS.INVALID_JSON_RESPONSE
      };
    }

    // Coerce and normalize data
    const normalizedData = normalizeSelfieData(data);

    // Validate selfie data
    const errors = validateSelfieData(normalizedData);
    
    // Merge LLM-detected errors with validation errors
    const allErrors = [...(normalizedData.errors || []), ...errors];
    const uniqueErrors = deduplicateErrors(allErrors);

    // Determine status
    const status = determineStatus(uniqueErrors, {
      isMatch: normalizedData.isMatch,
      matchConfidence: normalizedData.matchConfidence
    });

    return {
      success: true,
      status,
      data: {
        isMatch: normalizedData.isMatch,
        matchConfidence: normalizedData.matchConfidence,
        spoofingRisk: normalizedData.spoofingRisk,
        faceCount: normalizedData.faceCount,
        lightingCondition: normalizedData.lightingCondition,
        faceSize: normalizedData.faceSize,
        faceCoverage: normalizedData.faceCoverage,
        faceDetectionConfidence: normalizedData.faceDetectionConfidence,
        imageQuality: normalizedData.imageQuality,
        imageQualityIssues: normalizedData.imageQualityIssues
      },
      errors: uniqueErrors
    };

  } catch (error) {
    console.error('Selfie verification error:', error);
    return {
      success: false,
      status: STATUS.FAILED,
      error: ERRORS.GROQ_API_ERROR,
      details: error.message
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse JSON from LLM response
 */
function parseJsonResponse(content) {
  if (!content) return null;
  
  try {
    // Try direct parse first
    return JSON.parse(content);
  } catch {
    // Try to extract JSON from markdown code block or other text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        console.error('Failed to parse extracted JSON:', jsonMatch[0]);
        return null;
      }
    }
    console.error('No JSON found in response:', content);
    return null;
  }
}

/**
 * Validate ID data and return array of errors
 */
function validateIdData(data) {
  const errors = [];

  // Required field checks
  if (!data.fullName) {
    errors.push(ERRORS.MISSING_FULL_NAME);
  }
  
  if (!data.identityNumber) {
    errors.push(ERRORS.MISSING_IDENTITY_NUMBER);
  } else {
    // TC Kimlik validation
    const tcValidation = validateTcKimlik(data.identityNumber);
    if (!tcValidation.valid) {
      errors.push(tcValidation.error);
    }
  }

  // Date validations
  if (data.dateOfBirth) {
    const dobValidation = validateDate(data.dateOfBirth, 'dob');
    if (!dobValidation.valid) {
      errors.push(dobValidation.error);
    }
  } else {
    errors.push(ERRORS.MISSING_DOB);
  }

  if (data.expiryDate) {
    const expiryValidation = validateDate(data.expiryDate, 'expiry');
    if (!expiryValidation.valid) {
      errors.push(expiryValidation.error);
    }
  } else {
    errors.push(ERRORS.MISSING_EXPIRY_DATE);
  }

  // Confidence threshold checks
  if (data.fullNameConfidence !== undefined && data.fullNameConfidence < THRESHOLDS.fullNameConfidence) {
    errors.push(ERRORS.MISSING_FULL_NAME);
  }
  
  if (data.identityNumberConfidence !== undefined && data.identityNumberConfidence < THRESHOLDS.identityNumberConfidence) {
    errors.push(ERRORS.MISSING_IDENTITY_NUMBER);
  }
  
  if (data.imageQuality !== undefined && data.imageQuality < THRESHOLDS.imageQuality) {
    errors.push(ERRORS.BLURRY_IMAGE);
  }

  // Document condition check
  if (data.documentCondition === 'poor') {
    errors.push(ERRORS.DAMAGED_ID);
  }

  return errors;
}

/**
 * Normalize selfie data with type coercion
 */
function normalizeSelfieData(data) {
  return {
    isMatch: data.isMatch === true || data.isMatch === 'true',
    matchConfidence: parseFloat(data.matchConfidence) || 0,
    spoofingRisk: parseFloat(data.spoofingRisk) || 0,
    faceCount: parseInt(data.faceCount) || 0,
    lightingCondition: data.lightingCondition || 'good',
    faceSize: data.faceSize || 'adequate',
    faceCoverage: data.faceCoverage || 'clear',
    faceDetectionConfidence: parseFloat(data.faceDetectionConfidence) || 0,
    imageQuality: parseFloat(data.imageQuality) || 0,
    imageQualityIssues: Array.isArray(data.imageQualityIssues) ? data.imageQualityIssues : [],
    errors: Array.isArray(data.errors) ? data.errors : []
  };
}

/**
 * Validate selfie data and return array of errors
 */
function validateSelfieData(data) {
  const errors = [];

  // Face detection
  if (data.faceCount === 0) {
    errors.push(ERRORS.NO_FACE_DETECTED);
  } else if (data.faceCount > 1) {
    errors.push(ERRORS.MULTIPLE_FACES);
  }

  // Match confidence
  if (!data.isMatch || data.matchConfidence < THRESHOLDS.matchConfidence) {
    errors.push(ERRORS.LOW_MATCH_CONFIDENCE);
  }

  // Spoofing risk
  if (data.spoofingRisk > THRESHOLDS.spoofingRiskMax) {
    errors.push(ERRORS.SPOOFING_DETECTED);
  }

  // Image quality
  if (data.imageQuality < THRESHOLDS.imageQuality) {
    errors.push(ERRORS.POOR_IMAGE_QUALITY);
  }

  // Face detection confidence
  if (data.faceDetectionConfidence < THRESHOLDS.faceDetectionConfidence) {
    errors.push(ERRORS.NO_FACE_DETECTED);
  }

  // Lighting condition
  if (data.lightingCondition === 'insufficient') {
    errors.push(ERRORS.INSUFFICIENT_LIGHTING);
  }

  // Face size
  if (data.faceSize === 'too_small') {
    errors.push(ERRORS.FACE_TOO_SMALL);
  }

  // Face coverage
  if (data.faceCoverage !== 'clear') {
    errors.push(ERRORS.FACE_PARTIALLY_COVERED);
  }

  return errors;
}

/**
 * Normalize gender value
 */
function normalizeGender(gender) {
  if (!gender) return null;
  const g = gender.toLowerCase();
  if (g === 'm' || g === 'male' || g === 'erkek') return 'M';
  if (g === 'f' || g === 'female' || g === 'kadın' || g === 'kadin') return 'F';
  return gender;
}

/**
 * Remove duplicate errors by code
 */
function deduplicateErrors(errors) {
  const seen = new Set();
  return errors.filter(error => {
    const code = error.code;
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}
