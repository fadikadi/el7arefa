import {
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import { gamesTable } from "./games";

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  title: text("title"),
  message: text("message").notNull(),
  audience: varchar("audience", { length: 20 }).notNull().default("all"),
  recipientCount: integer("recipient_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type NotificationRow = typeof notificationsTable.$inferSelect;
export type InsertNotificationRow = typeof notificationsTable.$inferInsert;
