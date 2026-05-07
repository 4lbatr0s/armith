import { ERRORS } from '../kyc/config.js';
import { normalizeDateToIso, normToken } from '../thresholds/fake-value-denylist.js';
import { ValidationError } from './country-validator.interface.js';

const MRZ_ERR = ERRORS.MRZ_CROSS_VALIDATION_FAILED;

function digitsOnly(v: unknown): string {
    return String(v ?? '').replace(/\D/g, '');
}

function elevenDigitSubstrings(digits: string): string[] {
    const out: string[] = [];
    for (let i = 0; i <= digits.length - 11; i++) out.push(digits.slice(i, i + 11));
    return out;
}

function visualSexToMrz(v: unknown): string | null {
    const t = normToken(String(v ?? ''));
    if (t === 'm' || t === 'male' || t === 'erkek') return 'M';
    if (t === 'f' || t === 'female' || t === 'kadın' || t === 'kadin') return 'F';
    return null;
}

function nameTokens(s: unknown): string[] {
    return String(s ?? '')
        .trim()
        .toUpperCase()
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .split(/\s+/)
        .filter(Boolean);
}

function tokenSubsetMatch(a: string[], b: string[]): boolean {
    if (!a.length || !b.length) return true;
    return a.every((t) => b.includes(t)) || b.every((t) => a.includes(t));
}

function idMismatch(exId: string, mzDoc: string): boolean {
    if (exId.length !== 11 || mzDoc.length < 11) return false;
    return !elevenDigitSubstrings(mzDoc).includes(exId);
}

export function validateMrzAgainstExtraction(
    extraction: Record<string, unknown>,
    mrzParsed: Record<string, unknown> | null | undefined
): ValidationError[] {
    if (!mrzParsed || typeof mrzParsed !== 'object') return [];

    let bad = false;
    const exId = digitsOnly(extraction.identityNumber);
    const mzDoc = digitsOnly(mrzParsed.documentNumber);
    if (exId.length === 11 && mzDoc.length >= 11 && idMismatch(exId, mzDoc)) {
        bad = true;
    }

    const dEx = normalizeDateToIso(extraction.dateOfBirth != null ? String(extraction.dateOfBirth) : '');
    const dMz = normalizeDateToIso(mrzParsed.dateOfBirth != null ? String(mrzParsed.dateOfBirth) : '');
    if (dEx && dMz && dEx !== dMz) bad = true;

    const eEx = normalizeDateToIso(extraction.expiryDate != null ? String(extraction.expiryDate) : '');
    const eMz = normalizeDateToIso(mrzParsed.expiryDate != null ? String(mrzParsed.expiryDate) : '');
    if (eEx && eMz && eEx !== eMz) bad = true;

    const vFirst = nameTokens(extraction.firstName);
    const mGiven = nameTokens(mrzParsed.givenNames);
    if (vFirst.length && mGiven.length && !tokenSubsetMatch(vFirst, mGiven)) {
        bad = true;
    }

    const vLast = nameTokens(extraction.lastName);
    const mLast = nameTokens(mrzParsed.surname);
    if (vLast.length && mLast.length && !tokenSubsetMatch(vLast, mLast)) {
        bad = true;
    }

    const vs = visualSexToMrz(extraction.gender);
    const ms = String(mrzParsed.sex ?? '')
        .trim()
        .toUpperCase()
        .slice(0, 1);
    if (vs && ms && vs !== ms) bad = true;

    if (!bad) return [];
    return [new ValidationError(MRZ_ERR.code, MRZ_ERR.message, 'mrz', 'critical')];
}
