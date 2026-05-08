/**
 * Optional `data.*` keys merged into outbound webhooks when enabled per tenant (`integrationWebhookDataFields`).
 * PII-bearing keys (`email`, `fullName`) are opt-in only via this allowlist.
 */

export const WEBHOOK_OPTIONAL_DATA_FIELDS = Object.freeze([
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

const FIELD_SET = new Set(WEBHOOK_OPTIONAL_DATA_FIELDS);

/** Stable catalog order for only known tokens. */
export function normalizeIntegrationWebhookDataFields(arr) {
  if (!Array.isArray(arr)) return [];
  const want = new Set();
  for (const raw of arr) {
    const x = typeof raw === 'string' ? raw.trim() : '';
    if (FIELD_SET.has(x)) want.add(x);
  }
  return WEBHOOK_OPTIONAL_DATA_FIELDS.filter((f) => want.has(f));
}

export function resolveWebhookDataFieldsForPublic(saved) {
  return normalizeIntegrationWebhookDataFields(Array.isArray(saved) ? saved : []);
}

function isoDate(value) {
  if (value == null) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function metadataPlain(meta) {
  if (meta == null || typeof meta !== 'object') return undefined;
  if (meta instanceof Map) {
    const o = Object.fromEntries(meta);
    return Object.keys(o).length ? o : undefined;
  }
  const o = { ...meta };
  return Object.keys(o).length ? o : undefined;
}

/**
 * @param {object} profile - Mongoose doc or plain object
 * @param {string[]} normalizedFields - From normalizeIntegrationWebhookDataFields
 * @returns {Record<string, unknown>}
 */
export function buildWebhookOptionalData(profile, normalizedFields) {
  if (!profile || !normalizedFields?.length) return {};
  const out = {};
  for (const f of normalizedFields) {
    switch (f) {
      case 'country':
        if (profile.country) out.country = String(profile.country).toUpperCase();
        break;
      case 'idVerificationStatus':
        if (profile.idVerificationStatus != null) out.idVerificationStatus = profile.idVerificationStatus;
        break;
      case 'selfieVerificationStatus':
        if (profile.selfieVerificationStatus != null) {
          out.selfieVerificationStatus = profile.selfieVerificationStatus;
        }
        break;
      case 'verificationAttempts':
        out.verificationAttempts = profile.verificationAttempts ?? 0;
        break;
      case 'profileCreatedAt': {
        const t = isoDate(profile.createdAt);
        if (t) out.profileCreatedAt = t;
        break;
      }
      case 'profileUpdatedAt': {
        const t = isoDate(profile.updatedAt);
        if (t) out.profileUpdatedAt = t;
        break;
      }
      case 'email':
        if (profile.email) out.email = profile.email;
        break;
      case 'fullName':
        if (profile.fullName) out.fullName = profile.fullName;
        break;
      case 'externalRef':
        if (profile.integrationExternalRef) {
          out.externalRef = String(profile.integrationExternalRef);
        }
        break;
      case 'metadata': {
        const m = metadataPlain(profile.integrationMetadata);
        if (m) out.metadata = m;
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/** Merge extras into webhook payload.data without mutating inputs. */
export function mergeWebhookDataSection(baseData, extras) {
  const base = baseData && typeof baseData === 'object' ? { ...baseData } : {};
  if (!extras || typeof extras !== 'object' || Object.keys(extras).length === 0) return base;
  return { ...base, ...extras };
}
