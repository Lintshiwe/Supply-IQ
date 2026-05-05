import { db } from "../db";
import { users, workspaces, subscriptions, activationKeys, devices, getMaxDevicesForTier } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, sessionCookie, clearCookie } from "../auth/session";
import { generateActivationKey, hashActivationKey } from "../auth/keys";
import { seedWorkspace } from "../db/seed";
import { sendActivationKeyEmail } from "../email/nodemailer";
import { getSubscriptionStatus } from "../auth/subscription";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
    maxDevices: getMaxDevicesForTier("demo"),
  });

  await seedWorkspace(workspace.id);

  const token = createSession(user.id, workspace.id, user.role);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    workspace: { id: workspace.id, name: workspace.name },
    subscription: {
      tier: "demo", status: "demo", isActive: false, isDemo: true, isExpired: false,
      expiresAt: trialEnds.toISOString(), maxDevices: getMaxDevicesForTier("demo"),
    },
    sessionCookie: sessionCookie(token),
  };
}

export async function loginUser(data: { email: string; password: string; deviceName?: string; deviceType?: string; deviceId?: string }) {
  const { email, password, deviceName, deviceType, deviceId } = data;
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

  // Register device if info provided
  if (deviceName && deviceId) {
    await registerDeviceInternal(user.workspaceId, user.id, deviceName, deviceType || "browser", deviceId);
  }

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
  const maxDevices = getMaxDevicesForTier(keyRecord.tier);

  await db.update(subscriptions).set({
    tier: keyRecord.tier, status: "active", activationKeyHash: keyHash,
    startsAt: now, expiresAt, cancelledAt: null, maxDevices,
  }).where(eq(subscriptions.workspaceId, workspaceId));

  await db.update(workspaces).set({ isDemo: false }).where(eq(workspaces.id, workspaceId));

  return {
    tier: keyRecord.tier, status: "active", isActive: true, isDemo: false, isExpired: false,
    expiresAt: expiresAt.toISOString(), maxDevices,
  };
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

  const maxDevices = getMaxDevicesForTier(tier);
  return {
    message: "Activation key has been sent to your email.",
    activationKey: rawKey,
    tier,
    maxDevices,
  };
}

export async function cancelSubscription(data: { workspaceId: string }) {
  await db.update(subscriptions).set({ status: "cancelled", cancelledAt: new Date(), autoRenew: false })
    .where(eq(subscriptions.workspaceId, data.workspaceId));
  return { message: "Subscription cancelled. Access continues until expiration." };
}

// ─── Device Management ──────────────────────────────────

async function registerDeviceInternal(workspaceId: string, userId: string, deviceName: string, deviceType: string, deviceId: string) {
  // Check device limit
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId));
  const maxDevices = sub?.maxDevices || 1;

  // Get existing active devices
  const activeDevices = await db.select().from(devices).where(
    and(eq(devices.workspaceId, workspaceId), eq(devices.isActive, true))
  );

  // Check if this device already exists
  const existingDevice = activeDevices.find(d => d.deviceId === deviceId);
  if (existingDevice) {
    await db.update(devices).set({ lastUsed: new Date() }).where(eq(devices.id, existingDevice.id));
    return { registered: true, deviceCount: activeDevices.length, maxDevices };
  }

  // Check limit
  if (activeDevices.length >= maxDevices) {
    return { registered: false, deviceCount: activeDevices.length, maxDevices,
      error: `Device limit reached. Your plan allows ${maxDevices} device(s). Upgrade to add more.` };
  }

  await db.insert(devices).values({ workspaceId, userId, deviceName, deviceType, deviceId });
  return { registered: true, deviceCount: activeDevices.length + 1, maxDevices };
}

export async function registerDevice(data: { workspaceId: string; userId: string; deviceName: string; deviceType: string; deviceId: string }) {
  return registerDeviceInternal(data.workspaceId, data.userId, data.deviceName, data.deviceType, data.deviceId);
}

export async function getDevices(data: { workspaceId: string }) {
  const activeDevices = await db.select().from(devices).where(
    and(eq(devices.workspaceId, data.workspaceId), eq(devices.isActive, true))
  ).orderBy(devices.lastUsed);

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, data.workspaceId));
  return { devices: activeDevices, maxDevices: sub?.maxDevices || 1 };
}

export async function removeDevice(data: { deviceId: string; workspaceId: string }) {
  await db.update(devices).set({ isActive: false })
    .where(and(eq(devices.deviceId, data.deviceId), eq(devices.workspaceId, data.workspaceId)));
  return { success: true };
}

// ─── Key File Download ───────────────────────────────────

export async function downloadActivationKey(data: { workspaceId: string; userId: string }) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, data.workspaceId));

  if (sub?.activationKeyHash) {
    // Return a license file content
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, data.workspaceId));
    const [user] = await db.select().from(users).where(eq(users.id, data.userId));

    const licenseData = {
      product: "SupplyIQ",
      workspace: workspace?.name || "Unknown",
      licensee: user?.email || "Unknown",
      tier: sub.tier,
      status: sub.status,
      activated: sub.startsAt?.toISOString(),
      expires: sub.expiresAt?.toISOString(),
      maxDevices: sub.maxDevices,
      activationKeyHash: sub.activationKeyHash,
    };

    return {
      filename: `supplyiq-license-${data.workspaceId.slice(0, 8)}.json`,
      content: JSON.stringify(licenseData, null, 2),
      mimeType: "application/json",
    };
  }

  throw new Error("No active subscription found.");
}
