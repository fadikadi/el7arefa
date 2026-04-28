import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  gamesTable,
  registrationsTable,
  teamAssignmentsTable,
  activityTable,
  gameInvitesTable,
  playersTable,
} from "@workspace/db";
import {
  JoinGameBody,
  UpdateRegistrationStatusBody,
  LookupRegistrationQueryParams,
  WithdrawRegistrationBody,
  UpdateMyAttendanceBody,
} from "@workspace/api-zod";
import { requireAdmin, generatePlayerToken } from "../lib/auth";
import { toGameSummary, toRegistrationDTO } from "../lib/serializers";
import { sendPushToRegistration } from "../lib/push";

const router: IRouter = Router();

router.get("/games/:gameId/registrations", requireAdmin, (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const regs = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.gameId, gameId))
      .orderBy(registrationsTable.createdAt);
    const assignments = await db
      .select()
      .from(teamAssignmentsTable);
    const teamMap = new Map(
      assignments.map((a) => [a.registrationId, a.teamId]),
    );
    res.json(regs.map((r) => toRegistrationDTO(r, teamMap.get(r.id) ?? null)));
  })();
});

router.post("/games/:gameId/registrations", (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const parsed = JoinGameBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const { phone, email, attendance, inviteToken, playerPhone } = parsed.data;
    let { name } = parsed.data;

    // Validate and consume invite token if provided
    let inviteRow: typeof gameInvitesTable.$inferSelect | null = null;
    let playerRow: typeof playersTable.$inferSelect | null = null;

    if (playerPhone && !inviteToken) {
      const normalised = playerPhone.trim().replace(/\s+/g, "");
      const [found] = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.phone, normalised))
        .limit(1);
      if (!found) {
        res.status(404).json({ message: "Phone number not found in the player roster. Ask the admin to add you." });
        return;
      }
      // Prevent duplicate registration for the same game
      const [existing] = await db
        .select()
        .from(registrationsTable)
        .where(and(eq(registrationsTable.gameId, gameId), eq(registrationsTable.playerId, found.id)))
        .limit(1);
      if (existing) {
        res.status(409).json({ message: "You are already registered for this game.", registrationToken: existing.token });
        return;
      }
      playerRow = found;
      name = found.name; // lock name to player roster name
    }

    if (inviteToken) {
      const [inv] = await db
        .select()
        .from(gameInvitesTable)
        .where(eq(gameInvitesTable.token, inviteToken))
        .limit(1);
      if (!inv) {
        res.status(404).json({ message: "Invite not found" });
        return;
      }
      if (inv.gameId !== gameId) {
        res.status(400).json({ message: "Invite is for a different game" });
        return;
      }
      if (inv.usedAt !== null) {
        res.status(410).json({ message: "This invite link has already been used" });
        return;
      }
      inviteRow = inv;
      name = inv.name; // lock name to invite
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
    if (game.status === "cancelled") {
      res.status(400).json({ message: "Game has been cancelled" });
      return;
    }

    // Roster players and invite players are always approved
    const joinStatus = (playerRow || inviteRow || game.autoApprove) ? "approved" : "pending";
    const token = generatePlayerToken();
    const [reg] = await db
      .insert(registrationsTable)
      .values({
        gameId,
        playerId: playerRow?.id ?? null,
        name,
        phone: playerRow?.phone ?? phone ?? null,
        email: email ?? null,
        status: joinStatus,
        attendance: attendance ?? "confirmed",
        token,
      })
      .returning();

    // Mark invite as used (atomic with registration creation)
    if (inviteRow) {
      await db
        .update(gameInvitesTable)
        .set({ usedAt: new Date() })
        .where(eq(gameInvitesTable.id, inviteRow.id));
    }

    const autoApproved = playerRow || inviteRow || game.autoApprove;
    await db.insert(activityTable).values({
      type: autoApproved ? "approval" : "registration",
      message: playerRow
        ? `${reg.name} joined (verified player)`
        : inviteRow
          ? `${reg.name} joined via invite link`
          : game.autoApprove
            ? `${reg.name} joined (auto-approved)`
            : `${reg.name} requested to join`,
      gameId: game.id,
      gameTitle: game.title,
    });

    const [{ approvedCount, pendingCount }] = await db
      .select({
        approvedCount: sql<number>`coalesce(sum(case when ${registrationsTable.status} = 'approved' then 1 else 0 end), 0)::int`,
        pendingCount: sql<number>`coalesce(sum(case when ${registrationsTable.status} = 'pending' then 1 else 0 end), 0)::int`,
      })
      .from(registrationsTable)
      .where(eq(registrationsTable.gameId, gameId));

    res.status(201).json({
      registration: toRegistrationDTO(reg, null),
      game: toGameSummary(game, approvedCount, pendingCount),
      token,
    });
  })();
});

router.patch("/registrations/:registrationId", requireAdmin, (req, res) => {
  void (async () => {
    const registrationId = String(req.params.registrationId);
    const parsed = UpdateRegistrationStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const newStatus = parsed.data.status;
    if (newStatus === "withdrawn") {
      res.status(400).json({
        message: "Players withdraw via /registrations/withdraw",
      });
      return;
    }

    const [updated] = await db
      .update(registrationsTable)
      .set({ status: newStatus })
      .where(eq(registrationsTable.id, registrationId))
      .returning();
    if (!updated) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    // If player was rejected and they had a team assignment, remove it
    if (newStatus === "rejected") {
      await db
        .delete(teamAssignmentsTable)
        .where(eq(teamAssignmentsTable.registrationId, updated.id));
    }

    const [game] = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, updated.gameId))
      .limit(1);

    await db.insert(activityTable).values({
      type: newStatus === "approved" ? "approval" : newStatus === "rejected" ? "rejection" : "registration",
      message:
        newStatus === "approved"
          ? `${updated.name} approved`
          : newStatus === "rejected"
            ? `${updated.name} rejected`
            : `${updated.name} marked pending`,
      gameId: updated.gameId,
      gameTitle: game?.title ?? null,
    });

    const [assignment] = await db
      .select()
      .from(teamAssignmentsTable)
      .where(eq(teamAssignmentsTable.registrationId, updated.id))
      .limit(1);

    if (game && (newStatus === "approved" || newStatus === "rejected")) {
      void sendPushToRegistration(updated.id, {
        title:
          newStatus === "approved"
            ? `You're in! ${game.title}`
            : `Update: ${game.title}`,
        body:
          newStatus === "approved"
            ? `Approved for ${game.title} on ${game.date} at ${game.startTime}.`
            : `Your spot for ${game.title} wasn't approved this time.`,
        url: `/games/${game.id}`,
        tag: `reg-${updated.id}`,
      });
    }

    res.json(toRegistrationDTO(updated, assignment?.teamId ?? null));
  })();
});

router.post("/registrations/withdraw", (req, res) => {
  void (async () => {
    const parsed = WithdrawRegistrationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const { token } = parsed.data;

    const [reg] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.token, token))
      .limit(1);
    if (!reg) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    const [game] = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, reg.gameId))
      .limit(1);

    const updated = await db.transaction(async (tx) => {
      const [u] = await tx
        .update(registrationsTable)
        .set({ status: "withdrawn" })
        .where(eq(registrationsTable.id, reg.id))
        .returning();
      await tx
        .delete(teamAssignmentsTable)
        .where(eq(teamAssignmentsTable.registrationId, reg.id));
      await tx.insert(activityTable).values({
        type: "registration",
        message: `${reg.name} withdrew`,
        gameId: reg.gameId,
        gameTitle: game?.title ?? null,
      });
      return u;
    });

    res.json(toRegistrationDTO(updated, null));
  })();
});

router.patch("/registrations/me/attendance", (req, res) => {
  void (async () => {
    const parsed = UpdateMyAttendanceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const { token, attendance } = parsed.data;

    const [reg] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.token, token))
      .limit(1);
    if (!reg) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }
    if (reg.status === "withdrawn") {
      res
        .status(400)
        .json({ message: "Already withdrawn — re-join to attend" });
      return;
    }

    const [updated] = await db
      .update(registrationsTable)
      .set({ attendance })
      .where(eq(registrationsTable.id, reg.id))
      .returning();

    const [assignment] = await db
      .select()
      .from(teamAssignmentsTable)
      .where(eq(teamAssignmentsTable.registrationId, reg.id))
      .limit(1);

    res.json(toRegistrationDTO(updated, assignment?.teamId ?? null));
  })();
});

router.get("/registrations/lookup", (req, res) => {
  void (async () => {
    const parsed = LookupRegistrationQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid token" });
      return;
    }
    const token = parsed.data.token;

    const [reg] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.token, token))
      .limit(1);
    if (!reg) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    const [game] = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, reg.gameId))
      .limit(1);
    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    const [{ approvedCount, pendingCount }] = await db
      .select({
        approvedCount: sql<number>`coalesce(sum(case when ${registrationsTable.status} = 'approved' then 1 else 0 end), 0)::int`,
        pendingCount: sql<number>`coalesce(sum(case when ${registrationsTable.status} = 'pending' then 1 else 0 end), 0)::int`,
      })
      .from(registrationsTable)
      .where(eq(registrationsTable.gameId, game.id));

    const [assignment] = await db
      .select()
      .from(teamAssignmentsTable)
      .where(eq(teamAssignmentsTable.registrationId, reg.id))
      .limit(1);

    res.json({
      registration: toRegistrationDTO(reg, assignment?.teamId ?? null),
      game: toGameSummary(game, approvedCount, pendingCount),
      token,
    });
  })();
});

export default router;
