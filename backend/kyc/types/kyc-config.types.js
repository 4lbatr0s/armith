/**
 * KYC Configuration Type Definitions (JSDoc)
 * 
 * Types for the dynamic KYC configuration system.
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const LIGHTING_CONDITIONS = ['excellent', 'good', 'acceptable', 'poor', 'insufficient'];
export const FACE_SIZES = ['optimal', 'adequate', 'too_small', 'too_large'];
export const FACE_COVERAGE = ['fully_visible', 'partially_obscured', 'significantly_obscured', 'not_visible'];
export const DOCUMENT_CONDITIONS = ['excellent', 'good', 'fair', 'poor'];
export const VERIFICATION_STATUS = ['approved', 'rejected', 'review', 'pending'];

// ============================================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================================

/**
 * @typedef {Object} VerificationStepsConfig
 * @property {boolean} requireIdCard - Whether ID card verification is required
 * @property {boolean} requireSelfie - Whether selfie verification is required  
 * @property {'AND'|'OR'} logicOperator - Logic for multiple verifications
 * @property {boolean} allowPartialSubmission - Accept requests missing documents
 */

/**
 * @typedef {Object} IdCardThresholds
 * @property {number} minOverallConfidence - Min weighted average confidence (0-1)
 * @property {number} minFullNameConfidence - Min name extraction confidence (0-1)
 * @property {number} minIdentityNumberConfidence - Min TC number confidence (0-1)
 * @property {number} minDateOfBirthConfidence - Min DOB confidence (0-1)
 * @property {number} minExpiryDateConfidence - Min expiry confidence (0-1)
 * @property {number} minMrzConfidence - Min MRZ extraction confidence (0-1)
 * @property {number} minImageQuality - Min image quality score (0-1)
 * @property {number} maxTamperingRisk - Max tampering risk (0-1)
 * @property {number} minGenderConfidence - Min gender confidence (0-1)
 * @property {number} minSerialNumberConfidence - Min serial confidence (0-1)
 * @property {string[]} acceptableDocumentConditions - Allowed conditions
 */

/**
 * @typedef {Object} SelfieThresholds
 * @property {number} minMatchConfidence - Min face match % (0-100)
 * @property {number} maxSpoofingRisk - Max spoofing risk (0-1)
 * @property {number} minImageQuality - Min image quality (0-1)
 * @property {number} minLivenessConfidence - Min liveness confidence (0-1)
 * @property {number} requiredFaceCount - Required faces in selfie
 * @property {string[]} allowedLightingConditions - Acceptable lighting
 * @property {string[]} allowedFaceSizes - Acceptable face sizes
 * @property {string[]} allowedFaceCoverage - Acceptable coverage levels
 * @property {number} minFacialFeatureConfidence - Min feature confidence (0-1)
 * @property {boolean} requireMultipleAngles - Require multiple selfie angles
 * @property {number} minAngleDifference - Min angle diff in degrees
 */

/**
 * @typedef {Object} ValidationRules
 * @property {boolean} enforceAgeCheck - Check minimum age
 * @property {number} minAge - Minimum age in years
 * @property {boolean} enforceExpiryCheck - Check document expiry
 * @property {number} expiryWarningDays - Days before expiry to warn
 * @property {boolean} enforceTcChecksumValidation - Validate TC checksum
 * @property {boolean} enforceMrzCrossValidation - Compare MRZ with visual
 * @property {boolean} requireHologramDetection - Require hologram visible
 * @property {boolean} enforceNameFormat - Validate name characters
 * @property {boolean} allowDamagedDocuments - Accept damaged docs
 * @property {boolean} enforceGenderConsistency - Check gender matches
 * @property {number} maxVerificationRetries - Max retry attempts
 * @property {number} retryCooldownMinutes - Minutes between retries
 */

/**
 * @typedef {Object} CustomThreshold
 * @property {string} key - Threshold name
 * @property {number|string|boolean} value - Threshold value
 * @property {'number'|'string'|'boolean'} type - Value type
 * @property {string} [description] - Optional description
 */

/**
 * @typedef {Object} KycConfiguration
 * @property {string} _id - MongoDB document ID
 * @property {string} userId - Customer who owns this config
 * @property {string} [organizationId] - Optional org ID
 * @property {string} name - Config name
 * @property {string} [description] - Config description
 * @property {VerificationStepsConfig} verificationSteps - Flow config
 * @property {IdCardThresholds} idCardThresholds - ID thresholds
 * @property {SelfieThresholds} selfieThresholds - Selfie thresholds
 * @property {ValidationRules} validationRules - Validation rules
 * @property {Object.<string, CustomThreshold>} customThresholds - Custom thresholds
 * @property {boolean} isActive - Config is active
 * @property {number} version - Optimistic lock version
 * @property {'test'|'staging'|'production'} environment - Environment
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Update timestamp
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} code - Error code
 * @property {string} field - Affected field
 * @property {string} message - Human-readable message
 * @property {'critical'|'warning'|'info'} severity - Error severity
 */
