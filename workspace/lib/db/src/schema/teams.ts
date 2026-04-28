import {
  pgTable,
  text,
  varchar,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import { gamesTable } from "./games";

export const teamsTable = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: varchar("color", { length: 32 }).notNull(),
  position: integer("position").notNull(),
});

export type TeamRow = typeof teamsTable.$inferSelect;
export type InsertTeamRow = typeof teamsTable.$inferInsert;
