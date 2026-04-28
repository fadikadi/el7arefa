import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  gamesTable,
  registrationsTable,
  motmVotesTable,
} from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const VoteBody = z.object({
  token: z.string().min(1),
  votedRegistrationId: z.string().uuid(),
});

const TokenQuery = z.object({ token: z.string().optional() });

function isGameFinished(date: string, endTime: string): boolean {
  const endIso = `${date}T${endTime.length === 5 ? endTime : endTime.slice(0, 5)}:00`;
  const ts = Date.parse(endIso);
  if (Number.isNaN(ts)) return false;
  return Date.now() >= ts;
}

async function loadResults(gameId: string, voterRegistrationId: string | null) {
  const rows = await db
    .select({
      playerId: registrationsTable.id,
      name: registrationsTable.name,
      votes: sql<number>`coalesce(count(${motmVotesTable.id}), 0)::int`,
    })
    .from(registrationsTable)
    .leftJoin(
      motmVotesTable,
      and(
        eq(motmVotesTable.votedRegistrationId, registrationsTable.id),
        eq(motmVotesTable.gameId, gameId),
      ),
    )
    .where(
      and(
        eq(registrationsTable.gameId, gameId),
        eq(registrationsTable.status, "approved"),
      ),
    )
    .groupBy(registrationsTable.id, registrationsTable.name)
    .orderBy(
      sql`coalesce(count(${motmVotesTable.id}), 0) DESC`,
      registrationsTable.name,
    );

  const tallies = rows.map((r) => ({
    playerId: r.playerId,
    name: r.name,
    votes: r.votes,
  }));
  const totalVotes = tallies.reduce((s, t) => s + t.votes, 0);

  let myVote: string | null = null;
  if (voterRegistrationId) {
    const [v] = await db
      .select()
      .from(motmVotesTable)
      .where(
        and(
          eq(motmVotesTable.gameId, gameId),
          eq(motmVotesTable.voterRegistrationId, voterRegistrationId),
        ),
      )
      .limit(1);
    if (v) myVote = v.votedRegistrationId;
  }

  const winner =
    tallies.length > 0 && tallies[0].votes > 0 ? tallies[0] : null;

  return { tallies, totalVotes, myVote, hasVoted: !!myVote, winner };
}

router.get("/games/:gameId/motm", (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const parsed = TokenQuery.safeParse(req.query);
    const token = parsed.success ? parsed.data.token : undefined;

    const [game] = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, gameId))
      .limit(1);
    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    let voterRegistrationId: string | null = null;
    let canVote = false;

    if (token) {
      const [reg] = await db
        .select()
        .from(registrationsTable)
        .where(
          and(
            eq(registrationsTable.token, token),
            eq(registrationsTable.gameId, gameId),
          ),
        )
        .limit(1);
      if (reg && reg.status === "approved") {
        voterRegistrationId = reg.id;
        canVote = true;
      }
    }

    const finished = isGameFinished(game.date, game.endTime);
    const results = await loadResults(gameId, voterRegistrationId);

    res.json({
      finished,
      cancelled: game.status === "cancelled",
      canVote: canVote && finished && game.status !== "cancelled",
      ...results,
    });
  })();
});

router.post("/games/:gameId/motm-vote", (req, res) => {
  void (async () => {
    const gameId = String(req.params.gameId);
    const parsed = VoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid vote" });
      return;
    }
    const { token, votedRegistrationId } = parsed.data;

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
      res.status(400).json({ message: "Game was cancelled" });
      return;
    }
    if (!isGameFinished(game.date, game.endTime)) {
      res.status(400).json({ message: "Voting opens after the game ends" });
      return;
    }

    const [voter] = await db
      .select()
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.token, token),
          eq(registrationsTable.gameId, gameId),
        ),
      )
      .limit(1);
    if (!voter || voter.status !== "approved") {
      res
        .status(403)
        .json({ message: "Only approved players for this game can vote" });
      return;
    }

    if (voter.id === votedRegistrationId) {
      res.status(400).json({ message: "You can't vote for yourself" });
      return;
    }

    const [voted] = await db
      .select()
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.id, votedRegistrationId),
          eq(registrationsTable.gameId, gameId),
        ),
      )
      .limit(1);
    if (!voted || voted.status !== "approved") {
      res
        .status(400)
        .json({ message: "That player isn't on the approved list" });
      return;
    }

    await db
      .insert(motmVotesTable)
      .values({
        gameId,
        voterRegistrationId: voter.id,
        votedRegistrationId,
      })
      .onConflictDoNothing({
        target: [motmVotesTable.gameId, motmVotesTable.voterRegistrationId],
      });

    const results = await loadResults(gameId, voter.id);
    res.status(201).json({
      finished: true,
      cancelled: false,
      canVote: true,
      ...results,
    });
  })();
});

export default router;
