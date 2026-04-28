import {
  pgTable,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { gamesTable } from "./games";
import { registrationsTable } from "./registrations";

export const motmVotesTable = pgTable(
  "motm_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => gamesTable.id, { onDelete: "cascade" }),
    voterRegistrationId: uuid("voter_registration_id")
      .notNull()
      .references(() => registrationsTable.id, { onDelete: "cascade" }),
    votedRegistrationId: uuid("voted_registration_id")
      .notNull()
      .references(() => registrationsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    voterPerGame: uniqueIndex("motm_votes_voter_game_unique").on(
      t.gameId,
      t.voterRegistrationId,
    ),
  }),
);

export type MotmVoteRow = typeof motmVotesTable.$inferSelect;
export type InsertMotmVoteRow = typeof motmVotesTable.$inferInsert;
