import { createHash } from 'crypto';
import { Types } from 'mongoose';

/**
 * Keycloak's JWT `sub` is a UUID, not a valid Mongo ObjectId, but the User/
 * BulkUploadBatch schemas type createdBy/uploadedBy as Types.ObjectId (Auth
 * owns the admin directory, we don't have a local admins collection to look
 * up). Deterministically derive a 24-hex-char ObjectId from the sub so the
 * same admin always maps to the same id.
 */
export function adminIdFromSub(sub: string): Types.ObjectId {
  const hex = createHash('md5').update(sub).digest('hex').slice(0, 24);
  return new Types.ObjectId(hex);
}
