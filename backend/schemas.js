import { z } from 'zod';

// Schema for individual errors
const ErrorSchema = z.object({
  code: z.string().describe("Error code identifier"),
  numericCode: z.number().describe("Numeric error code for easy identification"),
  message: z.string().describe("Human-readable error message")
});

// Schema for KYC ID verification response
const KycIdSchema = z.object({
  // Basic fields
  fullName: z.string().nullish().describe("The full name as it appears on the ID document"),
  identityNumber: z.string().nullish().describe("The identity number or document number"),
  dateOfBirth: z.string().nullish().describe("Date of birth in YYYY-MM-DD format"),
  expiryDate: z.string().nullish().describe("Expiry date in YYYY-MM-DD format"),
  gender: z.string().nullish().describe("Gender as indicated on the document"),
  nationality: z.string().nullish().describe("Nationality or country code"),
  serialNumber: z.string().nullish().describe("Document serial number"),
  mrz: z.string().nullish().describe("Machine Readable Zone text"),
  address: z.string().nullish().describe("Address information from the document"),
  
  // Validation assessment fields (for LLM to fill)
  documentCondition: z.enum(['good', 'damaged', 'poor']).describe("Document condition assessment - good: clear and readable, damaged: has tears/stains but readable, poor: severely damaged/unreadable"),
  countryCode: z.string().describe("Detected country code from document (e.g., 'tr' for Turkey)"),
  
  // Threshold fields (confidence scores 0-1)
  fullNameConfidence: z.number().min(0).max(1).describe("Confidence score for full name extraction"),
  identityNumberConfidence: z.number().min(0).max(1).describe("Confidence score for identity number extraction"),
  dateOfBirthConfidence: z.number().min(0).max(1).describe("Confidence score for date of birth extraction"),
  expiryDateConfidence: z.number().min(0).max(1).describe("Confidence score for expiry date extraction"),
  imageQuality: z.number().min(0).max(1).describe("Overall image quality score"),
  
  errors: z.array(ErrorSchema).describe("List of validation errors found")
});

// Schema for KYC selfie verification response
const KycSelfieSchema = z.object({
  // Basic fields
  isMatch: z.boolean().describe("Whether the face in the selfie matches the ID photo"),
  spoofingRisk: z.number().min(0).max(1).nullish().describe("Spoofing risk score (0-1)"),
  faceCount: z.number().int().min(0).describe("Number of faces detected in the image"),
  imageQualityIssues: z.array(z.string()).nullish().describe("List of image quality issues found"),
  
  // Validation assessment fields (for LLM to fill)
  lightingCondition: z.enum(['good', 'poor', 'insufficient']).describe("Lighting condition assessment - good: well-lit and clear, poor: dim but acceptable, insufficient: too dark/bright for verification"),
  faceSize: z.enum(['adequate', 'too_small', 'too_large']).describe("Face size assessment - adequate: face fills 25-75% of frame, too_small: face < 25%, too_large: face > 75%"),
  faceCoverage: z.enum(['clear', 'partially_covered', 'fully_covered']).describe("Face coverage assessment - clear: face fully visible, partially_covered: some obstruction, fully_covered: face not visible"),
  
  // Threshold fields
  matchConfidence: z.number().min(0).max(100).describe("Face match confidence as percentage (0-100)"),
  imageQuality: z.number().min(0).max(1).describe("Overall image quality score"),
  faceDetectionConfidence: z.number().min(0).max(1).describe("Face detection confidence score"),
  
  errors: z.array(ErrorSchema).describe("List of verification errors"),
  rejectionReasons: z.array(z.string()).nullish().describe("Specific reasons for rejection if applicable")
});

// Schema for incoming ID check request
const IdCheckRequestSchema = z.object({
  countryCode: z.string().min(2).max(3).toLowerCase(),
  frontImageUrl: z.string().url('Must be a valid URL'),
  backImageUrl: z.string().url('Must be a valid URL').optional()
});

// Schema for incoming selfie check request
const SelfieCheckRequestSchema = z.object({
  idPhotoUrl: z.string().url('Must be a valid URL'),
  selfieUrls: z.array(z.string().url()).min(1, 'At least one selfie URL is required').max(5, 'Maximum 5 selfie URLs allowed')
});

// Schema for complete API response
const ApiResponseSchema = z.object({
  status: z.enum(['approved', 'rejected', 'failed', 'pending']),
  data: z.record(z.any()).optional(),
  errors: z.array(ErrorSchema).default([]),
  rejectionReasons: z.array(z.string()).default([])
});

export {
  ErrorSchema,
  KycIdSchema,
  KycSelfieSchema,
  IdCheckRequestSchema,
  SelfieCheckRequestSchema,
  ApiResponseSchema
};