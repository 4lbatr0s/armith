import { z } from 'zod';

/**
 * Request Validation Schemas
 * Only for validating incoming API requests
 */

// Schema for incoming ID check request
const IdCheckRequestSchema = z.object({
  countryCode: z.string().min(2).max(3).toLowerCase(),
  frontImageUrl: z.string().url('Must be a valid URL'),
  backImageUrl: z.string().url('Must be a valid URL').optional()
});

// Schema for incoming selfie check request
const SelfieCheckRequestSchema = z.object({
  idPhotoUrl: z.string().url('Must be a valid URL'),
  selfieUrls: z.array(z.string().url()).min(1, 'At least one selfie URL is required').max(5, 'Maximum 5 selfie URLs allowed'),
  profileId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid MongoDB ObjectId').optional(), // Link to Profile (MongoDB ObjectId)
  verificationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid MongoDB ObjectId').optional() // Legacy support - same as profileId
});

/**
 * Validate request body against a Zod schema
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {any} data - The data to validate
 * @returns {{ success: boolean, data?: any, details?: Array<{ field: string, message: string }> }}
 */
const validateRequest = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      details: result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    };
  }
  return { success: true, data: result.data };
};

export {
  IdCheckRequestSchema,
  SelfieCheckRequestSchema,
  validateRequest
};
