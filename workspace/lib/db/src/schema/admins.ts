import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const adminsTable = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AdminRow = typeof adminsTable.$inferSelect;
export type InsertAdminRow = typeof adminsTable.$inferInsert;
