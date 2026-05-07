import { createHash } from 'crypto';

import logger from '../lib/logger.js';
import { IdempotencyLedger } from '../models/IdempotencyLedger.js';

const TTL_MS = 24 * 60 * 60 * 1000;
const KEY_MAX = 255;

/** @param {unknown} val */
function stableStringify(val) {
    if (val === null || val === undefined) return JSON.stringify(val);
    if (typeof val !== 'object') return JSON.stringify(val);
    if (Array.isArray(val)) return `[${val.map(stableStringify).join(',')}]`;
    const keys = Object.keys(val).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(val[k])}`);
    return `{${parts.join(',')}}`;
}

/** @param {number} statusCode */
function shouldStoreResponse(statusCode) {
    return (
        statusCode === 200 ||
        statusCode === 400 ||
        statusCode === 403 ||
        statusCode === 404 ||
        statusCode === 409 ||
        statusCode === 429
    );
}

function tenantFromAuth(authContext) {
    if (!authContext) return 'anon';
    if (authContext.mode === 'apiKey' && authContext.apiKeyId) {
        return `ak:${authContext.apiKeyId}`;
    }
    if (authContext.userId) {
        return `u:${authContext.userId}`;
    }
    return 'anon';
}

function isDuplicateKey(err) {
    return err?.code === 11000 || err?.code === '11000';
}

function isComplete(doc) {
    return doc != null && doc.responseBody !== undefined && doc.responseBody !== null;
}

/**
 * Optional Stripe-style idempotency for POST JSON handlers.
 */
export function optionalKycIdempotencyForPostJson(req, res, next) {
    if (req.method !== 'POST') {
        return next();
    }

    const rawHeader = req.headers['idempotency-key'];
    if (rawHeader == null || typeof rawHeader !== 'string') {
        return next();
    }

    const idempotencyKey = rawHeader.trim();
    if (idempotencyKey.length === 0) {
        return next();
    }
    if (idempotencyKey.length > KEY_MAX) {
        return res.status(400).json({
            status: 'FAILED',
            errors: [
                {
                    code: 'INVALID_IDEMPOTENCY_KEY',
                    message: `Idempotency-Key must be at most ${KEY_MAX} characters.`
                }
            ]
        });
    }

    const routeKey = `${req.baseUrl}${req.path}`;
    const tenantKey = tenantFromAuth(req.authContext);
    const bodyHash = createHash('sha256').update(stableStringify(req.body ?? {})).digest('hex');
    const expiresAt = new Date(Date.now() + TTL_MS);
    const filter = { tenantKey, routeKey, idempotencyKey };

    IdempotencyLedger.findOne(filter)
        .lean()
        .then(async (existing) => {
            if (existing) {
                if (existing.bodyHash !== bodyHash) {
                    return res.status(409).json({
                        status: 'FAILED',
                        errors: [
                            {
                                code: 'IDEMPOTENCY_KEY_REUSE_BODY_MISMATCH',
                                message:
                                    'The same Idempotency-Key was used with a different request body.'
                            }
                        ]
                    });
                }
                if (isComplete(existing)) {
                    res.setHeader('Idempotent-Replayed', 'true');
                    return res.status(existing.statusCode ?? 200).json(existing.responseBody);
                }
                return res.status(409).json({
                    status: 'FAILED',
                    errors: [
                        {
                            code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
                            message:
                                'A request with this Idempotency-Key is still in progress; retry shortly.'
                        }
                    ]
                });
            }

            let committed = false;
            const finalize = async (responseBody, statusCode) => {
                if (!shouldStoreResponse(statusCode)) {
                    await IdempotencyLedger.deleteMany(filter).catch((e) =>
                        logger.warn({ err: e }, 'Idempotency release delete failed')
                    );
                    return;
                }
                if (committed) return;
                committed = true;
                try {
                    await IdempotencyLedger.updateOne(filter, {
                        $set: {
                            responseBody,
                            statusCode,
                            inFlight: false,
                            expiresAt,
                            bodyHash
                        }
                    });
                } catch (e) {
                    logger.warn({ err: e }, 'Idempotency finalize failed');
                }
            };

            const releaseOnFailure = async () => {
                await IdempotencyLedger.deleteMany(filter).catch((e) =>
                    logger.warn({ err: e }, 'Idempotency release delete failed')
                );
            };

            try {
                await IdempotencyLedger.create({
                    tenantKey,
                    routeKey,
                    idempotencyKey,
                    bodyHash,
                    inFlight: true,
                    expiresAt
                });
            } catch (createErr) {
                if (isDuplicateKey(createErr)) {
                    const row = await IdempotencyLedger.findOne(filter).lean();
                    if (!row) {
                        return next();
                    }
                    if (row.bodyHash !== bodyHash) {
                        return res.status(409).json({
                            status: 'FAILED',
                            errors: [
                                {
                                    code: 'IDEMPOTENCY_KEY_REUSE_BODY_MISMATCH',
                                    message:
                                        'The same Idempotency-Key was used with a different request body.'
                                }
                            ]
                        });
                    }
                    if (isComplete(row)) {
                        res.setHeader('Idempotent-Replayed', 'true');
                        return res.status(row.statusCode ?? 200).json(row.responseBody);
                    }
                    return res.status(409).json({
                        status: 'FAILED',
                        errors: [
                            {
                                code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
                                message:
                                    'A request with this Idempotency-Key is still in progress; retry shortly.'
                            }
                        ]
                    });
                }
                logger.warn({ err: createErr, routeKey }, 'Idempotency create failed; skipping cache');
                return next();
            }

            const originalJson = res.json.bind(res);
            res.json = (body) => {
                const code = res.statusCode || 200;
                if (shouldStoreResponse(code)) {
                    void finalize(body, code);
                } else {
                    void releaseOnFailure();
                }
                return originalJson(body);
            };

            next();
            return undefined;
        })
        .catch((err) => {
            logger.warn({ err, routeKey, tenantKey }, 'Idempotency lookup failed; skipping cache');
            next();
        });
}
