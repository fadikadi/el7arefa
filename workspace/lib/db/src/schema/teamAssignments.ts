import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { teamsTable } from "./teams";
import { registrationsTable } from "./registrations";

export const teamAssignmentsTable = pgTable(
  "team_assignments",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teamsTable.id, { onDelete: "cascade" }),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrationsTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.registrationId] })],
);

export type TeamAssignmentRow = typeof teamAssignmentsTable.$inferSelect;
export type InsertTeamAssignmentRow = typeof teamAssignmentsTable.$inferInsert;
