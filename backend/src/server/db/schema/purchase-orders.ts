import { pgTable, uuid, varchar, text, integer, numeric, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", ["draft", "submitted", "partial", "received", "cancelled"]);

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  supplierId: uuid("supplier_id").notNull(),
  status: orderStatusEnum("status").notNull().default("draft"),
  items: jsonb("items").notNull().default([]),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).default("0"),
  expectedDelivery: timestamp("expected_delivery"),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
