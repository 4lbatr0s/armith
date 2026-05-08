/**
 * Fallback catalog order if GET /admin/settings omits webhookDataFieldCatalog.
 * Mirror: backend/lib/webhookPayloadExtras.js WEBHOOK_OPTIONAL_DATA_FIELDS
 */
export const WEBHOOK_OPTIONAL_DATA_FIELDS_FALLBACK = Object.freeze([
  'country',
  'idVerificationStatus',
  'selfieVerificationStatus',
  'verificationAttempts',
  'profileCreatedAt',
  'profileUpdatedAt',
  'email',
  'fullName',
  'externalRef',
  'metadata'
]);
