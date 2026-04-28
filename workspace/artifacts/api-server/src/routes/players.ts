import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const isDuplicatePhone = (err: unknown): boolean => {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
};

const toDTO = (p: typeof playersTable.$inferSelect) => ({
  id: p.id,
  name: p.name,
  phone: p.phone,
  notes: p.notes ?? null,
  createdAt: p.createdAt.toISOString(),
});

router.get("/players", requireAdmin, (req, res) => {
  void (async () => {
    const players = await db
      .select()
      .from(playersTable)
      .orderBy(playersTable.name);
    res.json(players.map(toDTO));
  })();
});

router.post("/players", requireAdmin, (req, res) => {
  void (async () => {
    const { name, phone, notes } = req.body as { name?: string; phone?: string; notes?: string };
    if (!name?.trim() || !phone?.trim()) {
      res.status(400).json({ message: "name and phone are required" });
      return;
    }
    const normalised = phone.trim().replace(/\s+/g, "");
    try {
      const [player] = await db
        .insert(playersTable)
        .values({ name: name.trim(), phone: normalised, notes: notes?.trim() || null })
        .returning();
      res.status(201).json(toDTO(player));
    } catch (err: unknown) {
      if (isDuplicatePhone(err)) {
        res.status(409).json({ message: "A player with this phone number already exists" });
        return;
      }
      throw err;
    }
  })();
});

router.get("/players/lookup", (req, res) => {
  void (async () => {
    const raw = String(req.query.phone ?? "").trim().replace(/\s+/g, "");
    if (!raw) {
      res.status(400).json({ message: "phone is required" });
      return;
    }
    const [player] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.phone, raw))
      .limit(1);
    if (!player) {
      res.status(404).json({ message: "Player not found" });
      return;
    }
    res.json(toDTO(player));
  })();
});

router.patch("/players/:playerId", requireAdmin, (req, res) => {
  void (async () => {
    const { playerId } = req.params;
    const { name, phone, notes } = req.body as { name?: string; phone?: string; notes?: string };
    const updates: Partial<typeof playersTable.$inferInsert> = {};
    if (name?.trim()) updates.name = name.trim();
    if (phone?.trim()) updates.phone = phone.trim().replace(/\s+/g, "");
    if ("notes" in req.body) updates.notes = notes?.trim() || null;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: "Nothing to update" });
      return;
    }
    try {
      const [updated] = await db
        .update(playersTable)
        .set(updates)
        .where(eq(playersTable.id, playerId))
        .returning();
      if (!updated) {
        res.status(404).json({ message: "Player not found" });
        return;
      }
      res.json(toDTO(updated));
    } catch (err: unknown) {
      if (isDuplicatePhone(err)) {
        res.status(409).json({ message: "A player with this phone number already exists" });
        return;
      }
      throw err;
    }
  })();
});

router.delete("/players/:playerId", requireAdmin, (req, res) => {
  void (async () => {
    const { playerId } = req.params;
    const [deleted] = await db
      .delete(playersTable)
      .where(eq(playersTable.id, playerId))
      .returning();
    if (!deleted) {
      res.status(404).json({ message: "Player not found" });
      return;
    }
    res.status(204).send();
  })();
});

export default router;
