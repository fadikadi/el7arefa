import {
  pgTable,
  text,
  integer,
  timestamp,
  varchar,
  date,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const gamesTable = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  location: text("location").notNull(),
  slots: integer("slots").notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  autoApprove: boolean("auto_approve").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GameRow = typeof gamesTable.$inferSelect;
export type InsertGameRow = typeof gamesTable.$inferInsert;
