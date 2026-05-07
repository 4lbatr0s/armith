import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultConfig } from '../kyc/defaults.js';

let VerificationService;

before(async () => {
    ({ VerificationService } = await import('../services/verificationService.js'));
});

test('verifyId fixture pipeline runs full post-process without Groq', async () => {
    process.env.VERIFICATION_PIPELINE_FIXTURE = 'id';
    const cfg = createDefaultConfig('ci-pipeline', 'TR');
    const out = await VerificationService.verifyId(cfg, {
        front: 'https://example.invalid/e2e-id-front.bin'
    });
    assert.strictEqual(out.success, true);
    assert.ok(['approved', 'rejected'].includes(out.status));
    assert.ok(Array.isArray(out.errors));
    assert.strictEqual(typeof out.data?.identityNumber, 'string');
});

test('verifySelfie fixture pipeline runs threshold rules without Groq', async () => {
    process.env.VERIFICATION_PIPELINE_FIXTURE = 'selfie';
    const cfg = createDefaultConfig('ci-pipeline', 'TR');
    const out = await VerificationService.verifySelfie(cfg, {
        idPhotoUrl: 'https://example.invalid/id.bin',
        selfieUrls: ['https://example.invalid/selfie.bin']
    });
    assert.strictEqual(out.success, true);
    assert.ok(['approved', 'rejected'].includes(out.status));
    assert.ok(Array.isArray(out.errors));
    assert.ok(typeof out.data?.matchConfidence === 'number');
});
