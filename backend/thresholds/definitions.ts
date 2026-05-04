/**
 * Declarative score rows for API responses (confidenceScores).
 */

import type { KycConfigParsed } from './resolve.js';

export type ConfidenceScoreRow = {
    confidenceValueName: string;
    threshold?: number | null | undefined;
    confidenceScore?: number | null | undefined;
    /** Categorical selfie / quality fields (no single numeric threshold). */
    observedValue?: string | null;
    allowedValues?: string[] | null;
    pass?: boolean | null;
};

export function buildIdConfidenceRowsFromVerification(
    result: {
        confidence?: Record<string, number | undefined>;
        data?: { quality?: { imageQuality?: number | undefined } | null };
        authenticity?: { documentVitalityScore?: number | null };
    },
    resolved: KycConfigParsed
): ConfidenceScoreRow[] {
    const t = resolved.idCardThresholds;
    const c = result.confidence ?? {};
    const imgQ = c.imageQuality ?? result.data?.quality?.imageQuality;
    const vitality = result.authenticity?.documentVitalityScore;
    return [
        { confidenceValueName: 'firstName', confidenceScore: c.firstNameConfidence, threshold: t.minFullNameConfidence },
        { confidenceValueName: 'lastName', confidenceScore: c.lastNameConfidence, threshold: t.minFullNameConfidence },
        { confidenceValueName: 'identityNumber', confidenceScore: c.identityNumberConfidence, threshold: t.minIdentityNumberConfidence },
        { confidenceValueName: 'dateOfBirth', confidenceScore: c.dateOfBirthConfidence, threshold: t.minDateOfBirthConfidence },
        { confidenceValueName: 'expiryDate', confidenceScore: c.expiryDateConfidence, threshold: t.minExpiryDateConfidence },
        { confidenceValueName: 'imageQuality', confidenceScore: imgQ, threshold: t.minImageQuality },
        {
            confidenceValueName: 'documentVitalityScore',
            confidenceScore: vitality ?? undefined,
            threshold: t.minDocumentVitalityConfidence
        },
        {
            confidenceValueName: 'mrzConfidence',
            confidenceScore: c.mrzConfidence,
            threshold: t.minMrzConfidence
        }
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
        },
        {
            confidenceValueName: 'documentVitalityScore',
            confidenceScore: idRow.documentVitalityScore,
            threshold: t.minDocumentVitalityConfidence
        },
        {
            confidenceValueName: 'mrzConfidence',
            confidenceScore: idRow.mrzConfidence,
            threshold: t.minMrzConfidence
        }
    ];
}

function normCategorical(s: string | null | undefined): string {
    return String(s ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

function categoricalPass(observed: string | null | undefined, allowed: string[]): boolean | null {
    if (observed == null || observed === '') return null;
    if (!allowed.length) return null;
    const o = normCategorical(observed);
    return allowed.some((a) => normCategorical(a) === o || normCategorical(a.replace(/-/g, '_')) === o);
}

export function buildSelfieConfidenceRows(
    selfie: {
        matchConfidence?: number | null;
        faceDetectionConfidence?: number | null;
        spoofingRisk?: number | null;
        livenessConfidence?: number | null;
        imageQuality?: number | null;
        lightingCondition?: string | null;
        faceSize?: string | null;
        faceCoverage?: string | null;
    },
    resolved: KycConfigParsed
): ConfidenceScoreRow[] {
    const t = resolved.selfieThresholds;
    const lighting = selfie.lightingCondition ?? null;
    const faceSize = selfie.faceSize ?? null;
    const faceCoverage = selfie.faceCoverage ?? null;
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
        },
        {
            confidenceValueName: 'livenessConfidence',
            confidenceScore: selfie.livenessConfidence,
            threshold: t.minLivenessConfidence
        },
        {
            confidenceValueName: 'selfieImageQuality',
            confidenceScore: selfie.imageQuality,
            threshold: t.minImageQuality
        },
        {
            confidenceValueName: 'lightingCondition',
            observedValue: lighting,
            allowedValues: [...t.allowedLightingConditions],
            pass: categoricalPass(lighting, t.allowedLightingConditions)
        },
        {
            confidenceValueName: 'faceSize',
            observedValue: faceSize,
            allowedValues: [...t.allowedFaceSizes],
            pass: categoricalPass(faceSize, t.allowedFaceSizes)
        },
        {
            confidenceValueName: 'faceCoverage',
            observedValue: faceCoverage,
            allowedValues: [...t.allowedFaceCoverage],
            pass: categoricalPass(faceCoverage, t.allowedFaceCoverage)
        }
    ];
}
