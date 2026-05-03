import type { KycConfigParsed } from './resolve.js';

/** Flat thresholds object used by `/status`, admin GET settings. */
export function flattenedThresholdPayload(resolved: KycConfigParsed) {
    const idMinQ = resolved.idCardThresholds.minImageQuality;
    const selfieMinQ = resolved.selfieThresholds.minImageQuality;
    return {
        fullNameConfidence: resolved.idCardThresholds.minFullNameConfidence,
        identityNumberConfidence: resolved.idCardThresholds.minIdentityNumberConfidence,
        dateOfBirthConfidence: resolved.idCardThresholds.minDateOfBirthConfidence,
        expiryDateConfidence: resolved.idCardThresholds.minExpiryDateConfidence,
        /** Minimum ID card image quality (0–1). */
        imageQuality: idMinQ,
        idMinImageQuality: idMinQ,
        selfieMinImageQuality: selfieMinQ,
        matchConfidence: resolved.selfieThresholds.minMatchConfidence,
        faceDetectionConfidence: resolved.selfieThresholds.minFacialFeatureConfidence,
        spoofingRiskMax: resolved.selfieThresholds.maxSpoofingRisk,
        minLivenessConfidence: resolved.selfieThresholds.minLivenessConfidence,
        minDocumentVitalityConfidence: resolved.idCardThresholds.minDocumentVitalityConfidence,
        minAge: resolved.validationRules.minAge,
        maxAge: resolved.validationRules.maxAge,
        enforceAgeCheck: resolved.validationRules.enforceAgeCheck,
        age: {
            min: resolved.validationRules.minAge,
            max: resolved.validationRules.maxAge,
            enforce: resolved.validationRules.enforceAgeCheck
        },
        allowedLightingConditions: [...resolved.selfieThresholds.allowedLightingConditions],
        allowedFaceSizes: [...resolved.selfieThresholds.allowedFaceSizes],
        allowedFaceCoverage: [...resolved.selfieThresholds.allowedFaceCoverage]
    };
}

export function applyFlatThresholdPatches(
    mongooseConfigDoc: { idCardThresholds: Record<string, unknown>; selfieThresholds: Record<string, unknown>; validationRules: Record<string, unknown> },
    thresholds: Record<string, number | undefined>
) {
    if (thresholds.fullNameConfidence != null) {
        mongooseConfigDoc.idCardThresholds.minFullNameConfidence = thresholds.fullNameConfidence;
    }
    if (thresholds.identityNumberConfidence != null) {
        mongooseConfigDoc.idCardThresholds.minIdentityNumberConfidence = thresholds.identityNumberConfidence;
    }
    if (thresholds.imageQuality != null) {
        mongooseConfigDoc.idCardThresholds.minImageQuality = thresholds.imageQuality;
    }
    if (thresholds.idMinImageQuality != null) {
        mongooseConfigDoc.idCardThresholds.minImageQuality = thresholds.idMinImageQuality;
    }
    if (thresholds.selfieMinImageQuality != null) {
        mongooseConfigDoc.selfieThresholds.minImageQuality = thresholds.selfieMinImageQuality;
    }
    if (thresholds.dateOfBirthConfidence != null) {
        mongooseConfigDoc.idCardThresholds.minDateOfBirthConfidence = thresholds.dateOfBirthConfidence;
    }
    if (thresholds.expiryDateConfidence != null) {
        mongooseConfigDoc.idCardThresholds.minExpiryDateConfidence = thresholds.expiryDateConfidence;
    }
    if (thresholds.matchConfidence != null) {
        mongooseConfigDoc.selfieThresholds.minMatchConfidence = thresholds.matchConfidence;
    }
    if (thresholds.spoofingRiskMax != null) {
        mongooseConfigDoc.selfieThresholds.maxSpoofingRisk = thresholds.spoofingRiskMax;
    }
    if (thresholds.minAge != null) {
        mongooseConfigDoc.validationRules.minAge = thresholds.minAge;
    }
    if (thresholds.maxAge != null) {
        mongooseConfigDoc.validationRules.maxAge = thresholds.maxAge;
    }
    if (thresholds.faceDetectionConfidence != null) {
        mongooseConfigDoc.selfieThresholds.minFacialFeatureConfidence = thresholds.faceDetectionConfidence;
    }
    if (thresholds.minLivenessConfidence != null) {
        mongooseConfigDoc.selfieThresholds.minLivenessConfidence = thresholds.minLivenessConfidence;
    }
    if (thresholds.minDocumentVitalityConfidence != null) {
        mongooseConfigDoc.idCardThresholds.minDocumentVitalityConfidence = thresholds.minDocumentVitalityConfidence;
    }
}
