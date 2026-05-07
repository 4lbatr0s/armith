/**
 * KYC Controller — HTTP layer only (config, verification, persistence delegated).
 */

import { ERRORS, STATUS, formatStructuredError } from '../kyc/config.js';
import { IdCheckRequestSchema, SelfieCheckRequestSchema, validateRequest } from '../schemas.js';
import storageService from '../services/storageService.js';
import { Profile, IdCardValidation, SelfieValidation } from '../models/index.js';
import { createDefaultConfig } from '../kyc/defaults.js';
import logger from '../lib/logger.js';
import { VerificationService } from '../services/verificationService.js';
import { getOrCreateUserKycConfig, buildEffectiveKycPlain } from '../services/kyc/runtimeConfig.js';
import { deriveIdCheckpointStatus, computeProfileStatusAfterSelfie } from '../services/kyc/verificationOutcome.js';
import {
    persistIdVerification,
    persistSelfieVerification,
    IdentityNumberConflictError
} from '../services/kyc/persistence.js';
import { checkUserVerificationQuota, incrementUserVerificationUsage } from '../services/quotaService.js';
import { assertImagesReadyForLlm } from '../services/kyc/verificationPrecheck.js';
import {
    buildIdConfidenceRowsFromVerification,
    buildIdConfidenceRowsFromStoredRecord,
    buildSelfieConfidenceRows
} from '../thresholds/definitions.js';
import { flattenedThresholdPayload } from '../thresholds/api-shape.js';
import { resolveKycConfig } from '../thresholds/resolve.js';
import { withPublicApiMeta } from '../config/public-api-meta.js';
import { emitVerificationTerminalWebhook } from '../services/verificationWebhook.js';
import { outcomeSemanticsForTerminalResponse } from '../services/kyc/webhookOutcomeSemantics.js';
import { getPolicyPackForCountry } from '../thresholds/policyPack.js';
import { validatePresignMime, getImageConstraintsForApi } from '../lib/kycImageConstraints.js';

function deriveSessionLifecycle({
    verificationRules,
    profileStatus,
    idCompleted,
    idApproved,
    selfieCompleted,
    selfieApproved
}) {
    const ps = (profileStatus || '').toUpperCase();
    const needsId = verificationRules.requireIdCard && !idCompleted;
    const needsSelfie =
        verificationRules.requireSelfie &&
        !selfieCompleted &&
        (!verificationRules.requireIdCard || idApproved);

    if (ps === 'APPROVED') {
        return { phase: 'approved', terminal: true };
    }
    if (ps === 'REJECTED' || ps === 'FAILED') {
        return { phase: 'rejected_failed', terminal: true };
    }
    if (ps === 'UNDER_REVIEW') {
        return { phase: 'under_review', terminal: false };
    }
    if (needsId) {
        return { phase: 'awaiting_id', terminal: false };
    }
    if (needsSelfie) {
        return { phase: 'awaiting_selfie', terminal: false };
    }
    return { phase: 'pending', terminal: false };
}

export const getSupportedCountries = async (_req, res) => {
    res.json({
        countries: [
            { code: 'TR', name: 'Turkey', supportedDocuments: ['NATIONAL_ID'] },
            { code: 'DE', name: 'Germany', supportedDocuments: ['NATIONAL_ID', 'PASSPORT'] },
            {
                code: 'GB',
                name: 'United Kingdom',
                supportedDocuments: ['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE']
            }
        ]
    });
};

export const getLLMStatus = async (_req, res) => {
    try {
        res.json({
            status: 'success',
            llmService: {
                initialized: true,
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                supportedCountries: ['TR', 'DE', 'GB']
            },
            message: 'KYC Service status retrieved successfully'
        });
    } catch (error) {
        logger.error({ error }, 'LLM status check error');
        res.status(500).json({
            status: STATUS.FAILED,
            errors: [ERRORS.INTERNAL_ERROR]
        });
    }
};

export const generateSecureDownloadUrlEndpoint = async (req, res) => {
    try {
        const { fileName } = req.body;
        if (!fileName) {
            return res.status(400).json({
                status: STATUS.FAILED,
                errors: [{ code: 'MISSING_FILENAME', message: 'File name is required' }]
            });
        }
        const downloadData = await storageService.generateSecureDownloadUrl(fileName);
        res.json({ success: true, downloadUrl: downloadData.downloadUrl, expiresIn: downloadData.expiresIn });
    } catch (error) {
        logger.error({ error, fileName: req.body.fileName }, 'Secure download URL generation error');
        res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
    }
};

export const generateUploadUrl = async (req, res) => {
    try {
        const { fileType, userId, documentType } = req.body;
        const validDocumentTypes = ['id-front', 'id-back', 'selfie'];
        if (documentType && !validDocumentTypes.includes(documentType)) {
            return res.status(400).json({
                status: STATUS.FAILED,
                errors: [{ code: 'INVALID_DOCUMENT_TYPE', message: `Document type must be one of: ${validDocumentTypes.join(', ')}` }]
            });
        }
        const mimeCheck = validatePresignMime(fileType);
        if (!mimeCheck.ok) {
            return res.status(400).json({
                status: STATUS.FAILED,
                errors: [ERRORS.UNSUPPORTED_IMAGE_TYPE]
            });
        }
        const uploadData = await storageService.generatePresignedUploadUrl(mimeCheck.mime, userId, documentType);
        res.json({
            success: true,
            ...uploadData,
            constraints: getImageConstraintsForApi()
        });
    } catch (error) {
        logger.error({ error }, 'Upload URL generation error');
        res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
    }
};

export const verifyId = async (req, res) => {
    try {
        const validation = validateRequest(IdCheckRequestSchema, req.body);
        if (!validation.success) {
            logger.warn({ details: validation.details }, 'Invalid ID verification request');
            return res.status(400).json({
                status: STATUS.FAILED,
                errors: validation.details.map(d => ({
                    code: ERRORS.INVALID_REQUEST.code,
                    message: `${d.field}: ${d.message}`
                }))
            });
        }

        const { countryCode = 'TR', frontImageUrl, backImageUrl } = validation.data;

        const countryCodeUpper = countryCode.toUpperCase();
        
        const authUserId = req.authContext?.userId || req.auth?.userId;

        if (authUserId) {
            const quota = await checkUserVerificationQuota(authUserId);
            if (!quota.allowed) {
                return res.status(429).json({
                    status: STATUS.FAILED,
                    errors: [
                        {
                            code: 'PLAN_LIMIT_REACHED',
                            message: 'Monthly verification limit reached for your plan.',
                            details: {
                                tier: quota.planTier,
                                used: quota.used,
                                limit: quota.limit,
                                upgradeHint: 'Upgrade your plan to continue verifications.'
                            }
                        }
                    ]
                });
            }
        }

        const kycConfigDoc = authUserId ? await getOrCreateUserKycConfig(authUserId) : null;

        const { effectivePlain, resolved } = buildEffectiveKycPlain({
            kycConfigDoc,
            countryCodeOverride: countryCodeUpper,
            anonymousUserLabel: authUserId || 'system'
        });

        logger.info({ authUserId, countryCode: countryCodeUpper }, 'Starting ID verification');

        const urlsToCheck = backImageUrl ? [frontImageUrl, backImageUrl] : [frontImageUrl];
        const preflight = await assertImagesReadyForLlm(urlsToCheck);
        if (!preflight.ok) {
            return res.status(400).json({ status: STATUS.FAILED, errors: [preflight.error] });
        }

        const result = await VerificationService.verifyId(effectivePlain, {
            front: frontImageUrl,
            back: backImageUrl
        });

        if (!result.success) {
            logger.error({ result }, 'ID verification failed internally');
            return res.status(500).json({ status: result.status, errors: result.errors });
        }

        const rejectionReasons = result.errors.map(e => formatStructuredError(e));
        const overallStatus = deriveIdCheckpointStatus(result.status, resolved.verificationSteps);

        let profile;
        try {
            profile = await persistIdVerification({
                authUserId,
                countryCodeUpper,
                result,
                frontImageUrl,
                backImageUrl,
                rejectionReasons,
                overallStatus
            });
        } catch (err) {
            if (err instanceof IdentityNumberConflictError) {
                logger.warn({ authUserId, msg: err.message }, 'Identity number belongs to another user');
                return res.status(409).json({
                    status: STATUS.FAILED,
                    errors: [
                        {
                            code: 'IDENTITY_ALREADY_LINKED',
                            message: err.message,
                            textCode: 'IDENTITY_ALREADY_LINKED'
                        }
                    ]
                });
            }
            throw err;
        }

        logger.info({ profileId: profile._id, status: overallStatus }, 'ID verification completed');

        if (authUserId) {
            await incrementUserVerificationUsage(authUserId);
        }

        emitVerificationTerminalWebhook({
            tenantUserId: authUserId,
            profile,
            correlationId: req.correlationId
        });

        const confidenceScores = buildIdConfidenceRowsFromVerification(result, resolved);
        const policyExtras =
            authUserId && kycConfigDoc
                ? {
                      ...getPolicyPackForCountry(countryCodeUpper),
                      tenantConfigVersion: kycConfigDoc.version,
                      policyCountryCode: countryCodeUpper
                  }
                : { ...getPolicyPackForCountry(countryCodeUpper), policyCountryCode: countryCodeUpper };
        const semantics = outcomeSemanticsForTerminalResponse({
            terminalStatusUpper: overallStatus,
            profile,
            rawVerificationErrors: rejectionReasons
        });

        res.json(
            withPublicApiMeta(
                {
                    status: overallStatus,
                    idStatus: result.status,
                    data: result.data,
                    confidence: result.confidence,
                    confidenceScores,
                    errors: result.errors,
                    rejectionReasons,
                    profileId: profile._id,
                    images: { front: frontImageUrl, back: backImageUrl || null },
                    message:
                        overallStatus === STATUS.PENDING
                            ? 'ID verification successful. Please complete selfie verification.'
                            : 'Verification complete!',
                    verificationRules: resolved.verificationSteps,
                    ...(semantics !== undefined ? { outcomeSemantics: semantics } : {})
                },
                policyExtras
            )
        );
    } catch (error) {
        logger.error({ error: error.message, stack: error.stack }, 'Unexpected error in verifyId');
        res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
    }
};

export const verifySelfie = async (req, res) => {
    try {
        const validation = validateRequest(SelfieCheckRequestSchema, req.body);
        if (!validation.success) {
            logger.warn({ details: validation.details }, 'Invalid selfie verification request');
            return res.status(400).json({
                status: STATUS.FAILED,
                errors: validation.details.map(d => ({
                    code: ERRORS.INVALID_REQUEST.code,
                    message: `${d.field}: ${d.message}`
                }))
            });
        }

        const { idPhotoUrl, selfieUrls, profileId: profileIdFromBody, verificationId } = validation.data;
        const profileId = profileIdFromBody || verificationId;

        const authUserId = req.authContext?.userId || req.auth?.userId;
        const kycConfigDoc = authUserId ? await getOrCreateUserKycConfig(authUserId) : null;

        let countryHint = 'TR';
        if (profileId) {
            const profileDoc = await Profile.findById(profileId).select('country userId').lean();
            if (!profileDoc) {
                return res.status(404).json({
                    status: STATUS.FAILED,
                    errors: [{ code: ERRORS.INVALID_REQUEST.code, message: 'Profile not found.' }]
                });
            }
            if (authUserId && profileDoc.userId && profileDoc.userId !== authUserId) {
                return res.status(403).json({
                    status: STATUS.FAILED,
                    errors: [ERRORS.PROFILE_ACCESS_DENIED]
                });
            }
            countryHint = profileDoc.country ?? 'TR';
        }

        const { effectivePlain, resolved } = buildEffectiveKycPlain({
            kycConfigDoc,
            countryCodeOverride: countryHint,
            anonymousUserLabel: authUserId || 'system'
        });
        const verificationRules = resolved.verificationSteps;

        const requiresIdAndSelfie = verificationRules.requireIdCard === true && verificationRules.requireSelfie === true;

        if (requiresIdAndSelfie && !profileId) {
            return res.status(400).json({
                status: STATUS.FAILED,
                errors: [ERRORS.PROFILE_ID_REQUIRED]
            });
        }

        const allUrls = [idPhotoUrl, ...selfieUrls];
        if (!allUrls.every(url => storageService.isValidImageUrl(url))) {
            return res.status(400).json({ status: STATUS.FAILED, errors: [ERRORS.INVALID_IMAGE_URL] });
        }

        const storageCheck = await assertImagesReadyForLlm(allUrls);
        if (!storageCheck.ok) {
            return res.status(400).json({ status: STATUS.FAILED, errors: [storageCheck.error] });
        }

        logger.info({ authUserId, profileId }, 'Starting selfie verification');

        const result = await VerificationService.verifySelfie(effectivePlain, {
            idPhotoUrl,
            selfieUrls
        });

        if (!result.success) {
            logger.error({ result }, 'Selfie verification failed internally');
            const errPayload = result.error ?? (result.errors && result.errors[0]);
            return res.status(500).json({
                status: result.status,
                errors: errPayload ? [errPayload] : [ERRORS.INTERNAL_ERROR]
            });
        }

        const rejectionReasons = result.errors.map(e => formatStructuredError(e));

        let overallStatus = result.status;

        let selfiePersistedProfile = null;
        if (profileId && result.success) {
            const idValidation = await IdCardValidation.findOne({ profileId }).sort({ createdAt: -1 });
            const idStatus = idValidation?.status || 'PENDING';

            overallStatus = computeProfileStatusAfterSelfie({
                verificationRules,
                idValidationStatusUpper: idStatus,
                selfieStatus: result.status
            });

            const persisted = await persistSelfieVerification({
                profileId,
                idPhotoUrl,
                selfieUrls,
                result,
                rejectionReasons,
                overallStatus,
                idCardStatusUpper: idStatus
            });

            if (!persisted.profile) {
                logger.warn({ profileId }, 'Profile not found during selfie verification');
            } else {
                selfiePersistedProfile = persisted.profile;
                logger.info({ profileId, status: overallStatus }, 'Selfie verification completed and profile updated');
                emitVerificationTerminalWebhook({
                    tenantUserId: authUserId,
                    profile: persisted.profile,
                    correlationId: req.correlationId
                });
            }
        } else if (
            result.success &&
            !profileId &&
            result.status === STATUS.APPROVED &&
            verificationRules.requireSelfie &&
            !verificationRules.requireIdCard
        ) {
            overallStatus = STATUS.APPROVED;
        }

        const confidenceScores = buildSelfieConfidenceRows(result.data || {}, resolved);

        const policyExtrasSelfie =
            authUserId && kycConfigDoc
                ? {
                      ...getPolicyPackForCountry(countryHint),
                      tenantConfigVersion: kycConfigDoc.version,
                      policyCountryCode: countryHint
                  }
                : { ...getPolicyPackForCountry(countryHint), policyCountryCode: countryHint };
        const selfieSemantics = outcomeSemanticsForTerminalResponse({
            terminalStatusUpper: overallStatus,
            profile: selfiePersistedProfile,
            rawVerificationErrors: rejectionReasons
        });

        res.json(
            withPublicApiMeta(
                {
                    status: overallStatus,
                    selfieStatus: result.status,
                    data: result.data,
                    confidenceScores,
                    errors: result.errors,
                    rejectionReasons,
                    images: { idPhoto: idPhotoUrl, selfies: selfieUrls },
                    profileId,
                    verificationRules,
                    ...(selfieSemantics !== undefined ? { outcomeSemantics: selfieSemantics } : {})
                },
                policyExtrasSelfie
            )
        );
    } catch (error) {
        logger.error({ error: error.message, stack: error.stack }, 'Unexpected error in verifySelfie');
        res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
    }
};

async function respondWithKycStatus(req, res, profileId) {
    try {
        const profile = await Profile.findById(profileId);
        if (!profile) {
            return res.status(404).json({
                status: STATUS.FAILED,
                errors: [{ code: 'NOT_FOUND', message: 'Profile not found' }]
            });
        }

        const [idValidation, selfieValidation] = await Promise.all([
            IdCardValidation.findOne({ profileId }).sort({ createdAt: -1 }),
            SelfieValidation.findOne({ profileId }).sort({ createdAt: -1 })
        ]);

        const authUserId = req.authContext?.userId || req.auth?.userId;
        const authMode = req.authContext?.mode;
        const capPid = req.authContext?.captureProfileId;

        if (authMode === 'captureSession') {
            if (!capPid || String(capPid) !== String(profile._id)) {
                return res.status(403).json({
                    status: STATUS.FAILED,
                    errors: [ERRORS.PROFILE_ACCESS_DENIED]
                });
            }
            if (!profile.userId || profile.userId !== authUserId) {
                return res.status(403).json({
                    status: STATUS.FAILED,
                    errors: [ERRORS.PROFILE_ACCESS_DENIED]
                });
            }
        } else if (profile.userId && authUserId && profile.userId !== authUserId) {
            return res.status(403).json({
                status: STATUS.FAILED,
                errors: [ERRORS.PROFILE_ACCESS_DENIED]
            });
        }
        const kycConfigDoc = authUserId ? await getOrCreateUserKycConfig(authUserId) : null;
        const resolved = kycConfigDoc
            ? buildEffectiveKycPlain({
                  kycConfigDoc,
                  countryCodeOverride: profile.country || 'TR'
              }).resolved
            : resolveKycConfig(createDefaultConfig('guest', profile.country || 'TR'));

        const thresholds = flattenedThresholdPayload(resolved);
        const verificationRules = resolved.verificationSteps;

        const idCompleted = !!idValidation;
        const selfieCompleted = !!selfieValidation;
        const idApproved = idValidation?.status === 'APPROVED';
        const selfieApproved = selfieValidation?.status === 'APPROVED';

        const isFullyVerified =
            (!verificationRules.requireIdCard || idApproved) &&
            (!verificationRules.requireSelfie || selfieApproved);

        const lifecycle = deriveSessionLifecycle({
            verificationRules,
            profileStatus: profile.status,
            idCompleted,
            idApproved,
            selfieCompleted,
            selfieApproved
        });

        const idVitality = idValidation?.documentVitalityScore;
        const idData =
            idApproved && profile.idVerificationStatus === 'APPROVED'
                ? {
                      fullName: profile.fullName,
                      firstName: profile.firstName,
                      lastName: profile.lastName,
                      identityNumber: profile.identityNumber,
                      dateOfBirth: profile.dateOfBirth,
                      expiryDate: profile.expiryDate,
                      gender: profile.gender,
                      nationality: profile.nationality,
                      serialNumber: profile.serialNumber,
                      address: profile.address,
                      documentCondition: profile.documentCondition,
                      ...(idVitality != null && Number.isFinite(idVitality) ? { documentVitalityScore: idVitality } : {})
                  }
                : idValidation
                  ? {
                        fullName: idValidation.fullName,
                        firstName: idValidation.firstName,
                        lastName: idValidation.lastName,
                        identityNumber: idValidation.identityNumber,
                        dateOfBirth: idValidation.dateOfBirth,
                        expiryDate: idValidation.expiryDate,
                        gender: idValidation.gender,
                        nationality: idValidation.nationality,
                        serialNumber: idValidation.serialNumber,
                        address: idValidation.address,
                        documentCondition: idValidation.documentCondition,
                        ...(idVitality != null && Number.isFinite(idVitality) ? { documentVitalityScore: idVitality } : {})
                    }
                  : null;

        const mrzData = idValidation ? { mrz: idValidation.mrz, mrzInfo: idValidation.mrzInfo } : null;

        const mapStructuredReasons = (arr) =>
            Array.isArray(arr) ? arr.filter(Boolean).map((r) => formatStructuredError(r)) : [];

        const correlationId = req.correlationId;

        const cc = profile.country || 'TR';
        const statusPolicyExtras =
            authUserId && kycConfigDoc
                ? {
                      ...getPolicyPackForCountry(cc),
                      tenantConfigVersion: kycConfigDoc.version,
                      policyCountryCode: cc
                  }
                : { ...getPolicyPackForCountry(cc), policyCountryCode: cc };
        const statusOutcomeSemantics = lifecycle.terminal
            ? outcomeSemanticsForTerminalResponse({
                  terminalStatusUpper: profile.status,
                  profile,
                  rawVerificationErrors: mapStructuredReasons(profile.rejectionReasons)
              })
            : undefined;

        res.json(
            withPublicApiMeta(
                {
                id: profile._id,
                status: profile.status,
                country: profile.country,
                rejectionReasons: mapStructuredReasons(profile.rejectionReasons),
                createdAt: profile.createdAt,
                verificationRules,
                ...(statusOutcomeSemantics !== undefined ? { outcomeSemantics: statusOutcomeSemantics } : {}),
                progress: {
                    idVerification: {
                        required: verificationRules.requireIdCard,
                        completed: idCompleted,
                        approved: idApproved
                    },
                    selfieVerification: {
                        required: verificationRules.requireSelfie,
                        completed: selfieCompleted,
                        approved: selfieApproved
                    },
                    isFullyVerified
                },
                session: {
                    id: String(profile._id),
                    lifecycle,
                    correlationId: correlationId ?? null
                },
                idVerification: idValidation
                    ? {
                          status: idValidation.status,
                          data: idData ? { ...idData, ...mrzData } : null,
                          confidence: {
                              fullName: idValidation.fullNameConfidence,
                              firstName: idValidation.firstNameConfidence,
                              lastName: idValidation.lastNameConfidence,
                              identityNumber: idValidation.identityNumberConfidence,
                              dateOfBirth: idValidation.dateOfBirthConfidence,
                              expiryDate: idValidation.expiryDateConfidence,
                              mrz: idValidation.mrzConfidence,
                              mrzConfidence: idValidation.mrzConfidence,
                              imageQuality: idValidation.imageQuality,
                              documentVitalityScore: idValidation.documentVitalityScore ?? null
                          },
                          confidenceScores: buildIdConfidenceRowsFromStoredRecord(
                              typeof idValidation.toObject === 'function' ? idValidation.toObject() : idValidation,
                              resolved
                          ),
                          rejectionReasons: mapStructuredReasons(idValidation.rejectionReasons),
                          errors: mapStructuredReasons(idValidation.errors)
                      }
                    : null,
                selfieVerification: selfieValidation
                    ? {
                          status: selfieValidation.status,
                          data: {
                              isMatch: selfieValidation.isMatch,
                              matchConfidence: selfieValidation.matchConfidence,
                              spoofingRisk: selfieValidation.spoofingRisk,
                              livenessConfidence: selfieValidation.livenessConfidence ?? null,
                              livenessIndicators: selfieValidation.livenessIndicators || [],
                              faceCount: selfieValidation.faceCount ?? null,
                              faceDetectionConfidence: selfieValidation.faceDetectionConfidence ?? null,
                              imageQuality: selfieValidation.imageQuality ?? null,
                              lightingCondition: selfieValidation.lightingCondition ?? null,
                              faceSize: selfieValidation.faceSize ?? null,
                              faceCoverage: selfieValidation.faceCoverage ?? null,
                              imageQualityIssues: selfieValidation.imageQualityIssues || []
                          },
                          confidenceScores: buildSelfieConfidenceRows(
                              typeof selfieValidation.toObject === 'function'
                                  ? selfieValidation.toObject()
                                  : selfieValidation,
                              resolved
                          ),
                          rejectionReasons: mapStructuredReasons(selfieValidation.rejectionReasons),
                          errors: mapStructuredReasons(selfieValidation.errors)
                      }
                    : null,
                images: {
                    idFront: profile.idFrontImageUrl || idValidation?.frontImageUrl,
                    idBack: profile.idBackImageUrl || idValidation?.backImageUrl,
                    selfie: profile.selfieImageUrl || selfieValidation?.selfieUrls?.[0]
                },
                thresholds
                },
                statusPolicyExtras
            )
        );
    } catch (error) {
        logger.error({ error, profileId }, 'Status check error');
        res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
    }
}

export const getUserStatus = async (req, res) => respondWithKycStatus(req, res, req.params.profileId);

export const getVerificationSession = async (req, res) =>
    respondWithKycStatus(req, res, req.params.id);
