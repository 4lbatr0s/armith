#!/usr/bin/env node
/**
 * Validates golden JSON fixtures against Zod output schemas (no network).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IdVerificationSchema, SelfieVerificationSchema } from '../kyc/schemas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const cases = [
  { name: 'id-verification', schema: IdVerificationSchema, file: 'test/fixtures/golden/id-verification.golden.json' },
  { name: 'selfie-verification', schema: SelfieVerificationSchema, file: 'test/fixtures/golden/selfie-verification.golden.json' }
];

let failed = false;
for (const { name, schema, file } of cases) {
  const raw = JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  const r = schema.safeParse(raw);
  if (!r.success) {
    failed = true;
    console.error(`[golden] FAIL ${name}:`, r.error.flatten());
  } else {
    console.log(`[golden] OK ${name}`);
  }
}

process.exit(failed ? 1 : 0);
