import { ERRORS } from '../kyc/config.js';
import { ValidationError } from '../src/validation/country-validator.interface.js';
import {
    equalsDenylistToken,
    isDenylistIdentityNumber,
    mergeFieldDenylist,
    normToken,
    tokenInDenylist
} from './fake-value-denylist.js';
import type { KycConfigParsed } from './resolve.js';

type IdParsed = {
    extraction: Record<string, unknown>;
    confidence: Record<string, number | null | undefined>;
    quality?: Record<string, unknown>;
    authenticity?: Record<string, unknown>;
    mrz?: { raw?: string | null; parsed?: Record<string, unknown> | null };
};

function cloneParsed(parsed: IdParsed): IdParsed {
    return JSON.parse(JSON.stringify(parsed)) as IdParsed;
}

/**
 * Zeros LLM confidence for fields that match placeholder / test denylists, and returns critical validation errors.
 */
export function applyFakeDataPenalties(parsed: IdParsed, config: KycConfigParsed): {
    parsed: IdParsed;
    errors: ValidationError[];
} {
    const working = cloneParsed(parsed);
    const lists = mergeFieldDenylist(config);
    const errors: ValidationError[] = [];
    const c = working.confidence;

    const ext = working.extraction;
    const first = ext.firstName != null ? String(ext.firstName) : '';
    const last = ext.lastName != null ? String(ext.lastName) : '';
    const idn = ext.identityNumber != null ? String(ext.identityNumber) : '';
    const serial = ext.serialNumber != null ? String(ext.serialNumber) : '';
    const nat = ext.nationality != null ? String(ext.nationality) : '';
    const addr = ext.address != null ? String(ext.address) : '';
    const gender = ext.gender != null ? String(ext.gender) : '';
    const dob = ext.dateOfBirth != null ? String(ext.dateOfBirth) : '';
    const exp = ext.expiryDate != null ? String(ext.expiryDate) : '';

    const mark = (field: string, msg: string) => {
        errors.push(new ValidationError(ERRORS.PLACEHOLDER_DATA_DETECTED.code, msg, field));
    };

    if (tokenInDenylist(first, lists.firstName)) {
        c.firstNameConfidence = 0;
        mark('firstName', 'First name matches known test or placeholder value.');
    }
    if (tokenInDenylist(last, lists.lastName)) {
        c.lastNameConfidence = 0;
        mark('lastName', 'Last name matches known test or placeholder value.');
    }
    const full = normToken(`${first} ${last}`.trim());
    if (full === 'test test' || full === 'fake fake' || full === 'demo demo') {
        c.firstNameConfidence = 0;
        c.lastNameConfidence = 0;
        mark('firstName', 'Full name appears to be test or placeholder data.');
    }

    const exactIds = lists.identityNumberExact;
    if (isDenylistIdentityNumber(idn, exactIds)) {
        c.identityNumberConfidence = 0;
        mark('identityNumber', 'Identity number matches known test or placeholder pattern.');
    }

    if (tokenInDenylist(serial, lists.serialNumber)) {
        c.mrzConfidence = 0;
        mark('serialNumber', 'Serial number matches known test or placeholder value.');
    }

    if (equalsDenylistToken(nat, lists.nationality)) {
        mark('nationality', 'Nationality matches known test or placeholder value.');
    }

    if (lists.address?.some((t) => t.length >= 2 && normToken(addr).includes(t))) {
        mark('address', 'Address matches known test or placeholder pattern.');
    }

    if (equalsDenylistToken(gender, lists.gender)) {
        mark('gender', 'Gender value matches known test or placeholder entry.');
    }

    const fakeDates = new Set(['1111-11-11', '0001-01-01', '1900-01-01', '2099-12-31']);
    if (dob && fakeDates.has(dob)) {
        c.dateOfBirthConfidence = 0;
        mark('dateOfBirth', 'Date of birth matches known placeholder date.');
    }
    if (exp && fakeDates.has(exp)) {
        c.expiryDateConfidence = 0;
        mark('expiryDate', 'Expiry date matches known placeholder date.');
    }

    if (errors.length > 0 && typeof c.overallConfidence === 'number') {
        c.overallConfidence = 0;
    }

    return { parsed: working, errors };
}
