import type { KycConfigParsed } from './resolve.js';

/** Flat thresholds object used by `/status`, admin GET settings. */
export function flattenedThresholdPayload(resolved: KycConfigParsed) {
    return {
        fullNameConfidence: resolved.idCardThresholds.minFullNameConfidence,
        identityNumberConfidence: resolved.idCardThresholds.minIdentityNumberConfidence,
        dateOfBirthConfidence: resolved.idCardThresholds.minDateOfBirthConfidence,
        expiryDateConfidence: resolved.idCardThresholds.minExpiryDateConfidence,
        imageQuality: resolved.idCardThresholds.minImageQuality,
        matchConfidence: resolved.selfieThresholds.minMatchConfidence,
        faceDetectionConfidence: resolved.selfieThresholds.minFacialFeatureConfidence,
        spoofingRiskMax: resolved.selfieThresholds.maxSpoofingRisk,
        minAge: resolved.validationRules.minAge,
        maxAge: resolved.validationRules.maxAge
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
    if (thresholds.faceDetectionConfidence != null) {
        mongooseConfigDoc.selfieThresholds.minFacialFeatureConfidence = thresholds.faceDetectionConfidence;
    }
}
