#!/usr/bin/env node
/**
 * Placeholder for bucket-wide retention deletes.
 * Tenant-owned erase already supports ADMIN_DELETE_PURGE_OBJECTS on DELETE /admin/verifications/:id.
 * Wire this cron to product retention windows + object key prefixes once finalized.
 */

console.log('[r2-retention-scan] No-op stub. Configure naming + age policy before deleting at scale.');
process.exit(0);
