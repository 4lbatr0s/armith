/**
 * Client IP behind Express + reverse proxy (Render, etc.).
 * Requires `app.set('trust proxy', …)` — see `app.js`.
 */
export function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  if (typeof req.ip === 'string' && req.ip.trim()) return req.ip.trim();
  const ra = req.socket?.remoteAddress;
  return typeof ra === 'string' ? ra.trim() : '';
}
