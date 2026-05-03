/**
 * Declarative score rows for API responses (confidenceScores).
 */

import type { KycConfigParsed } from './resolve.js';

export type ConfidenceScoreRow = {
    confidenceValueName: string;
    threshold?: number | null | undefined;
    confidenceScore?: number | null | undefined;
};

export function buildIdConfidenceRowsFromVerification(
    result: {
        confidence?: Record<string, number | undefined>;
        data?: { quality?: { imageQuality?: number | undefined } | null };
    },
    resolved: KycConfigParsed
): ConfidenceScoreRow[] {
    const t = resolved.idCardThresholds;
    const c = result.confidence ?? {};
    const imgQ = c.imageQuality ?? result.data?.quality?.imageQuality;
    return [
        { confidenceValueName: 'firstName', confidenceScore: c.firstNameConfidence, threshold: t.minFullNameConfidence },
        { confidenceValueName: 'lastName', confidenceScore: c.lastNameConfidence, threshold: t.minFullNameConfidence },
        { confidenceValueName: 'identityNumber', confidenceScore: c.identityNumberConfidence, threshold: t.minIdentityNumberConfidence },
        { confidenceValueName: 'dateOfBirth', confidenceScore: c.dateOfBirthConfidence, threshold: t.minDateOfBirthConfidence },
        { confidenceValueName: 'expiryDate', confidenceScore: c.expiryDateConfidence, threshold: t.minExpiryDateConfidence },
        { confidenceValueName: 'imageQuality', confidenceScore: imgQ, threshold: t.minImageQuality }
    ];
}

export function buildIdConfidenceRowsFromStoredRecord(idRow: Record<string, number | null | undefined>, resolved: KycConfigParsed): ConfidenceScoreRow[] {
    const t = resolved.idCardThresholds;
    return [
        {
            confidenceValueName: 'firstName',
            confidenceScore: idRow.firstNameConfidence,
            threshold: t.minFullNameConfidence
        },
        {
            confidenceValueName: 'lastName',
            confidenceScore: idRow.lastNameConfidence,
            threshold: t.minFullNameConfidence
        },
        {
            confidenceValueName: 'identityNumber',
            confidenceScore: idRow.identityNumberConfidence,
            threshold: t.minIdentityNumberConfidence
        },
        {
            confidenceValueName: 'dateOfBirth',
            confidenceScore: idRow.dateOfBirthConfidence,
            threshold: t.minDateOfBirthConfidence
        },
        {
            confidenceValueName: 'expiryDate',
            confidenceScore: idRow.expiryDateConfidence,
            threshold: t.minExpiryDateConfidence
        },
        {
            confidenceValueName: 'imageQuality',
            confidenceScore: idRow.imageQuality,
            threshold: t.minImageQuality
        }
    ];
}

export function buildSelfieConfidenceRows(
    selfie: {
        matchConfidence?: number | null;
        faceDetectionConfidence?: number | null;
        spoofingRisk?: number | null;
    },
    resolved: KycConfigParsed
): ConfidenceScoreRow[] {
    const t = resolved.selfieThresholds;
    return [
        {
            confidenceValueName: 'matchConfidence',
            confidenceScore: selfie.matchConfidence,
            threshold: t.minMatchConfidence
        },
        {
            confidenceValueName: 'faceDetectionConfidence',
            confidenceScore: selfie.faceDetectionConfidence,
            threshold: t.minFacialFeatureConfidence
        },
        {
            confidenceValueName: 'spoofingRisk',
            confidenceScore: selfie.spoofingRisk,
            threshold: t.maxSpoofingRisk
        }
    ];
}
