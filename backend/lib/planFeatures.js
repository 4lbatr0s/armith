/** @param {{ planTier?: string } | null | undefined} user */
export function canUsePerKeyIpAllowlist(user) {
  const t = user?.planTier;
  return t === 'growth' || t === 'enterprise';
}
