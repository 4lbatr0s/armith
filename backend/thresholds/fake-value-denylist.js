/** Lowercase tokens compared with normalized field text. */
export const DEFAULT_FIELD_DENYLIST = {
    firstName: ['test', 'fake', 'demo', 'sample', 'dummy', 'placeholder', 'specimen', 'örnek', 'ornek', 'admin', 'user', 'xxx', 'null', 'undefined', 'lorem', 'ipsum'],
    lastName: ['test', 'fake', 'demo', 'sample', 'dummy', 'placeholder', 'specimen', 'örnek', 'ornek', 'admin', 'user', 'xxx', 'null', 'undefined', 'lorem', 'ipsum'],
    nationality: ['xxx', 'tst', 'fake', 'zzz', 'n/a'],
    gender: ['x', 'u', 'n/a', 'na', 'unknown'],
    /** Substrings for address (normalized). */
    address: ['test street', 'fake street', 'sample address', '123 fake', 'no address', 'unknown', 'n/a', 'lorem ipsum'],
    serialNumber: [
        'test',
        'fake',
        'demo',
        'sample',
        'xxx',
        'a01e12345',
        'a00a00000',
        'serial',
        'n/a',
        'specimen',
        'örnek',
        'ornek',
        'placeholder',
        'a99z99999',
        'b99z99999'
    ],
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
    ],
    /** Exact ISO dates (YYYY-MM-DD) treated as placeholder / specimen. */
    placeholderDatesIso: [
        '1111-11-11',
        '0001-01-01',
        '1900-01-01',
        '2099-12-31',
        '2000-01-01',
        '1990-01-01',
        '1980-01-01',
        '2020-01-01',
        '2030-01-01',
        '2010-01-01'
    ],
    /** MRZ-style YYMMDD (6 digits) matching common specimen dates above. */
    placeholderDatesYymmdd: ['200101', '300101', '000101', '900101', '800101', '100101', '010120', '010130', '010110']
};
export function normToken(s) {
    return String(s ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/\p{M}/gu, '');
}
/** Normalize a date string to YYYY-MM-DD when possible (ISO prefix or 6-digit YYMMDD). */
export function normalizeDateToIso(value) {
    if (value == null)
        return null;
    const s = String(value).trim();
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso)
        return iso[1];
    const digits = s.replace(/\D/g, '');
    if (digits.length === 6 && /^\d{6}$/.test(digits)) {
        const yy = parseInt(digits.slice(0, 2), 10);
        const mm = digits.slice(2, 4);
        const dd = digits.slice(4, 6);
        const year = yy <= 50 ? 2000 + yy : 1900 + yy;
        return `${year}-${mm}-${dd}`;
    }
    if (digits.length >= 8) {
        const y = digits.slice(0, 4);
        const m = digits.slice(4, 6);
        const d = digits.slice(6, 8);
        if (/^\d{4}$/.test(y) && /^\d{2}$/.test(m) && /^\d{2}$/.test(d))
            return `${y}-${m}-${d}`;
    }
    return null;
}
/** True if value matches placeholder ISO list, raw YYMMDD list, or normalizes to an ISO in the list. */
export function isPlaceholderDate(value, lists) {
    if (value == null || String(value).trim() === '')
        return false;
    const s = String(value).trim();
    const isoList = lists.placeholderDatesIso ?? [];
    const yymmddList = lists.placeholderDatesYymmdd ?? [];
    const isoPrefix = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoPrefix && isoList.includes(isoPrefix[1]))
        return true;
    const normalized = normalizeDateToIso(s);
    if (normalized && isoList.includes(normalized))
        return true;
    const six = s.replace(/\D/g, '');
    if (six.length >= 6) {
        const head6 = six.slice(0, 6);
        if (yymmddList.includes(head6))
            return true;
    }
    return false;
}
export function mergeFieldDenylist(config) {
    const custom = config.customThresholds?.fieldDenylist;
    const out = {
        firstName: [...DEFAULT_FIELD_DENYLIST.firstName],
        lastName: [...DEFAULT_FIELD_DENYLIST.lastName],
        nationality: [...DEFAULT_FIELD_DENYLIST.nationality],
        gender: [...DEFAULT_FIELD_DENYLIST.gender],
        address: [...DEFAULT_FIELD_DENYLIST.address],
        serialNumber: [...DEFAULT_FIELD_DENYLIST.serialNumber],
        identityNumberExact: [...DEFAULT_FIELD_DENYLIST.identityNumberExact],
        placeholderDatesIso: [...DEFAULT_FIELD_DENYLIST.placeholderDatesIso],
        placeholderDatesYymmdd: [...DEFAULT_FIELD_DENYLIST.placeholderDatesYymmdd]
    };
    if (!custom || typeof custom !== 'object')
        return out;
    for (const [k, v] of Object.entries(custom)) {
        if (!Array.isArray(v))
            continue;
        if (k === 'identityNumberExact') {
            out.identityNumberExact = [...new Set([...out.identityNumberExact, ...v.map((x) => String(x).replace(/\D/g, ''))])].filter((x) => x.length > 0);
            continue;
        }
        if (k === 'placeholderDatesIso' || k === 'placeholderDatesYymmdd') {
            out[k] = [...new Set([...(out[k] ?? []), ...v.map((x) => String(x).trim())])].filter(Boolean);
            continue;
        }
        const base = out[k] ?? [];
        const merged = new Set([...base, ...v.map((x) => normToken(String(x)))]);
        out[k] = [...merged].filter(Boolean);
    }
    return out;
}
export function tokenInDenylist(value, list) {
    if (!list?.length)
        return false;
    const n = normToken(value);
    if (!n)
        return false;
    for (const t of list) {
        if (!t)
            continue;
        if (n === t)
            return true;
        // Avoid short-token substring hits (e.g. "user" inside unrelated words).
        if (t.length >= 6 && n.includes(t))
            return true;
    }
    return false;
}
/** Full-field equality only (avoids substring false positives e.g. TUR vs na). */
export function equalsDenylistToken(value, list) {
    if (!list?.length)
        return false;
    const n = normToken(value);
    if (!n)
        return false;
    return list.some((t) => n === normToken(t));
}
/** Turkish TC: obvious test patterns beyond checksum (checksum may still fail separately). */
export function isDenylistIdentityNumber(tc, exactList) {
    if (!tc)
        return false;
    const digits = String(tc).replace(/\D/g, '');
    if (digits.length !== 11)
        return false;
    if (exactList.includes(digits))
        return true;
    if (/^(\d)\1{10}$/.test(digits))
        return true;
    if (digits === '01234567890' || digits === '09876543210')
        return true;
    if (digits.startsWith('0'))
        return true;
    return false;
}
/** True if document number (MRZ or other) contains an 11-digit TC that is denylisted. */
export function isDenylistDocumentNumber(doc, exactList) {
    if (!doc)
        return false;
    const digits = String(doc).replace(/\D/g, '');
    for (let i = 0; i <= digits.length - 11; i++) {
        const chunk = digits.slice(i, i + 11);
        if (isDenylistIdentityNumber(chunk, exactList))
            return true;
    }
    return false;
}
