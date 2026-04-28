import {
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { gamesTable } from "./games";

export const gameInvitesTable = pgTable("game_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  token: text("token").notNull().unique(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GameInviteRow = typeof gameInvitesTable.$inferSelect;
export type InsertGameInviteRow = typeof gameInvitesTable.$inferInsert;
