import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, gamesTable, gameInvitesTable } from "@workspace/db";
import { requireAdmin, generatePlayerToken } from "../lib/auth";

const router: IRouter = Router();

router.get("/games/:gameId/invites", requireAdmin, (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const invites = await db
      .select()
      .from(gameInvitesTable)
      .where(eq(gameInvitesTable.gameId, gameId))
      .orderBy(gameInvitesTable.createdAt);
    res.json(
      invites.map((inv) => ({
        id: inv.id,
        gameId: inv.gameId,
        name: inv.name,
        phone: inv.phone ?? null,
        token: inv.token,
        used: inv.usedAt !== null,
        usedAt: inv.usedAt?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
      }))
    );
  })();
});

router.post("/games/:gameId/invites", requireAdmin, (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const { name, phone } = req.body as { name?: string; phone?: string };
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ message: "name is required" });
      return;
    }
    const [game] = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, gameId))
      .limit(1);
    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }
    const token = generatePlayerToken();
    const [inv] = await db
      .insert(gameInvitesTable)
      .values({
        gameId,
        name: name.trim(),
        phone: phone?.trim() || null,
        token,
      })
      .returning();
    res.status(201).json({
      id: inv.id,
      gameId: inv.gameId,
      name: inv.name,
      phone: inv.phone ?? null,
      token: inv.token,
      used: inv.usedAt !== null,
      usedAt: inv.usedAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
    });
  })();
});

router.get("/invites/lookup", (req, res) => {
  void (async () => {
    const token = String(req.query.token ?? "");
    if (!token) {
      res.status(400).json({ message: "token is required" });
      return;
    }
    const [inv] = await db
      .select()
      .from(gameInvitesTable)
      .where(eq(gameInvitesTable.token, token))
      .limit(1);
    if (!inv) {
      res.status(404).json({ message: "Invite not found" });
      return;
    }
    if (inv.usedAt !== null) {
      res.status(410).json({ message: "This invite link has already been used" });
      return;
    }
    const [game] = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, inv.gameId))
      .limit(1);
    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }
    res.json({
      id: inv.id,
      gameId: inv.gameId,
      gameTitle: game.title,
      gameDate: game.date,
      gameStartTime: game.startTime,
      name: inv.name,
      phone: inv.phone ?? null,
      used: false,
    });
  })();
});

router.delete("/invites/:inviteId", requireAdmin, (req, res) => {
  void (async () => {
    const inviteId = String(req.params.inviteId);
    const [deleted] = await db
      .delete(gameInvitesTable)
      .where(eq(gameInvitesTable.id, inviteId))
      .returning();
    if (!deleted) {
      res.status(404).json({ message: "Invite not found" });
      return;
    }
    res.status(204).send();
  })();
});

export default router;
