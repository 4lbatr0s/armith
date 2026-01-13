/**
 * Dynamic Prompt Generator
 * Generates LLM prompts at runtime based on customer configuration
 */

// ============================================================================
// ID CARD PROMPT GENERATION
// ============================================================================

/**
 * Generate dynamic ID card verification prompt
 * @param {import('./types/kyc-config.types.js').KycConfiguration} config
 * @returns {string} Complete prompt for ID card verification
 */
export function generateIdCardPrompt(config) {
  const { idCardThresholds, validationRules, customThresholds } = config;

  const basePrompt = buildIdCardBasePrompt();
  const thresholdsSection = buildIdCardThresholdsSection(idCardThresholds);
  const validationSection = buildIdCardValidationSection(validationRules);
  const customSection = buildCustomThresholdsSection(customThresholds);
  const outputSection = buildIdCardOutputSection();

  return `${basePrompt}\n\n${thresholdsSection}\n\n${validationSection}${customSection}\n\n${outputSection}`;
}

function buildIdCardBasePrompt() {
  return `You are an expert document verification system analyzing a Turkish Republic Identity Card (Türkiye Cumhuriyeti Kimlik Kartı).

# CONTEXT
You will receive 1-2 images:
- Front: Contains photo, personal data, TC number, MRZ
- Back (optional): Contains address, signature, validity period

# EXTRACTION REQUIREMENTS

- **firstName**: Given name(s) in UPPERCASE Turkish alphabet
- **lastName**: Surname in UPPERCASE Turkish alphabet
  - Valid chars: A-Z, ÇĞİÖŞÜ
  - Format: Separate given names and surname. Use "firstName" and "lastName" keys.

- **identityNumber**: TC Kimlik No (11-digit unique identifier)
  - Must be exactly 11 numeric digits
  - First digit cannot be 0

- **dateOfBirth**: Birth date in YYYY-MM-DD format

- **gender**: M (Erkek/Male) or F (Kadın/Female)

- **serialNumber**: Document serial number (Letter + digits)

- **expiryDate**: Document expiry date in YYYY-MM-DD format

- **nationality**: Should be "T.C." or "TR" for Turkish citizens

- **address**: Full address if back image provided

## 2. MRZ EXTRACTION

The MRZ is a 3-line zone at bottom (TD1 format, 30 chars each).

Tasks:
1. Extract all 3 lines exactly as printed (90 chars total)
2. Parse structured data from MRZ
3. Validate MRZ check digits

Return in mrz object:
- raw: Complete 90-character string (no newlines)
- parsed: Structured data (documentType, issuingCountry, documentNumber, etc.)
- checksumValid: true/false
- mrzConfidence: 0.0-1.0

## 3. DOCUMENT AUTHENTICITY

Analyze security features:
- hologramPresence: Is the hologram visible?
- photoQuality: Is the embedded photo clear? (excellent/good/fair/poor)
- fontConsistency: Are fonts uniform and official?
- edgeIntegrity: Clean edges, no lamination removal?
- colorAccuracy: Match official Turkish ID standards?
- tamperingRisk: 0.0 (no signs) to 1.0 (clear tampering)

## 4. IMAGE QUALITY

- imageQuality: Overall clarity (0.0-1.0)
- documentCondition: Physical state (excellent/good/fair/poor)
- readabilityIssues: Array of problems (glare, blur, shadow, etc.)`;
}

function buildIdCardThresholdsSection(thresholds) {
  return `# CONFIDENCE THRESHOLDS (CLIENT-SPECIFIC)

You MUST meet these minimum confidence scores:

- **Overall Confidence**: >= ${thresholds.minOverallConfidence.toFixed(2)}
- **First Name & Last Name**: >= ${thresholds.minFullNameConfidence.toFixed(2)}
- **Identity Number**: >= ${thresholds.minIdentityNumberConfidence.toFixed(2)}
- **Date of Birth**: >= ${thresholds.minDateOfBirthConfidence.toFixed(2)}
- **Expiry Date**: >= ${thresholds.minExpiryDateConfidence.toFixed(2)}
- **MRZ**: >= ${thresholds.minMrzConfidence.toFixed(2)}
- **Image Quality**: >= ${thresholds.minImageQuality.toFixed(2)}
- **Max Tampering Risk**: <= ${thresholds.maxTamperingRisk.toFixed(2)}
- **Acceptable Conditions**: ${thresholds.acceptableDocumentConditions.join(', ')}

**Calibration Guide:**
- 0.95-1.0: Crystal clear, no ambiguity
- 0.85-0.95: High confidence, minor OCR uncertainty
- 0.70-0.85: Moderate confidence, some blur/damage
- 0.50-0.70: Low confidence, requires human review
- <0.50: Very low confidence, likely extraction error`;
}

function buildIdCardValidationSection(rules) {
  let section = '# VALIDATION RULES\n\n';

  if (rules.enforceTcChecksumValidation) {
    section += `## TC Number Checksum
Turkish ID numbers have built-in validation:
1. Sum of digits 1,3,5,7,9 × 7 minus sum at 2,4,6,8 → mod 10 = 10th digit
2. Sum of digits 1-10 → mod 10 = 11th digit

**You MUST validate this.** If checksum fails:
- Add error: "INVALID_TC_CHECKSUM"
- Set identityNumberConfidence to 0.0

`;
  }

  if (rules.enforceAgeCheck) {
    section += `## Age Validation
- Calculate age from dateOfBirth
- Must be >= ${rules.minAge} years old
- If age < ${rules.minAge}, add error: "UNDERAGE_APPLICANT"

`;
  }

  if (rules.enforceExpiryCheck) {
    section += `## Expiry Validation
- Compare expiryDate with current date
- If expired, add error: "EXPIRED_DOCUMENT"
- If expiring within ${rules.expiryWarningDays} days, add warning: "DOCUMENT_EXPIRING_SOON"

`;
  }

  if (rules.enforceMrzCrossValidation) {
    section += `## MRZ Cross-Validation
Compare MRZ data with visual data (must match exactly):
- MRZ document number vs serialNumber
- MRZ birth date vs dateOfBirth
- MRZ expiry vs expiryDate
- MRZ sex vs gender

If ANY mismatch, add error: "MRZ_VISUAL_MISMATCH"

`;
  }

  if (rules.enforceNameFormat) {
    section += `## Name Format Validation
- Name must only contain A-Z and Turkish letters (ÇĞİÖŞÜ)
- No numbers or special characters (except space)
- If invalid, add error: "INVALID_NAME_FORMAT"

`;
  }

  if (rules.requireHologramDetection) {
    section += `## Hologram Detection
**REQUIRED**: Hologram must be visible.
If not detected, add error: "HOLOGRAM_NOT_DETECTED"

`;
  }

  if (!rules.allowDamagedDocuments) {
    section += `## Document Condition Restriction
Only 'excellent' and 'good' conditions are acceptable.
If documentCondition is 'fair' or 'poor', add error: "UNACCEPTABLE_DOCUMENT_CONDITION"

`;
  }

  return section;
}

function buildCustomThresholdsSection(customThresholds) {
  if (!customThresholds || Object.keys(customThresholds).length === 0) {
    return '';
  }

  let section = '\n# CUSTOM THRESHOLDS (CLIENT-SPECIFIC)\n\n';
  for (const [key, threshold] of Object.entries(customThresholds)) {
    const desc = threshold.description ? ` - ${threshold.description}` : '';
    section += `- **${key}**: ${threshold.value} (${threshold.type})${desc}\n`;
  }
  section += '\nApply these thresholds as additional validation criteria.\n';
  return section;
}

function buildIdCardOutputSection() {
  return `# ERROR CODES

Use these error codes:
- MISSING_REQUIRED_FIELD (critical)
- LOW_CONFIDENCE (critical)
- INVALID_TC_CHECKSUM (critical)
- UNDERAGE_APPLICANT (critical)
- EXPIRED_DOCUMENT (critical)
- DOCUMENT_EXPIRING_SOON (warning)
- MRZ_VISUAL_MISMATCH (critical)
- POOR_IMAGE_QUALITY (warning)
- TAMPERING_SUSPECTED (critical)
- HOLOGRAM_NOT_DETECTED (critical)
- INVALID_NAME_FORMAT (warning)
- UNACCEPTABLE_DOCUMENT_CONDITION (critical)

# OUTPUT FORMAT (JSON ONLY)

{
  "extraction": {
    "firstName": "string|null",
    "lastName": "string|null",
    "identityNumber": "string|null",
    "dateOfBirth": "YYYY-MM-DD|null",
    "gender": "M|F|null",
    "serialNumber": "string|null",
    "expiryDate": "YYYY-MM-DD|null",
    "nationality": "string|null",
    "address": "string|null"
  },
  "mrz": {
    "raw": "string|null",
    "parsed": {
      "documentType": "string|null",
      "issuingCountry": "string|null",
      "documentNumber": "string|null",
      "dateOfBirth": "YYMMDD|null",
      "sex": "M|F|null",
      "expiryDate": "YYMMDD|null",
      "nationality": "string|null",
      "surname": "string|null",
      "givenNames": "string|null"
    },
    "checksumValid": true|false|null,
    "mrzConfidence": 0.0-1.0
  },
  "authenticity": {
    "documentCondition": "excellent|good|fair|poor",
    "hologramPresence": true|false|null,
    "photoQuality": "excellent|good|fair|poor",
    "fontConsistency": true|false,
    "edgeIntegrity": true|false,
    "colorAccuracy": true|false,
    "tamperingRisk": 0.0-1.0
  },
  "quality": {
    "imageQuality": 0.0-1.0,
    "readabilityIssues": ["string"],
    "countryCode": "tr"
  },
  "confidence": {
    "firstNameConfidence": 0.0-1.0,
    "lastNameConfidence": 0.0-1.0,
    "identityNumberConfidence": 0.0-1.0,
    "dateOfBirthConfidence": 0.0-1.0,
    "expiryDateConfidence": 0.0-1.0,
    "mrzConfidence": 0.0-1.0,
    "overallConfidence": 0.0-1.0
  },
  "validation": {
    "isValid": true|false,
    "errors": [{ "code": "string", "field": "string", "message": "string", "severity": "critical|warning", "threshold": "string|null" }]
  },
  "metadata": {
    "processingTime": "ISO timestamp",
    "imagesProcessed": 1|2
  }
}

**CRITICAL**: Return ONLY valid JSON. All fields defined in the schema are MANDATORY. If a field is not applicable or not found, return "null" for that field (do not omit it). No markdown, no explanations.`;
}

// ============================================================================
// SELFIE PROMPT GENERATION
// ============================================================================

/**
 * Generate dynamic selfie verification prompt
 * @param {import('./types/kyc-config.types.js').KycConfiguration} config
 * @returns {string} Complete prompt for selfie verification
 */
export function generateSelfiePrompt(config) {
  const { selfieThresholds, customThresholds } = config;

  const basePrompt = buildSelfieBasePrompt(selfieThresholds);
  const thresholdsSection = buildSelfieThresholdsSection(selfieThresholds);
  const customSection = buildCustomThresholdsSection(customThresholds);
  const outputSection = buildSelfieOutputSection();

  return `${basePrompt}\n\n${thresholdsSection}${customSection}\n\n${outputSection}`;
}

function buildSelfieBasePrompt(thresholds) {
  const imageCount = thresholds.requireMultipleAngles ? '3-4' : '2-3';

  return `You are an expert biometric verification system performing liveness detection and face matching.

# CONTEXT
You will receive ${imageCount} images:
1. **ID Card Front** - Contains embedded ID photo (reference face)
2. **Live Selfie #1** - Primary selfie for verification
${thresholds.requireMultipleAngles ?
      `3. **Live Selfie #2** - Secondary angle for liveness
4. **Live Selfie #3** (optional) - Tertiary angle` :
      `3. **Live Selfie #2** (optional) - Secondary angle`}

Task: Verify selfie(s) match the ID photo AND detect spoofing attempts.

# STEP 1: FACE DETECTION

For each image, detect faces:
- ID Photo: Must contain exactly 1 face
- Selfie #1: Must contain exactly ${thresholds.requiredFaceCount} face(s)
- Selfie #2: Same requirement if provided

If face count doesn't match, add error: "INVALID_FACE_COUNT"

# STEP 2: LIVENESS DETECTION

Check for spoofing indicators:
- Screen reflections (photo of photo)
- Print artifacts (printer dots, paper texture)
- Flat depth perception
- Unnatural lighting
- Missing eye reflections
- Overly smooth skin texture

Check for liveness indicators:
- Natural micro-expressions
- Consistent environmental lighting
- Realistic shadows
- Natural eye catchlights
${thresholds.requireMultipleAngles ? `- Clear angle differences between selfies (min ${thresholds.minAngleDifference}° rotation)` : ''}

# STEP 3: BIOMETRIC MATCHING

Compare ID photo face with selfie:

Feature weights:
- Facial structure (face shape, jawline): 40%
- Eyes (shape, spacing, lids): 25%
- Nose (bridge, nostrils, tip): 15%
- Mouth & Chin: 15%
- Ears (if visible): 5%

Acceptable variations:
- Aging, weight changes (±15%)
- Different lighting/expression
- Hair changes, facial hair
- Glasses added/removed

# STEP 4: IMAGE QUALITY

Check lighting, face size, coverage, and technical quality.`;
}

function buildSelfieThresholdsSection(thresholds) {
  return `# THRESHOLDS (CLIENT-SPECIFIC)

- **Match Confidence**: >= ${thresholds.minMatchConfidence}%
- **Max Spoofing Risk**: <= ${thresholds.maxSpoofingRisk.toFixed(2)}
- **Min Image Quality**: >= ${thresholds.minImageQuality.toFixed(2)}
- **Min Liveness Confidence**: >= ${thresholds.minLivenessConfidence.toFixed(2)}
- **Min Feature Confidence**: >= ${thresholds.minFacialFeatureConfidence.toFixed(2)}
- **Required Face Count**: ${thresholds.requiredFaceCount}
- **Allowed Lighting**: ${thresholds.allowedLightingConditions.join(', ')}
- **Allowed Face Sizes**: ${thresholds.allowedFaceSizes.join(', ')}
- **Allowed Coverage**: ${thresholds.allowedFaceCoverage.join(', ')}
${thresholds.requireMultipleAngles ? `- **Min Angle Difference**: ${thresholds.minAngleDifference}°` : ''}

**Decisions:**
- Match >= ${thresholds.minMatchConfidence}% AND Spoof <= ${thresholds.maxSpoofingRisk.toFixed(2)} → PASS
- Match < 70% OR Spoof > 0.5 → FAIL
- Otherwise → REVIEW`;
}

function buildSelfieOutputSection() {
  return `# ERROR CODES

- NO_FACE_IN_ID (critical)
- NO_FACE_IN_SELFIE (critical)
- INVALID_FACE_COUNT (critical)
- LOW_MATCH_CONFIDENCE (critical)
- INSUFFICIENT_MATCH (warning)
- SPOOFING_DETECTED (critical)
- POSSIBLE_SPOOFING (warning)
- LOW_LIVENESS_CONFIDENCE (warning)
- POOR_IMAGE_QUALITY (warning)
- UNACCEPTABLE_LIGHTING (warning)
- UNACCEPTABLE_FACE_SIZE (warning)

# OUTPUT FORMAT (JSON ONLY)

{
  "faceDetection": {
    "idPhotoFaceCount": 0|1|2+,
    "selfie1FaceCount": 0|1|2+,
    "selfie2FaceCount": 0|1|2+|null,
    "faceDetectionConfidence": 0.0-1.0
  },
  "biometricMatch": {
    "isMatch": true|false,
    "matchConfidence": 0-100,
    "facialFeatureScores": {
      "facialStructure": 0.0-1.0,
      "eyes": 0.0-1.0,
      "nose": 0.0-1.0,
      "mouthAndChin": 0.0-1.0,
      "ears": 0.0-1.0|null
    }
  },
  "liveness": {
    "spoofingRisk": 0.0-1.0,
    "livenessConfidence": 0.0-1.0,
    "spoofingIndicators": ["string"],
    "livenessIndicators": ["string"]
  },
  "imageQuality": {
    "selfie1Quality": 0.0-1.0,
    "selfie2Quality": 0.0-1.0|null,
    "lightingCondition": "excellent|good|acceptable|poor|insufficient",
    "faceSize": "optimal|adequate|too_small|too_large",
    "faceCoverage": "fully_visible|partially_obscured|...",
    "qualityIssues": ["string"]
  },
  "validation": {
    "status": "pass|fail|review",
    "errors": [{ "code": "string", "field": "string", "message": "string", "severity": "critical|warning", "threshold": "string|null" }]
  },
  "explainability": {
    "matchingReasons": ["string"],
    "mismatchReasons": ["string"],
    "spoofingIndicators": ["string"],
    "qualityIssues": ["string"]
  },
  "metadata": {
    "processingTime": "ISO timestamp",
    "imagesAnalyzed": 2|3|4
  }
}

**CRITICAL**: Return ONLY valid JSON. All fields defined in the schema are MANDATORY. If a field is not applicable or not found, return "null" for that field (do not omit it). No markdown, no explanations.`;
}
