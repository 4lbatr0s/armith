/**
 * Tenant-scoped object keys under R2: `users/{Mongo users._id}/...`
 * Older deployments may still use `users/{clerk_user_*}/`; both are honored when validating access.
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
 * @param {string | null} [tenantMongoUserId] Mongo `users._id` hex
 * @param {string | null} [tenantClerkUserId] Legacy path prefix Clerk `user_*`
 */
export function isStorageKeyOwnedByTenant(key, tenantMongoUserId, tenantClerkUserId = null) {
  if (!key || typeof key !== 'string') return false;
  if (tenantMongoUserId && typeof tenantMongoUserId === 'string' && tenantMongoUserId.trim()) {
    const p = `users/${tenantMongoUserId.trim()}/`;
    if (key.startsWith(p)) return true;
  }
  if (tenantClerkUserId && typeof tenantClerkUserId === 'string' && tenantClerkUserId.trim()) {
    const p = `users/${tenantClerkUserId.trim()}/`;
    if (key.startsWith(p)) return true;
  }
  return false;
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
