import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminsTable } from "./admins";

export const adminSessionsTable = pgTable("admin_sessions", {
  id: text("id").primaryKey(),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => adminsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type AdminSessionRow = typeof adminSessionsTable.$inferSelect;
export type InsertAdminSessionRow = typeof adminSessionsTable.$inferInsert;
