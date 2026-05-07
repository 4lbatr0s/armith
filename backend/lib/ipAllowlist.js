import net, { BlockList } from 'net';

const MAX_RULES = 24;

/** Strip IPv4-mapped IPv6 prefix (::ffff:x.x.x.x) */
function unwrapIp(raw) {
  const s = String(raw || '').trim();
  if (s.startsWith('::ffff:') && net.isIPv4(s.slice(7))) return s.slice(7);
  return s;
}

function ipv4ToInt(ip) {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = [1, 2, 3, 4].map((i) => parseInt(m[i], 10));
  if (parts.some((n) => n > 255 || n < 0)) return null;
  return (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0);
}

/** @returns {{ base: number, mask: number } | null} */
function parseIpv4Cidr(rule) {
  const idx = rule.indexOf('/');
  if (idx <= 0) return null;
  const baseStr = rule.slice(0, idx).trim();
  const bits = parseInt(rule.slice(idx + 1), 10);
  const baseInt = ipv4ToInt(baseStr);
  if (baseInt == null || !Number.isFinite(bits) || bits < 0 || bits > 32) return null;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return { base: baseInt & mask, mask };
}

function ipv4MatchesCidr(ip, cidrRule) {
  const parsed = parseIpv4Cidr(cidrRule);
  if (!parsed) return false;
  const ipInt = ipv4ToInt(ip);
  if (ipInt == null) return false;
  return ((ipInt & parsed.mask) >>> 0) === (parsed.base >>> 0);
}

/**
 * @param {unknown} raw
 * @returns {{ ok: boolean, cidrs?: string[], error?: string }}
 */
export function normalizeAllowedCidrs(raw) {
  if (raw == null) return { ok: true, cidrs: [] };
  if (!Array.isArray(raw)) return { ok: false, error: 'allowedCidrs must be an array' };

  const out = [];
  const seen = new Set();
  for (const entry of raw) {
    if (typeof entry !== 'string') return { ok: false, error: 'Each allowlist entry must be a string' };
    const t = entry.trim();
    if (!t) continue;
    if (!validateOneRule(t)) return { ok: false, error: `Invalid rule: ${t}` };
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
    if (out.length > MAX_RULES) return { ok: false, error: `At most ${MAX_RULES} allowlist entries` };
  }

  return { ok: true, cidrs: out };
}

/** @returns {{ addr: string, bits: number } | null } */
export function parseIpv6Cidr(rule) {
  const idx = rule.indexOf('/');
  if (idx <= 0) return null;
  const addr = rule.slice(0, idx).trim();
  const bits = parseInt(rule.slice(idx + 1), 10);
  if (!net.isIPv6(addr) || !Number.isFinite(bits) || bits < 0 || bits > 128) return null;
  return { addr, bits };
}

/** IPv4 literal / CIDR (/0–32), exact IPv6, or IPv6 CIDR (/0–128). */
export function validateOneRule(rule) {
  const r = typeof rule === 'string' ? rule.trim() : '';
  if (!r) return false;

  if (r.includes('/')) {
    const [, bitsStr] = r.split('/', 2);
    const bits = parseInt(bitsStr, 10);
    const [addr] = r.split('/', 2);
    if (net.isIPv4(addr.trim())) {
      return Number.isFinite(bits) && bits >= 0 && bits <= 32;
    }
    if (net.isIPv6(addr.trim())) {
      return Number.isFinite(bits) && bits >= 0 && bits <= 128;
    }
    return false;
  }

  return net.isIP(r) !== 0;
}

/**
 * @param {string} clientIp raw from proxy
 * @param {string[]} rules normalized rules; empty ⇒ allow all
 */
export function ipAllowedByRules(clientIp, rules) {
  if (!rules || rules.length === 0) return true;

  const ip = unwrapIp(clientIp);
  if (!ip) return false;

  for (const rule of rules) {
    const r = rule.trim();
    if (!r) continue;
    if (!r.includes('/')) {
      if (ip === unwrapIp(r)) return true;
      continue;
    }
    if (net.isIPv4(ip) && ipv4MatchesCidr(ip, r)) return true;

    const v6 = parseIpv6Cidr(r);
    if (net.isIPv6(ip) && v6) {
      try {
        const bl = new BlockList();
        bl.addSubnet(v6.addr, v6.bits, 'ipv6');
        if (bl.check(ip, 'ipv6')) return true;
      } catch {
        continue;
      }
    }
  }

  return false;
}
