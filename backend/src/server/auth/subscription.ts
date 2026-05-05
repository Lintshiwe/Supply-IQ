import { db } from "../db";
import { subscriptions } from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Check if a workspace has an active subscription.
 * Returns subscription status info.
 */
export async function getSubscriptionStatus(workspaceId: string): Promise<{
  isActive: boolean;
  isDemo: boolean;
  isExpired: boolean;
  tier: string;
  expiresAt: Date | null;
}> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId));

  if (!sub) {
    return { isActive: false, isDemo: true, isExpired: false, tier: "demo", expiresAt: null };
  }

  const now = new Date();
  const isExpired = sub.expiresAt ? new Date(sub.expiresAt) < now : false;
  const isDemo = sub.tier === "demo" || sub.status === "demo";
  const isActive = sub.status === "active" && !isExpired;

  return {
    isActive,
    isDemo,
    isExpired,
    tier: sub.tier,
    expiresAt: sub.expiresAt,
  };
}
