/**
 * Format isn't specified anywhere in the requirements — this is a
 * clearly-labeled placeholder. Confirm the real format with whoever owns
 * this requirement before shipping.
 */
export function generateSecondaryEmail(userId: string): string {
  return `${userId.toLowerCase()}@ext.uom.lk`;
}
