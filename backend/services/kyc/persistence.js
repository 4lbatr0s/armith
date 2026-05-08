import { Profile, IdCardValidation, SelfieValidation } from '../../models/index.js';
import { STATUS, formatStructuredError } from '../../kyc/config.js';

/** Thrown when (country + identityNumber) exists on another userId than the authenticated user. */
export class IdentityNumberConflictError extends Error {
    constructor(message = 'This identity number is already linked to another account.') {
        super(message);
        this.name = 'IdentityNumberConflictError';
    }
}

function normalizeIdentityNumber(value) {
    if (value == null || value === '') return null;
    const s = String(value).trim();
    return s.length ? s : null;
}

function omitNullProps(obj) {
    if (!obj || typeof obj !== 'object') return undefined;
    const out = Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
    return Object.keys(out).length > 0 ? out : undefined;
}

function isTerminalProfileStatus(value) {
  const u = String(value ?? '').toUpperCase();
  return u === 'APPROVED' || u === 'REJECTED' || u === 'FAILED';
}

function shapePersistedErrors(errors) {
    if (!Array.isArray(errors)) return [];
    return errors.map(e => {
        const s = formatStructuredError(e);
        const raw = e && typeof e === 'object' ? e : {};
        return {
            code: s.numericCode,
            textCode: s.code,
            field: s.field,
            message: s.message,
            ...(raw.severity != null ? { severity: raw.severity } : {}),
            ...(raw.threshold != null ? { threshold: raw.threshold } : {})
        };
    });
}

export function deduplicateReasons(existing, newReasons) {
    const seen = new Set();
    return [...(existing || []), ...newReasons].filter(reason => {
        if (!reason || !reason.numericCode) return true;
        if (seen.has(reason.numericCode)) return false;
        seen.add(reason.numericCode);
        return true;
    });
}

export async function persistIdVerification({
    authUserId,
    countryCodeUpper,
    result,
    frontImageUrl,
    backImageUrl,
    rejectionReasons,
    overallStatus
}) {
    const idNum = normalizeIdentityNumber(result.data?.identityNumber);
    let profile = null;

    // Logged-in: one profile row per (userId + identityNumber). Do not reuse "any" profile for this user.
    if (authUserId && idNum) {
        profile = await Profile.findOne({ userId: authUserId, identityNumber: idNum });
    }

    // Match by national id + country when no user-scoped row yet (guest flow or first link).
    if (!profile && idNum) {
        const existing = await Profile.findOne({
            country: countryCodeUpper,
            identityNumber: idNum,
        });
        if (existing) {
            if (authUserId && existing.userId && existing.userId !== authUserId) {
                throw new IdentityNumberConflictError();
            }
            profile = existing;
        }
    }

    let previousProfileStatus = null;
    if (profile) {
        previousProfileStatus = profile.status;
        profile.country = countryCodeUpper;
        profile.status = overallStatus.toUpperCase();
        const prevIdVerificationStatus = profile.idVerificationStatus;
        profile.idVerificationStatus = result.status.toUpperCase();

        if (authUserId && !profile.userId) {
            profile.userId = authUserId;
        }

        // Refresh extraction + images on approve, or while ID was never approved (retry same TCKN / same profile).
        const shouldRefreshIdSnapshot =
            result.status === STATUS.APPROVED || prevIdVerificationStatus !== 'APPROVED';

        if (shouldRefreshIdSnapshot) {
            profile.fullName =
                `${result.data?.firstName} ${result.data?.lastName}`.trim() || profile.fullName;
            profile.firstName = result.data?.firstName || profile.firstName;
            profile.lastName = result.data?.lastName || profile.lastName;
            profile.identityNumber = result.data?.identityNumber || profile.identityNumber;
            profile.dateOfBirth = result.data?.dateOfBirth
                ? new Date(result.data.dateOfBirth)
                : profile.dateOfBirth;
            profile.gender = result.data?.gender || profile.gender;
            profile.nationality = result.data?.nationality || profile.nationality;
            profile.serialNumber = result.data?.serialNumber || profile.serialNumber;
            profile.expiryDate = result.data?.expiryDate
                ? new Date(result.data.expiryDate)
                : profile.expiryDate;
            profile.address = result.data?.address || profile.address;
            profile.documentCondition =
                result.data?.documentCondition?.toUpperCase() || profile.documentCondition;
            profile.overallConfidence =
                result.confidence?.overallConfidence ||
                result.confidence?.imageQuality ||
                profile.overallConfidence;
            profile.idFrontImageUrl = frontImageUrl;
            if (backImageUrl) profile.idBackImageUrl = backImageUrl;
        }

        profile.verificationAttempts = (profile.verificationAttempts || 0) + 1;
        profile.lastVerificationAttempt = new Date();
        if (result.status === STATUS.APPROVED) {
            profile.rejectionReasons = Array.isArray(rejectionReasons) ? rejectionReasons : [];
        } else if (rejectionReasons.length > 0) {
            profile.rejectionReasons = deduplicateReasons(profile.rejectionReasons, rejectionReasons);
        }
        await profile.save();
    } else {
        previousProfileStatus = null;
        profile = await Profile.create({
            userId: authUserId,
            fullName: `${result.data?.firstName} ${result.data?.lastName}`.trim(),
            firstName: result.data?.firstName,
            lastName: result.data?.lastName,
            identityNumber: result.data?.identityNumber,
            dateOfBirth: result.data?.dateOfBirth ? new Date(result.data.dateOfBirth) : null,
            gender: result.data?.gender,
            nationality: result.data?.nationality,
            country: countryCodeUpper,
            status: overallStatus.toUpperCase(),
            idVerificationStatus: result.status.toUpperCase(),
            serialNumber: result.data?.serialNumber,
            expiryDate: result.data?.expiryDate ? new Date(result.data.expiryDate) : null,
            address: result.data?.address,
            documentCondition: result.data?.documentCondition?.toUpperCase(),
            overallConfidence: result.confidence?.overallConfidence || result.confidence?.imageQuality,
            idFrontImageUrl: frontImageUrl,
            idBackImageUrl: backImageUrl || null,
            verificationAttempts: 1,
            lastVerificationAttempt: new Date(),
            rejectionReasons
        });
    }

    const nextStatusUpper = String(overallStatus ?? '').toUpperCase();
    const shouldIncrementQuota =
        Boolean(authUserId) &&
        isTerminalProfileStatus(nextStatusUpper) &&
        (previousProfileStatus == null || !isTerminalProfileStatus(previousProfileStatus));

    await IdCardValidation.create({
        profileId: profile._id,
        countryCode: countryCodeUpper,
        frontImageUrl,
        backImageUrl,
        fullName: `${result.data?.firstName} ${result.data?.lastName}`.trim(),
        firstName: result.data?.firstName,
        lastName: result.data?.lastName,
        identityNumber: result.data?.identityNumber,
        dateOfBirth: result.data?.dateOfBirth ? new Date(result.data.dateOfBirth) : null,
        expiryDate: result.data?.expiryDate ? new Date(result.data.expiryDate) : null,
        gender: result.data?.gender,
        nationality: result.data?.nationality,
        serialNumber: result.data?.serialNumber,
        mrz: result.mrz?.raw,
        mrzInfo: omitNullProps(result.mrz?.parsed),
        address: result.data?.address,
        documentCondition: result.data?.documentCondition?.toUpperCase(),
        fullNameConfidence: Math.min(
            result.confidence?.firstNameConfidence || 0,
            result.confidence?.lastNameConfidence || 0
        ),
        firstNameConfidence: result.confidence?.firstNameConfidence,
        lastNameConfidence: result.confidence?.lastNameConfidence,
        identityNumberConfidence: result.confidence?.identityNumberConfidence,
        dateOfBirthConfidence: result.confidence?.dateOfBirthConfidence,
        expiryDateConfidence: result.confidence?.expiryDateConfidence,
        mrzConfidence: result.confidence?.mrzConfidence,
        imageQuality: result.confidence?.imageQuality || result.data?.quality?.imageQuality,
        documentVitalityScore: result.authenticity?.documentVitalityScore,
        status: result.status.toUpperCase(),
        errors: shapePersistedErrors(result.errors),
        rejectionReasons
    });

    return { profile, clerkIdToIncrementQuota: shouldIncrementQuota ? authUserId : null };
}

export async function persistSelfieVerification({
    profileId,
    idPhotoUrl,
    selfieUrls,
    result,
    rejectionReasons,
    overallStatus,
    idCardStatusUpper = 'PENDING'
}) {
    const profile = await Profile.findById(profileId);
    if (!profile) {
        return { profile: null, clerkIdToIncrementQuota: null };
    }

    const previousProfileStatus = profile.status;
    profile.status = overallStatus.toUpperCase();
    profile.selfieVerificationStatus = result.status.toUpperCase();
    profile.idVerificationStatus = idCardStatusUpper;
    profile.selfieMatchConfidence = result.data?.matchConfidence || profile.selfieMatchConfidence;
    profile.selfieSpoofingRisk = result.data?.spoofingRisk || profile.selfieSpoofingRisk;
    profile.selfieImageUrl = selfieUrls[0] || profile.selfieImageUrl;
    profile.verificationAttempts = (profile.verificationAttempts || 0) + 1;
    profile.lastVerificationAttempt = new Date();
    if (rejectionReasons.length > 0) {
        profile.rejectionReasons = deduplicateReasons(profile.rejectionReasons, rejectionReasons);
    }
    await profile.save();

    const nextStatusUpper = String(overallStatus ?? '').toUpperCase();
    const ownerId = profile.userId;
    const shouldIncrementQuota =
        Boolean(ownerId) &&
        isTerminalProfileStatus(nextStatusUpper) &&
        !isTerminalProfileStatus(previousProfileStatus);

    await SelfieValidation.create({
        profileId: profile._id,
        idPhotoUrl,
        selfieUrls,
        isMatch: result.data?.isMatch,
        matchConfidence: result.data?.matchConfidence,
        spoofingRisk: result.data?.spoofingRisk,
        livenessConfidence: result.data?.livenessConfidence,
        livenessIndicators: result.data?.livenessIndicators,
        faceCount: result.data?.faceCount,
        imageQualityIssues: result.data?.imageQualityIssues,
        lightingCondition: result.data?.lightingCondition?.toUpperCase(),
        faceSize: result.data?.faceSize?.toUpperCase(),
        faceCoverage: result.data?.faceCoverage?.toUpperCase(),
        imageQuality: result.data?.imageQuality,
        faceDetectionConfidence: result.data?.faceDetectionConfidence,
        status: result.status.toUpperCase(),
        errors: shapePersistedErrors(result.errors),
        rejectionReasons
    });

    return { profile, clerkIdToIncrementQuota: shouldIncrementQuota ? ownerId : null };
}
