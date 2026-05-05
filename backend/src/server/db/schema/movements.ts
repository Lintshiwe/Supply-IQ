import { pgTable, uuid, varchar, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const movementTypeEnum = pgEnum("movement_type", ["received", "shipped", "adjusted", "transferred"]);

export const movements = pgTable("movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  itemId: uuid("item_id").notNull(),
  type: movementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  fromLocationId: uuid("from_location_id"),
  toLocationId: uuid("to_location_id"),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  performedBy: varchar("performed_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
