/**
 * Tenant-scoped object keys under R2: `users/{clerkTenantId}/...`
 * Legacy path `kyc-uploads/` retained only when env allows (transition).
 */

/** @returns {string | null} normalized key or null if invalid */
export function normalizeObjectKey(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const k = raw.trim().replace(/^\/+/, '');
  if (!k || k.includes('..') || k.includes('\\')) return null;
  return k;
}

/**
 * @param {string} key normalized object key
 * @param {string} tenantUserId Clerk user id for the authenticated tenant (API key / session / capture tenant)
 */
export function isStorageKeyOwnedByTenant(key, tenantUserId) {
  if (!tenantUserId || typeof tenantUserId !== 'string') return false;
  const prefix = `users/${tenantUserId}/`;
  return key.startsWith(prefix);
}

/**
 * @returns {boolean}
 */
export function isLegacyKycUploadsKey(key) {
  return key.startsWith('kyc-uploads/');
}

export function legacyKycUploadsDownloadAllowed() {
  return String(process.env.KYC_STORAGE_ALLOW_LEGACY_KYC_UPLOADS_DOWNLOAD ?? '').trim() === '1';
}
