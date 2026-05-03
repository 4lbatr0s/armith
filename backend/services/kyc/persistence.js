import { Profile, IdCardValidation, SelfieValidation } from '../../models/index.js';
import { STATUS, formatStructuredError } from '../../kyc/config.js';

function omitNullProps(obj) {
    if (!obj || typeof obj !== 'object') return undefined;
    const out = Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
    return Object.keys(out).length > 0 ? out : undefined;
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
    let profile = await Profile.findOne({ userId: authUserId });
    if (!profile && result.data?.identityNumber) {
        profile = await Profile.findOne({
            country: countryCodeUpper,
            identityNumber: result.data.identityNumber
        });
    }

    if (profile) {
        profile.country = countryCodeUpper;
        profile.status = overallStatus.toUpperCase();
        profile.idVerificationStatus = result.status.toUpperCase();

        if (result.status === STATUS.APPROVED) {
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
        if (rejectionReasons.length > 0) {
            profile.rejectionReasons = deduplicateReasons(profile.rejectionReasons, rejectionReasons);
        }
        await profile.save();
    } else {
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

    return profile;
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
        return { profile: null };
    }

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

    return { profile };
}
