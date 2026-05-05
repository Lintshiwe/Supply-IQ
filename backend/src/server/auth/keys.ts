import { createHash, randomBytes } from "node:crypto";

/**
 * Generate a human-readable activation key: SW-XXXX-XXXX-XXXX-XXXX-XXXX
 */
export function generateActivationKey(): string {
  const segments: string[] = [];
  for (let i = 0; i < 5; i++) {
    segments.push(randomBytes(2).toString("hex").toUpperCase());
  }
  return `SW-${segments.join("-")}`;
}

/**
 * Hash an activation key for secure storage.
 */
export function hashActivationKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate a plaintext activation key against a stored hash.
 */
export function verifyActivationKey(plaintext: string, storedHash: string): boolean {
  return hashActivationKey(plaintext) === storedHash;
}
