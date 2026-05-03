import { STATUS } from '../../kyc/config.js';

/**
 * After ID passes (LLM + server thresholds): tenant needs only ID → full approval;
 * tenant also needs selfie → stay pending until selfie step succeeds.
 */
export function deriveIdCheckpointStatus(llmApproved, verificationRules) {
    if (llmApproved === STATUS.APPROVED && verificationRules?.requireSelfie) {
        return STATUS.PENDING;
    }
    return llmApproved;
}

/** @param {string} idValidationStatusUpper - e.g. APPROVED, PENDING */
export function computeProfileStatusAfterSelfie({ verificationRules, idValidationStatusUpper, selfieStatus }) {
    const idOk = !verificationRules.requireIdCard || idValidationStatusUpper === 'APPROVED';
    const selfieOk = !verificationRules.requireSelfie || selfieStatus === STATUS.APPROVED;

    let overallStatus = selfieStatus;
    if (idOk && selfieOk) {
        overallStatus = STATUS.APPROVED;
    } else if (selfieStatus === STATUS.FAILED || idValidationStatusUpper === 'FAILED') {
        overallStatus = STATUS.FAILED;
    } else if (selfieStatus === STATUS.REJECTED || idValidationStatusUpper === 'REJECTED') {
        overallStatus = STATUS.REJECTED;
    }
    return overallStatus;
}
