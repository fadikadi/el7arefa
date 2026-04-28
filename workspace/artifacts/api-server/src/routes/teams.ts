import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  gamesTable,
  registrationsTable,
  teamsTable,
  teamAssignmentsTable,
  activityTable,
} from "@workspace/db";
import {
  SplitTeamsBody,
  MoveTeamPlayerBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const TEAM_PRESETS = [
  { name: "Reds", color: "#E11D48" },
  { name: "Blues", color: "#2563EB" },
  { name: "Yellows", color: "#EAB308" },
];

async function loadTeamSplit(gameId: string) {
  const teams = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.gameId, gameId))
    .orderBy(teamsTable.position);
  const regs = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.gameId, gameId));
  const regById = new Map(regs.map((r) => [r.id, r]));
  const assignments = teams.length
    ? await db
        .select()
        .from(teamAssignmentsTable)
        .where(
          inArray(
            teamAssignmentsTable.teamId,
            teams.map((t) => t.id),
          ),
        )
    : [];
  return {
    gameId,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      players: assignments
        .filter((a) => a.teamId === t.id)
        .map((a) => regById.get(a.registrationId))
        .filter((r): r is NonNullable<typeof r> => !!r)
        .map((r) => ({
          id: r.id,
          name: r.name,
          attendance: (r.attendance ?? "confirmed") as
            | "confirmed"
            | "tentative",
        })),
    })),
  };
}

router.get("/games/:gameId/teams", (req, res) => {
  void (async () => {
    res.json(await loadTeamSplit(String(req.params.gameId)));
  })();
});

router.post("/games/:gameId/teams", requireAdmin, (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const parsed = SplitTeamsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const teamCount = parsed.data.teamCount;

    const [game] = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, gameId))
      .limit(1);
    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    // Wipe existing teams (cascade removes assignments)
    await db.delete(teamsTable).where(eq(teamsTable.gameId, gameId));

    // Create teams
    const newTeams = await db
      .insert(teamsTable)
      .values(
        Array.from({ length: teamCount }, (_, i) => ({
          gameId,
          name: TEAM_PRESETS[i]!.name,
          color: TEAM_PRESETS[i]!.color,
          position: i,
        })),
      )
      .returning();

    // Get approved players and shuffle
    const approved = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.gameId, gameId));
    const pool = approved.filter((r) => r.status === "approved");
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }

    if (pool.length > 0) {
      const assignments = pool.map((p, idx) => ({
        teamId: newTeams[idx % teamCount]!.id,
        registrationId: p.id,
      }));
      await db.insert(teamAssignmentsTable).values(assignments);
    }

    await db.insert(activityTable).values({
      type: "teams_split",
      message: `Split into ${teamCount} teams`,
      gameId: game.id,
      gameTitle: game.title,
    });

    res.json(await loadTeamSplit(gameId));
  })();
});

router.patch("/games/:gameId/teams/assignments", requireAdmin, (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const parsed = MoveTeamPlayerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const { registrationId, teamId } = parsed.data;

    // Verify the team belongs to this game
    const [team] = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.id, teamId))
      .limit(1);
    if (!team || team.gameId !== gameId) {
      res.status(404).json({ message: "Team not found for this game" });
      return;
    }

    await db
      .delete(teamAssignmentsTable)
      .where(eq(teamAssignmentsTable.registrationId, registrationId));
    await db.insert(teamAssignmentsTable).values({ teamId, registrationId });

    res.json(await loadTeamSplit(gameId));
  })();
});

export default router;
