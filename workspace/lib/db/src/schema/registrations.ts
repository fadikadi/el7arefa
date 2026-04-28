import {
  pgTable,
  text,
  timestamp,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";
import { gamesTable } from "./games";
import { playersTable } from "./players";

export const registrationsTable = pgTable("registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .references(() => playersTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  attendance: varchar("attendance", { length: 20 }).notNull().default("confirmed"),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type RegistrationRow = typeof registrationsTable.$inferSelect;
export type InsertRegistrationRow = typeof registrationsTable.$inferInsert;
