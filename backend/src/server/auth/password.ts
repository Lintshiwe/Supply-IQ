import { randomBytes, createHash } from "node:crypto";

/**
 * Hash a password using SHA-256 with a salt.
 * In production, use argon2 or bcrypt. This is a fast, zero-dependency approach.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const computed = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  return computed === hash;
}
