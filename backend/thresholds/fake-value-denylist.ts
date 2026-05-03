import type { KycConfigParsed } from './resolve.js';

/** Lowercase tokens compared with normalized field text. */
export const DEFAULT_FIELD_DENYLIST: Record<string, string[]> = {
    firstName: ['test', 'fake', 'demo', 'sample', 'dummy', 'placeholder', 'specimen', 'örnek', 'ornek', 'admin', 'user', 'xxx', 'null', 'undefined', 'lorem', 'ipsum'],
    lastName: ['test', 'fake', 'demo', 'sample', 'dummy', 'placeholder', 'specimen', 'örnek', 'ornek', 'admin', 'user', 'xxx', 'null', 'undefined', 'lorem', 'ipsum'],
    nationality: ['xxx', 'tst', 'fake', 'zzz', 'n/a'],
    gender: ['x', 'u', 'n/a', 'na', 'unknown'],
    /** Substrings for address (normalized). */
    address: ['test street', 'fake street', 'sample address', '123 fake', 'no address', 'unknown', 'n/a', 'lorem ipsum'],
    serialNumber: ['test', 'fake', 'demo', 'sample', 'xxx', 'a01e12345', 'a00a00000', 'serial', 'n/a'],
    /** Exact identity numbers (digits only) always treated as placeholder. */
    identityNumberExact: [
        '12345678901',
        '11111111111',
        '22222222222',
        '33333333333',
        '44444444444',
        '55555555555',
        '66666666666',
        '77777777777',
        '88888888888',
        '99999999999',
        '00000000000',
        '10000000000',
        '12345678900',
        '98765432109'
    ]
};

export function normToken(s: string | null | undefined): string {
    return String(s ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/\p{M}/gu, '');
}

export function mergeFieldDenylist(config: KycConfigParsed): Record<string, string[]> {
    const custom = (config.customThresholds as Record<string, unknown> | undefined)?.fieldDenylist as
        | Record<string, string[]>
        | undefined;
    const out: Record<string, string[]> = {
        firstName: [...DEFAULT_FIELD_DENYLIST.firstName],
        lastName: [...DEFAULT_FIELD_DENYLIST.lastName],
        nationality: [...DEFAULT_FIELD_DENYLIST.nationality],
        gender: [...DEFAULT_FIELD_DENYLIST.gender],
        address: [...DEFAULT_FIELD_DENYLIST.address],
        serialNumber: [...DEFAULT_FIELD_DENYLIST.serialNumber],
        identityNumberExact: [...DEFAULT_FIELD_DENYLIST.identityNumberExact]
    };
    if (!custom || typeof custom !== 'object') return out;
    for (const [k, v] of Object.entries(custom)) {
        if (!Array.isArray(v)) continue;
        if (k === 'identityNumberExact') {
            out.identityNumberExact = [...new Set([...out.identityNumberExact, ...v.map((x) => String(x).replace(/\D/g, ''))])].filter(
                (x) => x.length > 0
            );
            continue;
        }
        const base = out[k] ?? [];
        const merged = new Set([...base, ...v.map((x) => normToken(String(x)))]);
        out[k] = [...merged].filter(Boolean);
    }
    return out;
}

export function tokenInDenylist(value: string | null | undefined, list: string[] | undefined): boolean {
    if (!list?.length) return false;
    const n = normToken(value);
    if (!n) return false;
    for (const t of list) {
        if (!t) continue;
        if (n === t) return true;
        // Avoid short-token substring hits (e.g. "user" inside unrelated words).
        if (t.length >= 6 && n.includes(t)) return true;
    }
    return false;
}

/** Full-field equality only (avoids substring false positives e.g. TUR vs na). */
export function equalsDenylistToken(value: string | null | undefined, list: string[] | undefined): boolean {
    if (!list?.length) return false;
    const n = normToken(value);
    if (!n) return false;
    return list.some((t) => n === normToken(t));
}

/** Turkish TC: obvious test patterns beyond checksum (checksum may still fail separately). */
export function isDenylistIdentityNumber(tc: string | null | undefined, exactList: string[]): boolean {
    if (!tc) return false;
    const digits = String(tc).replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (exactList.includes(digits)) return true;
    if (/^(\d)\1{10}$/.test(digits)) return true;
    if (digits === '01234567890' || digits === '09876543210') return true;
    if (digits.startsWith('0')) return true;
    return false;
}
