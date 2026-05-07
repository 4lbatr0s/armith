import test from 'node:test';
import assert from 'node:assert/strict';
import { sniffImageDimensions } from '../lib/imageProbe.js';
import { ipAllowedByRules, validateOneRule } from '../lib/ipAllowlist.js';

const PNG_ONE_BY_ONE =
    Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGAAAAAEAAGjCHcAAAAASUVORK5CYII=',
        'base64'
    );

test('sniff PNG 1x1 dimensions', () => {
    const d = sniffImageDimensions(PNG_ONE_BY_ONE);
    assert.deepStrictEqual(d, { w: 1, h: 1 });
});

test('IPv6 allowlist accepts /64 inside db8 subnet', () => {
    assert.strictEqual(validateOneRule('2001:db8::/32'), true);
    assert.strictEqual(ipAllowedByRules('2001:db8::1', ['2001:db8::/32']), true);
    assert.strictEqual(ipAllowedByRules('2002::1', ['2001:db8::/32']), false);
});
