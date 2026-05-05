import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const notificationTypeEnum = pgEnum("notification_type", ["low_stock", "zero_stock", "po_reminder", "po_overdue", "request_update", "system"]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  link: text("link"),
  referenceId: varchar("reference_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationPrefs = pgTable("notification_prefs", {
  workspaceId: uuid("workspace_id").primaryKey(),
  lowStock: boolean("low_stock").default(true),
  zeroStock: boolean("zero_stock").default(true),
  poReminder: boolean("po_reminder").default(true),
  poOverdue: boolean("po_overdue").default(true),
  requestUpdate: boolean("request_update").default(true),
});
