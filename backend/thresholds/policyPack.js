/**
 * Stable per-country policy pack identifiers for **`meta.policy`** (not tenant-specific versions).
 */

const DEFAULT_PACK = '2026.01';

const COUNTRY_POLICY_PACK_SEMVER = {
    TR: DEFAULT_PACK,
    DE: DEFAULT_PACK,
    GB: DEFAULT_PACK,
    DEFAULT: DEFAULT_PACK
};

/** @returns {{ policyPackId: string, policyPackVersion: string }} */
export function getPolicyPackForCountry(countryCode) {
    const cc = String(countryCode ?? 'TR').toUpperCase();
    const ver = COUNTRY_POLICY_PACK_SEMVER[cc] ?? COUNTRY_POLICY_PACK_SEMVER.DEFAULT;
    return {
        policyPackId: `armith-kyc-${cc}`,
        policyPackVersion: ver
    };
}
