const SENSITIVE_KEY =
  /(password|secret|token|apikey|api_key|authorization|cookie|set-cookie|bearer|x-api-key|webhook.?secret|integrationwebhooksecret|presigned)/i;

const MAX_BODY_SNIPPET = 200;

/**
 * Depth-limited scrub for arbitrary log objects (PII-heavy fields, URLs with query/auth).
 */
export function redactForLog(value, depth = 0) {
  if (depth > 12) return '[MaxDepth]';
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === 'string') return redactString(value);
  if (t === 'number' || t === 'boolean' || t === 'bigint') return value;
  if (value instanceof Error) return value;
  if (typeof value.then === 'function') return value;
  if (Array.isArray(value)) return value.map((v) => redactForLog(v, depth + 1));
  if (t !== 'object') return value;

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = '[Redacted]';
      continue;
    }
    const kl = k.toLowerCase();
    if (kl === 'mrz' && v && typeof v === 'object' && !Array.isArray(v) && typeof v.raw === 'string') {
      out[k] = {
        ...redactForLog({ ...v, raw: undefined }, depth + 1),
        rawLength: v.raw.length
      };
      continue;
    }
    out[k] = redactForLog(v, depth + 1);
  }
  return out;
}

function redactString(s) {
  if (s.length > 8000) {
    return `${s.slice(0, MAX_BODY_SNIPPET)}…[truncated:${s.length}chars]`;
  }
  if (!/https?:\/\//i.test(s)) return s;
  try {
    const u = new URL(s);
    const q = u.search ? '?[query redacted]' : '';
    const h = u.username || u.password ? `${u.hostname}` : u.host;
    return `${u.protocol}//${h}${u.pathname}${q}${u.hash || ''}`;
  } catch {
    return s.length > 500 ? `${s.slice(0, 120)}…[truncated]` : s;
  }
}
