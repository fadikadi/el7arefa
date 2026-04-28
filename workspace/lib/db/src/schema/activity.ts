import {
  pgTable,
  text,
  timestamp,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";

export const activityTable = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 40 }).notNull(),
  message: text("message").notNull(),
  gameId: uuid("game_id"),
  gameTitle: text("game_title"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ActivityRow = typeof activityTable.$inferSelect;
export type InsertActivityRow = typeof activityTable.$inferInsert;
