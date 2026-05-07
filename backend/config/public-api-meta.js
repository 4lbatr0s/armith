/**
 * Public HTTP API contract metadata shipped on selected KYC responses.
 * Bump POLICY_BUNDLE_VERSION when thresholds/verification rules semantics change materially.
 */

export const PUBLIC_API_SEMANTIC_VERSION = '1';

export const POLICY_BUNDLE_VERSION = 'armith-kyc@2026-05-06';

export const DOCUMENTED_LLM_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

/** @returns {Record<string, unknown>} */
export function basePublicMeta(policyExtras = {}) {
    const extras =
        policyExtras &&
        typeof policyExtras === 'object' &&
        !Array.isArray(policyExtras) &&
        Object.keys(policyExtras).length > 0
            ? policyExtras
            : {};
    return {
        api: { semanticVersion: PUBLIC_API_SEMANTIC_VERSION },
        policy: { bundleVersion: POLICY_BUNDLE_VERSION, ...extras },
        inference: { modelRef: DOCUMENTED_LLM_MODEL }
    };
}

/**
 * @param {Record<string, unknown> | unknown} payload
 * @param {Record<string, unknown>} [policyExtras] — e.g. `{ tenantConfigVersion, policyCountryCode }`
 * @returns {Record<string, unknown>}
 */
export function withPublicApiMeta(payload, policyExtras = undefined) {
    const body =
        payload && typeof payload === 'object' && !Array.isArray(payload)
            ? { ...payload }
            : { data: payload };
    return {
        ...body,
        meta: basePublicMeta(policyExtras)
    };
}
