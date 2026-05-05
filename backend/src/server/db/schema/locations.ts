import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const locationTypeEnum = pgEnum("location_type", ["warehouse", "zone", "aisle", "shelf", "bin"]);

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: locationTypeEnum("type").notNull().default("warehouse"),
  parentId: uuid("parent_id"),
  description: text("description"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
