import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  gamesTable,
  notificationsTable,
  registrationsTable,
  activityTable,
} from "@workspace/db";
import { SendGameNotificationBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { toNotificationDTO } from "../lib/serializers";
import { sendPushToGame } from "../lib/push";

const router: IRouter = Router();

router.get("/games/:gameId/notifications", (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.gameId, gameId))
      .orderBy(desc(notificationsTable.createdAt));
    res.json(rows.map(toNotificationDTO));
  })();
});

router.post("/games/:gameId/notifications", requireAdmin, (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const parsed = SendGameNotificationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const { title, message, audience = "all" } = parsed.data;

    const [game] = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, gameId))
      .limit(1);
    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    const [{ count }] = await db
      .select({
        count: sql<number>`coalesce(count(*), 0)::int`,
      })
      .from(registrationsTable)
      .where(
        audience === "all"
          ? eq(registrationsTable.gameId, gameId)
          : sql`${registrationsTable.gameId} = ${gameId} AND ${registrationsTable.status} = ${audience}`,
      );

    const [n] = await db
      .insert(notificationsTable)
      .values({
        gameId,
        title: title ?? null,
        message,
        audience,
        recipientCount: count,
      })
      .returning();

    await db.insert(activityTable).values({
      type: "notification_sent",
      message: `Notification sent to ${count} player${count === 1 ? "" : "s"}`,
      gameId: game.id,
      gameTitle: game.title,
    });

    void sendPushToGame(gameId, audience, {
      title: title ?? game.title,
      body: message,
      url: `/games/${gameId}`,
      tag: `notif-${n.id}`,
    });

    res.status(201).json(toNotificationDTO(n));
  })();
});

export default router;
