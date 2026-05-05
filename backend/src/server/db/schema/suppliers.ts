import { pgTable, uuid, varchar, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  leadTimeDays: integer("lead_time_days").default(7),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("0"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
