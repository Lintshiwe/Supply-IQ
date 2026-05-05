import { pgTable, uuid, varchar, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const subscriptionTierEnum = pgEnum("subscription_tier", ["demo", "1yr", "3yr", "5yr", "7yr"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "expired", "cancelled", "demo"]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").unique().notNull(),
  tier: subscriptionTierEnum("tier").notNull(),
  status: subscriptionStatusEnum("status").notNull(),
  activationKeyHash: varchar("activation_key_hash", { length: 255 }),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  cancelledAt: timestamp("cancelled_at"),
  maxDevices: integer("max_devices").default(0),
  autoRenew: boolean("auto_renew").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activationKeys = pgTable("activation_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  keyHash: varchar("key_hash", { length: 255 }).unique().notNull(),
  tier: subscriptionTierEnum("tier").notNull(),
  isUsed: boolean("is_used").default(false),
  sentTo: varchar("sent_to", { length: 255 }),
  sentAt: timestamp("sent_at"),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  userId: uuid("user_id").notNull(),
  deviceName: varchar("device_name", { length: 255 }).notNull(),
  deviceType: varchar("device_type", { length: 50 }).notNull(),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Returns the max devices allowed per subscription tier */
export function getMaxDevicesForTier(tier: string): number {
  switch (tier) {
    case "demo": return 1;
    case "1yr": return 2;
    case "3yr": return 5;
    case "5yr": return 10;
    case "7yr": return 20;
    default: return 1;
  }
}
