import { Router, type IRouter } from "express";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  db,
  gamesTable,
  registrationsTable,
  teamsTable,
  teamAssignmentsTable,
  activityTable,
} from "@workspace/db";
import {
  CreateGameBody,
  ListGamesQueryParams,
  UpdateGameBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import {
  toGameSummary,
  toGameWithCreated,
} from "../lib/serializers";
import { sendPushToGame } from "../lib/push";

const router: IRouter = Router();

async function getCounts(gameIds: string[]) {
  if (gameIds.length === 0) return new Map<string, { approved: number; pending: number }>();
  const rows = await db
    .select({
      gameId: registrationsTable.gameId,
      status: registrationsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(registrationsTable)
    .where(inArray(registrationsTable.gameId, gameIds))
    .groupBy(registrationsTable.gameId, registrationsTable.status);
  const map = new Map<string, { approved: number; pending: number }>();
  for (const id of gameIds) map.set(id, { approved: 0, pending: 0 });
  for (const r of rows) {
    const e = map.get(r.gameId)!;
    if (r.status === "approved") e.approved = r.count;
    else if (r.status === "pending") e.pending = r.count;
  }
  return map;
}

router.get("/games", async (req, res, next) => {
  try {
    const parsed = ListGamesQueryParams.safeParse(req.query);
    const status = parsed.success ? parsed.data.status : "upcoming";
    const today = new Date().toISOString().slice(0, 10);

    let games;
    if (status === "upcoming") {
      games = await db
        .select()
        .from(gamesTable)
        .where(gte(gamesTable.date, today))
        .orderBy(gamesTable.date, gamesTable.startTime);
    } else if (status === "past") {
      games = await db
        .select()
        .from(gamesTable)
        .where(sql`${gamesTable.date} < ${today}`)
        .orderBy(desc(gamesTable.date));
    } else {
      games = await db
        .select()
        .from(gamesTable)
        .orderBy(desc(gamesTable.date));
    }

    const counts = await getCounts(games.map((g) => g.id));
    res.json(
      games.map((g) => {
        const c = counts.get(g.id) ?? { approved: 0, pending: 0 };
        return toGameSummary(g, c.approved, c.pending);
      }),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/games", requireAdmin, (req, res) => {
  void (async () => {
    const parsed = CreateGameBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const { title, date, startTime, endTime, location, slots, notes } =
      parsed.data;
    const [game] = await db
      .insert(gamesTable)
      .values({
        title,
        date,
        startTime,
        endTime,
        location,
        slots,
        notes: notes ?? null,
      })
      .returning();

    await db.insert(activityTable).values({
      type: "game_created",
      message: `New game created: ${game.title}`,
      gameId: game.id,
      gameTitle: game.title,
    });

    res.status(201).json(toGameWithCreated(game, 0, 0));
  })();
});

router.get("/games/:gameId", (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const [game] = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, gameId))
      .limit(1);
    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    const regs = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.gameId, gameId));
    const approved = regs.filter((r) => r.status === "approved");
    const pendingCount = regs.filter((r) => r.status === "pending").length;
    const approvedById = new Map(approved.map((r) => [r.id, r]));

    // Teams for this game
    const teams = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.gameId, gameId))
      .orderBy(teamsTable.position);

    let teamSplit:
      | {
          gameId: string;
          teams: {
            id: string;
            name: string;
            color: string;
            players: {
              id: string;
              name: string;
              attendance: "confirmed" | "tentative";
            }[];
          }[];
        }
      | null = null;

    if (teams.length > 0) {
      const assignments = await db
        .select()
        .from(teamAssignmentsTable)
        .where(
          inArray(
            teamAssignmentsTable.teamId,
            teams.map((t) => t.id),
          ),
        );
      const regById = new Map(regs.map((r) => [r.id, r]));
      teamSplit = {
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

    res.json({
      game: toGameSummary(game, approved.length, pendingCount),
      approvedPlayers: approved.map((r) => ({
        id: r.id,
        name: r.name,
        attendance: (r.attendance ?? "confirmed") as "confirmed" | "tentative",
      })),
      pendingCount,
      teams: teamSplit,
    });
    void approvedById;
  })();
});

router.patch("/games/:gameId", requireAdmin, (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const parsed = UpdateGameBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const updates = parsed.data;
    const [updated] = await db
      .update(gamesTable)
      .set({
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.date !== undefined && { date: updates.date }),
        ...(updates.startTime !== undefined && { startTime: updates.startTime }),
        ...(updates.endTime !== undefined && { endTime: updates.endTime }),
        ...(updates.location !== undefined && { location: updates.location }),
        ...(updates.slots !== undefined && { slots: updates.slots }),
        ...(updates.notes !== undefined && { notes: updates.notes ?? null }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.autoApprove !== undefined && { autoApprove: updates.autoApprove }),
      })
      .where(eq(gamesTable.id, gameId))
      .returning();
    if (!updated) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    await db.insert(activityTable).values({
      type: "game_updated",
      message: `Game updated: ${updated.title}`,
      gameId: updated.id,
      gameTitle: updated.title,
    });

    void sendPushToGame(updated.id, "all", {
      title: `Game updated: ${updated.title}`,
      body: `${updated.date} at ${updated.startTime} — ${updated.location}`,
      url: `/games/${updated.id}`,
      tag: `game-${updated.id}`,
    });

    const counts = await getCounts([updated.id]);
    const c = counts.get(updated.id) ?? { approved: 0, pending: 0 };
    res.json(toGameWithCreated(updated, c.approved, c.pending));
  })();
});

router.delete("/games/:gameId", requireAdmin, (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const [updated] = await db
      .update(gamesTable)
      .set({ status: "cancelled" })
      .where(eq(gamesTable.id, gameId))
      .returning();
    if (!updated) {
      res.status(404).json({ message: "Game not found" });
      return;
    }
    await db.insert(activityTable).values({
      type: "game_cancelled",
      message: `Game cancelled: ${updated.title}`,
      gameId: updated.id,
      gameTitle: updated.title,
    });

    void sendPushToGame(updated.id, "all", {
      title: `Cancelled: ${updated.title}`,
      body: `The game on ${updated.date} at ${updated.startTime} has been cancelled.`,
      url: `/games/${updated.id}`,
      tag: `game-${updated.id}`,
    });

    res.json({ ok: true });
  })();
});

export default router;
