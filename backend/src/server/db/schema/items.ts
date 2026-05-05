import { pgTable, uuid, varchar, text, integer, numeric, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const itemStatusEnum = pgEnum("item_status", ["active", "discontinued", "archived"]);

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  sku: varchar("sku", { length: 100 }).notNull(),
  barcode: varchar("barcode", { length: 100 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: uuid("category_id"),
  status: itemStatusEnum("status").notNull().default("active"),
  unit: varchar("unit", { length: 50 }).default("each"),
  currentStock: integer("current_stock").default(0),
  reorderPoint: integer("reorder_point").default(0),
  reorderQuantity: integer("reorder_quantity").default(0),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).default("0"),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).default("0"),
  locationId: uuid("location_id"),
  supplierId: uuid("supplier_id"),
  imageUrl: text("image_url"),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
