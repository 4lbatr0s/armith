import test from 'node:test';
import assert from 'node:assert/strict';

import {
    deriveOutcomeSemantics,
    outcomeSemanticsForTerminalResponse
} from '../services/kyc/webhookOutcomeSemantics.js';
import { basePublicMeta } from '../config/public-api-meta.js';

test('deriveOutcomeSemantics rejects with all warnings → RETRY_SUGGESTED', () => {
    const o = deriveOutcomeSemantics({
        status: 'REJECTED',
        rejectionReasons: [{ severity: 'warning', message: 'blur' }]
    });
    assert.equal(o, 'RETRY_SUGGESTED');
});

test('outcomeSemanticsForTerminalResponse omits for non-terminal overall status', () => {
    const o = outcomeSemanticsForTerminalResponse({
        terminalStatusUpper: 'pending',
        profile: { status: 'PENDING', rejectionReasons: [] }
    });
    assert.equal(o, undefined);
});

test('basePublicMeta merges tenant policy extras when provided', () => {
    const m = basePublicMeta({ tenantConfigVersion: 3, policyCountryCode: 'TR' });
    assert.equal(m.policy.tenantConfigVersion, 3);
    assert.equal(m.policy.policyCountryCode, 'TR');
    assert.ok(m.policy.bundleVersion);
});
