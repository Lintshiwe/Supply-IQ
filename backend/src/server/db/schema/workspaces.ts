import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  ownerId: uuid("owner_id").notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  industry: varchar("industry", { length: 100 }),
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
