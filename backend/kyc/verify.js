/**
 * KYC Verification Functions
 * Simple functions for ID and Selfie verification using Groq
 * Supports dynamic prompts when config is provided
 */

import Groq from 'groq-sdk';
import { parse } from 'mrz';
import logger from '../lib/logger.js';
import {
  THRESHOLDS,
  ERRORS,
  STATUS,
  validateTcKimlik,
  validateDate,
  determineStatus
} from './config.js';
import { ID_PROMPT, SELFIE_PROMPT } from './prompts.js';
import { generateIdCardPrompt, generateSelfiePrompt } from './prompt-generator.js';

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
 * @param {Object} [config] - Optional KYC configuration for dynamic prompts
 * @returns {Promise<Object>} Verification result
 */
export async function verifyId(frontImageUrl, backImageUrl = null, config = null) {
  try {
    // Build image content array
    const imageContent = [
      { type: 'image_url', image_url: { url: frontImageUrl } }
    ];

    if (backImageUrl) {
      imageContent.push({ type: 'image_url', image_url: { url: backImageUrl } });
    }

    // Use dynamic prompt if config provided, otherwise fall back to static
    const prompt = config ? generateIdCardPrompt(config) : ID_PROMPT;

    // Call Groq API
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: prompt },
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

    // Parse MRZ if available
    let mrzInfo = null;
    if (data.mrz) {
      try {
        mrzInfo = parseMrz(data.mrz);

        // Log MRZ information (LLM returned and parsed)
        logger.info({
          msg: 'MRZ parsing completed',
          mrz: {
            raw: data.mrz, // MRZ string returned by LLM
            parsed: mrzInfo // Parsed MRZ data from mrz package
          },
          verification: {
            hasMrz: !!data.mrz,
            parseSuccess: !!mrzInfo,
            format: mrzInfo?.format || null,
            valid: mrzInfo?.valid ?? null
          }
        });
      } catch (error) {
        logger.warn({
          msg: 'MRZ parsing failed',
          error: error.message,
          rawMrz: data.mrz
        });
        // Continue without mrzInfo if parsing fails
      }
    } else {
      // Log when MRZ is not available
      logger.info({
        msg: 'MRZ not found in LLM response',
        hasMrz: false
      });
    }

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
        mrz: data.mrz, // Raw MRZ string (keep as is)
        mrzInfo: mrzInfo, // Parsed MRZ data
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
 * @param {Object} [config] - Optional KYC configuration for dynamic prompts
 * @returns {Promise<Object>} Verification result
 */
export async function verifySelfie(idPhotoUrl, selfieUrls, config = null) {
  try {
    // Normalize selfie URLs to array
    const selfies = Array.isArray(selfieUrls) ? selfieUrls : [selfieUrls];

    // Build image content array
    const imageContent = [
      { type: 'image_url', image_url: { url: idPhotoUrl } },
      ...selfies.map(url => ({ type: 'image_url', image_url: { url } }))
    ];

    // Use dynamic prompt if config provided, otherwise fall back to static
    const prompt = config ? generateSelfiePrompt(config) : SELFIE_PROMPT;

    // Call Groq API
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: prompt },
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

/**
 * Parse MRZ string using mrz package
 * @param {string} mrzString - Raw MRZ string (can be multi-line)
 * @returns {Object|null} Parsed MRZ data or null if parsing fails
 */
function parseMrz(mrzString) {
  if (!mrzString || typeof mrzString !== 'string') {
    return null;
  }

  try {
    // Clean MRZ string and split into lines
    const lines = mrzString
      .trim()
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // If no lines found, try treating as single line
    if (lines.length === 0) {
      return null;
    }

    // mrz package expects array of lines or single string
    // Try parsing as array first (preferred)
    let parsed;
    if (lines.length > 1) {
      parsed = parse(lines);
    } else {
      // Single line - try parsing directly
      parsed = parse(lines[0]);
    }

    if (!parsed) {
      console.warn('MRZ parsing returned null');
      return null;
    }

    // Extract relevant fields from parsed MRZ
    // Note: parsed.valid might be false even if parsing succeeded
    // We still return the data but mark it as potentially invalid
    return {
      valid: parsed.valid !== false, // true if valid, false if invalid, undefined if unknown
      format: parsed.format || null, // TD1, TD2, TD3, etc.
      documentType: parsed.fields?.documentType || null,
      documentNumber: parsed.fields?.documentNumber || null,
      documentNumberCheckDigit: parsed.fields?.documentNumberCheckDigit || null,
      optionalData1: parsed.fields?.optionalData1 || null,
      optionalData2: parsed.fields?.optionalData2 || null,
      dateOfBirth: parsed.fields?.dateOfBirth || null,
      dateOfBirthCheckDigit: parsed.fields?.dateOfBirthCheckDigit || null,
      expiryDate: parsed.fields?.expiryDate || null,
      expiryDateCheckDigit: parsed.fields?.expiryDateCheckDigit || null,
      nationality: parsed.fields?.nationality || null,
      sex: parsed.fields?.sex || null,
      compositeCheckDigit: parsed.fields?.compositeCheckDigit || null,
      names: parsed.fields?.names || null,
      surname: parsed.fields?.surname || null,
      givenNames: parsed.fields?.givenNames || null,
      // Additional parsed fields
      raw: mrzString.trim(),
      fields: parsed.fields || {},
      details: parsed.details || [] // Validation details if available
    };
  } catch (error) {
    console.error('MRZ parsing error:', error);
    return null;
  }
}
