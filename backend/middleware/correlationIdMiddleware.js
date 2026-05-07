import { randomUUID } from 'crypto';

const HEADER = 'x-correlation-id';
const MAX_LEN = 128;

/**
 * Echo or generate X-Correlation-Id for request tracing.
 */
export function correlationIdMiddleware(req, res, next) {
    let id = req.headers[HEADER];
    if (typeof id === 'string') {
        id = id.trim().slice(0, MAX_LEN);
    }
    if (!id || id.length === 0) {
        id = randomUUID();
    }
    req.correlationId = id;
    res.setHeader('X-Correlation-Id', id);
    next();
}
