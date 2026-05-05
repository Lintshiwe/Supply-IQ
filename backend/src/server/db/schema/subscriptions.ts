import { pgTable, uuid, varchar, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

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
