import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const scanLogs = pgTable("scan_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  barcode: varchar("barcode", { length: 255 }).notNull(),
  itemId: uuid("item_id"),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  scannedBy: varchar("scanned_by", { length: 255 }).notNull(),
  userId: uuid("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
