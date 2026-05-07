import { ERRORS } from '../kyc/config.js';
import { ValidationError } from './validation/country-validator.interface.js';
import { equalsDenylistToken, isDenylistDocumentNumber, isDenylistIdentityNumber, isPlaceholderDate, mergeFieldDenylist, normToken, tokenInDenylist } from './fake-value-denylist.js';
function cloneParsed(parsed) {
    return JSON.parse(JSON.stringify(parsed));
}
/**
 * Zeros LLM confidence for fields that match placeholder / test denylists, and returns critical validation errors.
 */
export function applyFakeDataPenalties(parsed, config) {
    const working = cloneParsed(parsed);
    const lists = mergeFieldDenylist(config);
    const errors = [];
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
    const mark = (field, msg) => {
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
    if (dob && isPlaceholderDate(dob, lists)) {
        c.dateOfBirthConfidence = 0;
        mark('dateOfBirth', 'Date of birth matches known placeholder date.');
    }
    if (exp && isPlaceholderDate(exp, lists)) {
        c.expiryDateConfidence = 0;
        mark('expiryDate', 'Expiry date matches known placeholder date.');
    }
    const mrzParsed = working.mrz?.parsed;
    if (mrzParsed && typeof mrzParsed === 'object') {
        const mp = mrzParsed;
        const mrzDoc = mp.documentNumber != null ? String(mp.documentNumber) : '';
        const mrzSurname = mp.surname != null ? String(mp.surname) : '';
        const mrzGiven = mp.givenNames != null ? String(mp.givenNames) : '';
        const mrzDob = mp.dateOfBirth != null ? String(mp.dateOfBirth) : '';
        const mrzExp = mp.expiryDate != null ? String(mp.expiryDate) : '';
        const mrzNat = mp.nationality != null ? String(mp.nationality) : '';
        const mrzSex = mp.sex != null ? String(mp.sex) : '';
        if (isDenylistDocumentNumber(mrzDoc, lists.identityNumberExact)) {
            c.mrzConfidence = 0;
            c.identityNumberConfidence = 0;
            mark('mrz', 'MRZ document number matches known test or placeholder pattern.');
        }
        if (tokenInDenylist(mrzSurname, lists.lastName)) {
            c.mrzConfidence = 0;
            c.lastNameConfidence = 0;
            mark('mrz', 'MRZ surname matches known test or placeholder value.');
        }
        const givenParts = mrzGiven.split(/\s+/).filter(Boolean);
        if (givenParts.some((p) => tokenInDenylist(p, lists.firstName)) || tokenInDenylist(mrzGiven, lists.firstName)) {
            c.mrzConfidence = 0;
            c.firstNameConfidence = 0;
            mark('mrz', 'MRZ given names match known test or placeholder value.');
        }
        if (mrzDob && isPlaceholderDate(mrzDob, lists)) {
            c.mrzConfidence = 0;
            c.dateOfBirthConfidence = 0;
            mark('mrz', 'MRZ date of birth matches known placeholder date.');
        }
        if (mrzExp && isPlaceholderDate(mrzExp, lists)) {
            c.mrzConfidence = 0;
            c.expiryDateConfidence = 0;
            mark('mrz', 'MRZ expiry date matches known placeholder date.');
        }
        if (equalsDenylistToken(mrzNat, lists.nationality)) {
            c.mrzConfidence = 0;
            mark('mrz', 'MRZ nationality matches known test or placeholder value.');
        }
        if (mrzSex && equalsDenylistToken(mrzSex, lists.gender)) {
            c.mrzConfidence = 0;
            mark('mrz', 'MRZ sex field matches known test or placeholder entry.');
        }
    }
    if (errors.length > 0 && typeof c.overallConfidence === 'number') {
        c.overallConfidence = 0;
    }
    return { parsed: working, errors };
}
