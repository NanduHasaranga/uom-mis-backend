/**
 * Format isn't specified anywhere in the requirements — this is a
 * clearly-labeled placeholder. Confirm the real format with whoever owns
 * this requirement before shipping (same situation as the placeholder
 * username format in MockAuthConsumer).
 */
export function generateSecondaryEmail(userId: string): string {
  return `${userId.toLowerCase()}@ext.uom.lk`;
}
