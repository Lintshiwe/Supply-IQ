import { db } from "../db";
import { users, workspaces, subscriptions, activationKeys } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, sessionCookie, clearCookie } from "../auth/session";
import { generateActivationKey, hashActivationKey } from "../auth/keys";
import { seedWorkspace } from "../db/seed";
import { sendActivationKeyEmail } from "../email/nodemailer";
import { getSubscriptionStatus } from "../auth/subscription";

export async function registerUser(data: {
  email: string; name: string; password: string; companyName: string;
}) {
  const { email, name, password, companyName } = data;
  const normalizedEmail = email.toLowerCase();

  const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail));
  if (existing) throw new Error("An account with this email already exists.");

  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

  const [workspace] = await db.insert(workspaces).values({
    name: companyName, slug, ownerId: "",
    address: null, phone: null, industry: null,
  }).returning();

  const passwordHash = hashPassword(password);
  const [user] = await db.insert(users).values({
    email: normalizedEmail, name, passwordHash, role: "admin",
    workspaceId: workspace.id, isOwner: true, isActive: true,
  }).returning();

  await db.update(workspaces).set({ ownerId: user.id }).where(eq(workspaces.id, workspace.id));

  const now = new Date();
  const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  await db.insert(subscriptions).values({
    workspaceId: workspace.id, tier: "demo", status: "demo",
    startsAt: now, expiresAt: trialEnds,
  });

  await seedWorkspace(workspace.id);

  const token = createSession(user.id, workspace.id, user.role);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    workspace: { id: workspace.id, name: workspace.name },
    subscription: { tier: "demo", status: "demo", isActive: false, isDemo: true, isExpired: false, expiresAt: trialEnds.toISOString() },
    sessionCookie: sessionCookie(token),
  };
}

export async function loginUser(data: { email: string; password: string }) {
  const { email, password } = data;
  const normalizedEmail = email.toLowerCase();

  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
  if (!user) throw new Error("Invalid email or password.");

  if (!verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  if (!user.isActive) throw new Error("This account has been deactivated.");

  await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, user.workspaceId));
  const subStatus = await getSubscriptionStatus(user.workspaceId);
  const token = createSession(user.id, user.workspaceId, user.role);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    workspace: workspace ? { id: workspace.id, name: workspace.name } : { id: user.workspaceId, name: "Workspace" },
    subscription: subStatus,
    sessionCookie: sessionCookie(token),
  };
}

export async function logoutUser() {
  return { sessionCookie: clearCookie() };
}

export async function activateSubscription(data: { activationKey: string; workspaceId: string }) {
  const { activationKey, workspaceId } = data;
  const keyHash = hashActivationKey(activationKey);

  const [keyRecord] = await db.select().from(activationKeys).where(
    and(eq(activationKeys.keyHash, keyHash), eq(activationKeys.workspaceId, workspaceId), eq(activationKeys.isUsed, false))
  );

  if (!keyRecord) throw new Error("Invalid or already used activation key.");
  if (new Date(keyRecord.expiresAt) < new Date()) throw new Error("This activation key has expired.");

  await db.update(activationKeys).set({ isUsed: true, usedAt: new Date() }).where(eq(activationKeys.id, keyRecord.id));

  const tierDurations: Record<string, number> = { "1yr": 365, "3yr": 1095, "5yr": 1825, "7yr": 2555 };
  const days = tierDurations[keyRecord.tier] || 365;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await db.update(subscriptions).set({
    tier: keyRecord.tier, status: "active", activationKeyHash: keyHash,
    startsAt: now, expiresAt, cancelledAt: null,
  }).where(eq(subscriptions.workspaceId, workspaceId));

  await db.update(workspaces).set({ isDemo: false }).where(eq(workspaces.id, workspaceId));

  return { tier: keyRecord.tier, status: "active", isActive: true, isDemo: false, isExpired: false, expiresAt: expiresAt.toISOString() };
}

export async function requestActivationKey(data: { workspaceId: string; tier: string }) {
  const { workspaceId, tier } = data;
  const rawKey = generateActivationKey();
  const keyHash = hashActivationKey(rawKey);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(activationKeys).values({ workspaceId, keyHash, tier: tier as any, isUsed: false, expiresAt });

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  const [owner] = workspace
    ? await db.select().from(users).where(and(eq(users.workspaceId, workspaceId), eq(users.isOwner, true)))
    : [null];

  if (owner?.email) {
    await sendActivationKeyEmail(owner.email, rawKey, owner.name);
  }

  return { message: "Activation key has been sent to your email." };
}

export async function cancelSubscription(data: { workspaceId: string }) {
  await db.update(subscriptions).set({ status: "cancelled", cancelledAt: new Date(), autoRenew: false })
    .where(eq(subscriptions.workspaceId, data.workspaceId));
  return { message: "Subscription cancelled. Access continues until expiration." };
}
