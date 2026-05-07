/**
 * RETRY vs FINAL style hint for outbound terminal webhooks.
 * Mirrors common KYC semantics: rejection driven only by warnings → suggest retry with better capture.
 */

/** Omit unless verification reached a terminal profile outcome. */
export function outcomeSemanticsForTerminalResponse({ terminalStatusUpper, profile, rawVerificationErrors }) {
    const st = String(terminalStatusUpper || '').toUpperCase();
    if (!['APPROVED', 'REJECTED', 'FAILED'].includes(st)) return undefined;
    if (profile) return deriveOutcomeSemantics(profile);
    return deriveOutcomeSemantics({
        status: st,
        rejectionReasons: Array.isArray(rawVerificationErrors) ? rawVerificationErrors : []
    });
}

export function deriveOutcomeSemantics(profile) {
    if (!profile) return undefined;
    const st = String(profile.status ?? '').toUpperCase();

    if (st === 'APPROVED') return 'FINAL';
    if (st === 'FAILED') return 'FINAL';

    if (st !== 'REJECTED') return undefined;

    const reasons = Array.isArray(profile.rejectionReasons) ? profile.rejectionReasons : [];
    if (reasons.length === 0) return 'FINAL';

    const allNonBlocking = reasons.every((r) => {
        const sev = typeof r?.severity === 'string' ? r.severity.toLowerCase() : 'critical';
        return sev === 'warning' || sev === 'info';
    });

    return allNonBlocking ? 'RETRY_SUGGESTED' : 'FINAL';
}
