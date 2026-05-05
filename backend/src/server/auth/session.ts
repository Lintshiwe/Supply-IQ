import { createHash, randomBytes } from "node:crypto";

interface SessionData {
  userId: string;
  workspaceId: string;
  role: string;
  createdAt: number;
}

const SESSION_STORE = new Map<string, SessionData>();

/**
 * Create a new session for a user.
 * Returns the session token (to be set as an httpOnly cookie).
 */
export function createSession(userId: string, workspaceId: string, role: string): string {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  SESSION_STORE.set(token, {
    userId,
    workspaceId,
    role,
    createdAt: Date.now(),
  });
  return token;
}

/**
 * Validate a session token and return the session data.
 * Returns null if the token is invalid or expired.
 */
export function validateSession(token: string): SessionData | null {
  const session = SESSION_STORE.get(token);
  if (!session) return null;
  // Sessions expire after 7 days
  if (Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000) {
    SESSION_STORE.delete(token);
    return null;
  }
  return session;
}

/**
 * Destroy a session by token.
 */
export function destroySession(token: string): void {
  SESSION_STORE.delete(token);
}

/**
 * Set a cookie header value for the session.
 */
export function sessionCookie(token: string): string {
  return `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
}

/**
 * Clear the session cookie.
 */
export function clearCookie(): string {
  return "session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0";
}
