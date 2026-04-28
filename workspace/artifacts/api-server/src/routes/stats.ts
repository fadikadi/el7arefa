import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  gamesTable,
  registrationsTable,
  activityTable,
} from "@workspace/db";
import { toActivityDTO, toGameSummary } from "../lib/serializers";

const router: IRouter = Router();

router.get("/stats/dashboard", (_req, res) => {
  void (async () => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [{ totalGames }] = await db
      .select({ totalGames: sql<number>`coalesce(count(*), 0)::int` })
      .from(gamesTable);

    const [{ upcomingGames }] = await db
      .select({ upcomingGames: sql<number>`coalesce(count(*), 0)::int` })
      .from(gamesTable)
      .where(gte(gamesTable.date, today));

    const [{ pendingApprovals }] = await db
      .select({ pendingApprovals: sql<number>`coalesce(count(*), 0)::int` })
      .from(registrationsTable)
      .where(eq(registrationsTable.status, "pending"));

    const [{ approvedPlayersThisWeek }] = await db
      .select({
        approvedPlayersThisWeek: sql<number>`coalesce(count(*), 0)::int`,
      })
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.status, "approved"),
          gte(registrationsTable.createdAt, weekAgo),
        ),
      );

    const upcomingList = await db
      .select()
      .from(gamesTable)
      .where(gte(gamesTable.date, today))
      .orderBy(gamesTable.date, gamesTable.startTime)
      .limit(1);

    let nextGame = null;
    if (upcomingList[0]) {
      const g = upcomingList[0];
      const [counts] = await db
        .select({
          approved: sql<number>`coalesce(sum(case when ${registrationsTable.status} = 'approved' then 1 else 0 end), 0)::int`,
          pending: sql<number>`coalesce(sum(case when ${registrationsTable.status} = 'pending' then 1 else 0 end), 0)::int`,
        })
        .from(registrationsTable)
        .where(eq(registrationsTable.gameId, g.id));
      nextGame = toGameSummary(g, counts.approved, counts.pending);
    }

    res.json({
      totalGames,
      upcomingGames,
      pendingApprovals,
      approvedPlayersThisWeek,
      nextGame,
    });
  })();
});

router.get("/stats/activity", (_req, res) => {
  void (async () => {
    const rows = await db
      .select()
      .from(activityTable)
      .orderBy(desc(activityTable.createdAt))
      .limit(20);
    res.json(rows.map(toActivityDTO));
  })();
});

export default router;
