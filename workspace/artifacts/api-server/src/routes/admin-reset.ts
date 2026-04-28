import { Router, type IRouter } from "express";
import { db, gamesTable, registrationsTable, playersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.post("/admin/reset-data", requireAdmin, (_req, res) => {
  void (async () => {
    await db.execute(sql`DELETE FROM motm_votes`);
    await db.execute(sql`DELETE FROM game_invites`);
    await db.execute(sql`DELETE FROM registrations`);
    await db.execute(sql`DELETE FROM games`);
    await db.execute(sql`DELETE FROM players`);
    await db.execute(sql`DELETE FROM push_subscriptions`);
    res.json({ ok: true, message: "All data cleared" });
  })();
});

export default router;
