import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/** Checks Neon/DATABASE_URL and whether Drizzle schema was applied (games table). Registered on `app` (see app.ts) so Express 5 nested routers cannot miss the path. */
export async function dbStatusHandler(_req: Request, res: Response): Promise<void> {
  try {
    await pool.query("SELECT 1");
    const r = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'games'
      ) AS exists
    `);
    const gamesPresent = Boolean(r.rows[0]?.exists);
    res.json({
      ok: true,
      database: "connected",
      games_table_present: gamesPresent,
      next_step: gamesPresent
        ? null
        : "Apply schema: GitHub Actions → Neon — schema push and seed, or pnpm --filter @workspace/db run push",
    });
  } catch (err) {
    res.json({
      ok: false,
      database: "connection_failed",
      message: err instanceof Error ? err.message : String(err),
      next_step:
        "Fix DATABASE_URL on Render (Neon URI). Redeploy after saving Environment.",
    });
  }
}

export default router;
