import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "partially_fulfilled", "fulfilled", "declined", "cancelled"]);

export const requests = pgTable("requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  requestNumber: varchar("request_number", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: requestStatusEnum("status").notNull().default("pending"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  items: jsonb("items").notNull().default([]),
  requestedBy: varchar("requested_by", { length: 255 }).notNull(),
  approvedBy: varchar("approved_by", { length: 255 }),
  reason: text("reason"),
  declineReason: text("decline_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
