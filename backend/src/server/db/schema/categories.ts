import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
