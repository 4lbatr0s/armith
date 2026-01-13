/**
 * Zod Schemas for Structured Outputs
 * Used with Groq API's response_format to guarantee valid JSON responses
 */

import { z } from 'zod';

// ============================================================================
// ID VERIFICATION SCHEMA
// ============================================================================

const ErrorSchema = z.object({
  code: z.string(),
  field: z.string(),
  message: z.string(),
  severity: z.enum(['critical', 'warning', 'info']),
  threshold: z.string().nullable().optional()
});

const MrzParsedSchema = z.object({
  documentType: z.string().nullable(),
  issuingCountry: z.string().nullable(),
  documentNumber: z.string().nullable(),
  dateOfBirth: z.string().nullable().optional(),
  sex: z.enum(['M', 'F']).nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  nationality: z.string().nullable(),
  surname: z.string().nullable().optional(),
  givenNames: z.string().nullable().optional()
});

const MrzSchema = z.object({
  raw: z.string().nullable(),
  parsed: MrzParsedSchema,
  checksumValid: z.boolean().nullable(),
  mrzConfidence: z.number().min(0).max(1).nullable()
});

const ExtractionSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  identityNumber: z.string().nullable(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  gender: z.enum(['M', 'F']).nullable(),
  serialNumber: z.string().nullable(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  nationality: z.string().nullable(),
  address: z.string().nullable()
});

const BooleanCoerce = z.preprocess((val) => {
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
  }
  return val;
}, z.boolean());

const AuthenticitySchema = z.object({
  documentCondition: z.enum(['excellent', 'good', 'fair', 'poor']).default('good'),
  hologramPresence: BooleanCoerce.nullable().optional().default(null),
  photoQuality: z.enum(['excellent', 'good', 'fair', 'poor']).nullable().optional().default('good'),
  fontConsistency: BooleanCoerce.nullable().optional().default(true),
  edgeIntegrity: BooleanCoerce.nullable().optional().default(true),
  colorAccuracy: BooleanCoerce.nullable().optional().default(true),
  tamperingRisk: z.coerce.number().min(0).max(1).default(0)
});

const QualitySchema = z.object({
  imageQuality: z.coerce.number().min(0).max(1).nullable(),
  readabilityIssues: z.array(z.string()),
  countryCode: z.string()
});

const ConfidenceSchema = z.object({
  firstNameConfidence: z.coerce.number().min(0).max(1).nullable(),
  lastNameConfidence: z.coerce.number().min(0).max(1).nullable(),
  identityNumberConfidence: z.coerce.number().min(0).max(1).nullable(),
  dateOfBirthConfidence: z.coerce.number().min(0).max(1).nullable(),
  expiryDateConfidence: z.coerce.number().min(0).max(1).nullable(),
  mrzConfidence: z.coerce.number().min(0).max(1).nullable(),
  overallConfidence: z.coerce.number().min(0).max(1).nullable()
});

const ValidationSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ErrorSchema)
});

const MetadataSchema = z.object({
  processingTime: z.string().nullable().optional().default('0ms'),
  imagesProcessed: z.number().int().min(1).max(2).nullable().optional().default(1)
});

export const IdVerificationSchema = z.object({
  extraction: ExtractionSchema,
  mrz: MrzSchema,
  authenticity: AuthenticitySchema,
  quality: QualitySchema,
  confidence: ConfidenceSchema,
  validation: ValidationSchema,
  metadata: MetadataSchema
});

// ============================================================================
// SELFIE VERIFICATION SCHEMA
// ============================================================================

const SelfieErrorSchema = z.object({
  code: z.string(),
  field: z.string(),
  message: z.string(),
  severity: z.enum(['critical', 'warning']),
  threshold: z.string().nullable().optional()
});

const FaceDetectionSchema = z.object({
  idPhotoFaceCount: z.number().int().min(0),
  selfie1FaceCount: z.number().int().min(0),
  selfie2FaceCount: z.number().int().min(0).nullable().optional(),
  faceDetectionConfidence: z.number().min(0).max(1).nullable()
});

const FacialFeatureScoresSchema = z.object({
  facialStructure: z.number().min(0).max(1).nullable(),
  eyes: z.number().min(0).max(1).nullable(),
  nose: z.number().min(0).max(1).nullable(),
  mouthAndChin: z.number().min(0).max(1).nullable(),
  ears: z.number().min(0).max(1).nullable().optional()
});

const BiometricMatchSchema = z.object({
  isMatch: z.boolean(),
  matchConfidence: z.number().int().min(0).max(100).nullable(),
  facialFeatureScores: FacialFeatureScoresSchema
});

const LivenessSchema = z.object({
  spoofingRisk: z.number().min(0).max(1).nullable(),
  livenessConfidence: z.number().min(0).max(1).nullable(),
  spoofingIndicators: z.array(z.string()),
  livenessIndicators: z.array(z.string())
});

const ImageQualitySchema = z.object({
  selfie1Quality: z.number().min(0).max(1).nullable(),
  selfie2Quality: z.number().min(0).max(1).nullable().optional(),
  lightingCondition: z.enum(['excellent', 'good', 'acceptable', 'poor', 'insufficient']),
  faceSize: z.enum(['optimal', 'adequate', 'too_small', 'too_large']),
  faceCoverage: z.enum(['fully_visible', 'partially_obscured', 'significantly_obscured', 'not_visible']),
  qualityIssues: z.array(z.string())
});

const SelfieValidationSchema = z.object({
  status: z.enum(['pass', 'fail', 'review']),
  errors: z.array(SelfieErrorSchema)
});

const ExplainabilitySchema = z.object({
  matchingReasons: z.array(z.string()),
  mismatchReasons: z.array(z.string()),
  spoofingIndicators: z.array(z.string()),
  qualityIssues: z.array(z.string())
});

const SelfieMetadataSchema = z.object({
  processingTime: z.string(),
  imagesAnalyzed: z.number().int().min(2).max(4)
});

export const SelfieVerificationSchema = z.object({
  faceDetection: FaceDetectionSchema,
  biometricMatch: BiometricMatchSchema,
  liveness: LivenessSchema,
  imageQuality: ImageQualitySchema,
  validation: SelfieValidationSchema,
  explainability: ExplainabilitySchema,
  metadata: SelfieMetadataSchema
});

// ============================================================================
// CONVERT ZOD SCHEMA TO JSON SCHEMA
// ============================================================================

/**
 * Simple Zod to JSON Schema converter
 * Handles basic Zod types for Groq API compatibility
 */
function zodToJsonSchema(zodSchema) {
  return convertZodType(zodSchema).schema;
}

function convertZodType(zodType) {
  const def = zodType._def;

  // Handle wrappers: Nullable, Optional
  if (def.typeName === 'ZodNullable' || def.typeName === 'ZodOptional') {
    const inner = convertZodType(def.innerType || def.schema);
    const schema = { ...inner.schema };

    // If it's already a union with null, don't wrap it again
    if (schema.anyOf && schema.anyOf.some(t => t.type === 'null')) {
      return { schema, required: true };
    }

    // Groq/OpenAI strict mode requires all fields in 'required'.
    // To allow "missing" values, they must be nullable and the AI must return null.
    return {
      schema: {
        anyOf: [
          schema,
          { type: 'null' }
        ]
      },
      required: true
    };
  }

  // Handle Default (transparent wrapper)
  if (def.typeName === 'ZodDefault') {
    return convertZodType(def.innerType || def.schema);
  }

  // Handle effects (preprocess, refine, transform)
  if (def.typeName === 'ZodEffects') {
    return convertZodType(def.schema);
  }

  // Handle enum
  if (def.typeName === 'ZodEnum') {
    return {
      schema: { type: 'string', enum: def.values },
      required: true
    };
  }

  // Handle string
  if (def.typeName === 'ZodString') {
    const schema = { type: 'string' };
    if (def.checks) {
      for (const check of def.checks) {
        if (check.kind === 'regex') {
          schema.pattern = check.regex.source;
        }
      }
    }
    return { schema, required: true };
  }

  // Handle number
  if (def.typeName === 'ZodNumber') {
    const schema = { type: 'number' };
    if (def.checks) {
      for (const check of def.checks) {
        if (check.kind === 'min') {
          schema.minimum = check.value;
        } else if (check.kind === 'max') {
          schema.maximum = check.value;
        } else if (check.kind === 'int') {
          schema.type = 'integer';
        }
      }
    }
    return { schema, required: true };
  }

  // Handle boolean
  if (def.typeName === 'ZodBoolean') {
    return { schema: { type: 'boolean' }, required: true };
  }

  // Handle array
  if (def.typeName === 'ZodArray') {
    const inner = convertZodType(def.type);
    return {
      schema: {
        type: 'array',
        items: inner.schema
      },
      required: true
    };
  }

  // Handle object
  if (def.typeName === 'ZodObject') {
    const properties = {};
    const required = [];

    // Access shape reliably
    const shape = typeof zodType.shape === 'object' ? zodType.shape :
      (typeof def.shape === 'function' ? def.shape() : (def.shape || {}));

    for (const [key, value] of Object.entries(shape)) {
      const converted = convertZodType(value);
      properties[key] = converted.schema;
      required.push(key);
    }

    return {
      schema: {
        type: 'object',
        properties,
        required: required,
        additionalProperties: false
      },
      required: true
    };
  }

  // Default fallback
  return { schema: { type: 'string' }, required: true };
}

/**
 * Convert Zod schema to JSON Schema for Groq API
 */
export function zodToGroqJsonSchema(zodSchema) {
  return zodToJsonSchema(zodSchema);
}

// Export JSON schemas for Groq API
export const ID_VERIFICATION_SCHEMA = zodToGroqJsonSchema(IdVerificationSchema);
export const SELFIE_VERIFICATION_SCHEMA = zodToGroqJsonSchema(SelfieVerificationSchema);
