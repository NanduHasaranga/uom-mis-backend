/**
 * Format isn't specified anywhere in the requirements — this is a
 * clearly-labeled placeholder. Confirm the real format with whoever owns
 * this requirement before shipping.
 */
export function generateSecondaryEmail(userId: string): string {
  return `${userId.toLowerCase()}@ext.uom.lk`;
}

/**
 * lastName + initials of the remaining name parts + "." + batch, all lowercase.
 * e.g. "Thusaya Hewa Tharidu Deshan Nandaka" + batch "21" -> "nandakathtd.21"
 * Only defined for students — staff have no batch number to key off of.
 */
export function generateUsername(fullName: string, batch: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const lastName = parts[parts.length - 1] ?? '';
  const initials = parts.slice(0, -1).map((part) => part[0]).join('');
  return `${lastName}${initials}.${batch}`.toLowerCase();
}
