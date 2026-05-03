import { ValidationError } from '../src/validation/country-validator.interface.js';
import { ERRORS } from '../kyc/config.js';
import type { KycConfigParsed } from './resolve.js';

function severityForMinimum(score: number, threshold: number): 'critical' | 'warning' {
    return score < threshold - 0.2 ? 'critical' : 'warning';
}

function pushMinimumConfidence(
    errors: ValidationError[],
    field: string,
    score: number | undefined,
    threshold: number | undefined,
    thresholdLabel = 'threshold'
) {
    if (score === undefined || threshold === undefined) return;
    if (score < threshold) {
        errors.push(
            new ValidationError(
                ERRORS.LOW_CONFIDENCE.code,
                `Confidence score for ${field} (${(score * 100).toFixed(1)}%) is below ${thresholdLabel} (${(threshold * 100).toFixed(1)}%).`,
                field,
                severityForMinimum(score, threshold)
            )
        );
    }
}

function pushMaximumScore(
    errors: ValidationError[],
    field: string,
    score: number | undefined,
    ceiling: number | undefined,
    messageBuilder: () => string
) {
    if (score === undefined || ceiling === undefined) return;
    if (score > ceiling) {
        errors.push(new ValidationError(ERRORS.LOW_CONFIDENCE.code, messageBuilder(), field, 'critical'));
    }
}

export function evaluateIdThresholdErrors(llmParsed: Record<string, any>, resolved: KycConfigParsed): ValidationError[] {
    const errors: ValidationError[] = [];
    const scores = llmParsed.confidence ?? {};
    const t = resolved.idCardThresholds;

    pushMinimumConfidence(errors, 'firstName', scores.firstNameConfidence, t.minFullNameConfidence);
    pushMinimumConfidence(errors, 'lastName', scores.lastNameConfidence, t.minFullNameConfidence);
    pushMinimumConfidence(errors, 'identityNumber', scores.identityNumberConfidence, t.minIdentityNumberConfidence);
    pushMinimumConfidence(errors, 'dateOfBirth', scores.dateOfBirthConfidence, t.minDateOfBirthConfidence);
    pushMinimumConfidence(errors, 'expiryDate', scores.expiryDateConfidence, t.minExpiryDateConfidence);
    pushMinimumConfidence(errors, 'overallConfidence', scores.overallConfidence, t.minOverallConfidence);
    pushMinimumConfidence(errors, 'mrzConfidence', scores.mrzConfidence, t.minMrzConfidence);

    const imageQuality =
        scores.imageQuality ?? llmParsed.quality?.imageQuality ?? llmParsed.extraction?.quality?.imageQuality;
    pushMinimumConfidence(errors, 'imageQuality', imageQuality, t.minImageQuality);

    const tampering = llmParsed.authenticity?.tamperingRisk;
    pushMaximumScore(
        errors,
        'tamperingRisk',
        tampering,
        t.maxTamperingRisk,
        () =>
            `Tampering risk (${((tampering as number) * 100).toFixed(1)}%) exceeds maximum (${(t.maxTamperingRisk * 100).toFixed(1)}%).`
    );

    const condition = llmParsed.authenticity?.documentCondition?.toLowerCase?.() as string | undefined;
    const allowedList = (t.acceptableDocumentConditions || []).map((c: string) => c.toLowerCase());
    if (condition && allowedList.length > 0 && !allowedList.includes(condition)) {
        errors.push(
            new ValidationError(
                'POOR_DOCUMENT_CONDITION',
                `Document condition '${condition}' is not acceptable.`,
                'documentCondition',
                'critical'
            )
        );
    }

    return errors;
}

function norm(s?: string): string {
    return (s || '').trim().toLowerCase();
}

export function evaluateSelfieRules(normalized: Record<string, any>, resolved: KycConfigParsed): Array<{ code: number }> {
    const out: Array<{ code: number }> = [];
    const st = resolved.selfieThresholds;

    if (normalized.faceCount === 0) {
        out.push(ERRORS.NO_FACE_DETECTED);
    } else if (normalized.faceCount > 1) {
        out.push(ERRORS.MULTIPLE_FACES);
    }

    if (!normalized.isMatch || normalized.matchConfidence < st.minMatchConfidence) {
        out.push(ERRORS.LOW_MATCH_CONFIDENCE);
    }

    if ((normalized.spoofingRisk ?? 0) > st.maxSpoofingRisk) {
        out.push(ERRORS.SPOOFING_DETECTED);
    }

    const imgQ = normalized.imageQuality;
    if (imgQ !== undefined && imgQ < st.minImageQuality) {
        out.push(ERRORS.POOR_IMAGE_QUALITY);
    }

    const faceConf = normalized.faceDetectionConfidence;
    if (faceConf !== undefined && faceConf < st.minFacialFeatureConfidence) {
        out.push(ERRORS.NO_FACE_DETECTED);
    }

    const lighting = norm(normalized.lightingCondition);
    if (lighting === 'insufficient') {
        out.push(ERRORS.INSUFFICIENT_LIGHTING);
    } else if (lighting && st.allowedLightingConditions.length > 0) {
        const allowed = st.allowedLightingConditions.map(norm);
        if (!allowed.some((x) => x === lighting)) {
            out.push(ERRORS.INSUFFICIENT_LIGHTING);
        }
    }

    const faceSize = norm(normalized.faceSize);
    if (faceSize === 'too_small') {
        out.push(ERRORS.FACE_TOO_SMALL);
    } else if (faceSize && st.allowedFaceSizes.length > 0) {
        const allowed = st.allowedFaceSizes.map(norm);
        if (!allowed.some((x) => x === faceSize && x !== '')) {
            out.push(ERRORS.FACE_TOO_SMALL);
        }
    }

    let coverage = norm(normalized.faceCoverage).replace(/\s+/g, '_');
    if (coverage === 'clear') coverage = 'fully_visible';
    const allowedCov = st.allowedFaceCoverage.map((c: string) => norm(c.replace(/\s+/g, '_')));
    if (
        coverage &&
        allowedCov.length > 0 &&
        !allowedCov.includes(coverage)
    ) {
        out.push(ERRORS.FACE_PARTIALLY_COVERED);
    }

    const seen = new Set<number>();
    return out.filter((e) => {
        if (!e?.code || seen.has(e.code)) return false;
        seen.add(e.code);
        return true;
    });
}
