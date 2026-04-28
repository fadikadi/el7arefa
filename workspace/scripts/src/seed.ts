import crypto from "node:crypto";
import {
  db,
  pool,
  adminsTable,
  gamesTable,
  registrationsTable,
  activityTable,
} from "@workspace/db";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function token(): string {
  return crypto.randomBytes(24).toString("hex");
}

async function main() {
  // Admin
  const adminRows = await db.select().from(adminsTable);
  if (adminRows.length === 0) {
    await db.insert(adminsTable).values({
      username: "admin",
      passwordHash: hashPassword("football"),
    });
    console.log("Seeded admin (username: admin / password: football)");
  } else {
    console.log("Admin already present, skipping");
  }

  const gamesExisting = await db.select().from(gamesTable);
  if (gamesExisting.length > 0) {
    console.log("Games already present, skipping seed.");
    await pool.end();
    return;
  }

  const insertedGames = await db
    .insert(gamesTable)
    .values([
      {
        title: "Saturday Kickabout",
        date: dateOffset(2),
        startTime: "18:00",
        endTime: "19:30",
        location: "Riverside Pitch 3",
        slots: 10,
        notes: "5-a-side. Bring both shirts.",
        status: "open",
      },
      {
        title: "Midweek 7s",
        date: dateOffset(5),
        startTime: "20:00",
        endTime: "21:00",
        location: "Greenfield Astro 1",
        slots: 14,
        notes: "Astro turf. No metal studs.",
        status: "open",
      },
      {
        title: "Sunday Cup Friendly",
        date: dateOffset(9),
        startTime: "11:00",
        endTime: "12:30",
        location: "Central Park East",
        slots: 12,
        notes: "Friendly tournament — 3 teams of 4.",
        status: "open",
      },
    ])
    .returning();

  for (const g of insertedGames) {
    await db.insert(activityTable).values({
      type: "game_created",
      message: `New game created: ${g.title}`,
      gameId: g.id,
      gameTitle: g.title,
    });
  }

  // Seed players for first game
  const first = insertedGames[0]!;
  const samplePlayers = [
    { name: "Alex Morgan", status: "approved" },
    { name: "Sam Rivera", status: "approved" },
    { name: "Jordan Park", status: "approved" },
    { name: "Casey Lin", status: "approved" },
    { name: "Drew Patel", status: "approved" },
    { name: "Robin Cole", status: "approved" },
    { name: "Taylor Reed", status: "pending" },
    { name: "Jamie Quinn", status: "pending" },
  ];
  for (const p of samplePlayers) {
    const [r] = await db
      .insert(registrationsTable)
      .values({
        gameId: first.id,
        name: p.name,
        status: p.status,
        token: token(),
      })
      .returning();
    await db.insert(activityTable).values({
      type: p.status === "approved" ? "approval" : "registration",
      message:
        p.status === "approved"
          ? `${r.name} approved`
          : `${r.name} requested to join`,
      gameId: first.id,
      gameTitle: first.title,
    });
  }

  // A couple of pending for second game
  const second = insertedGames[1]!;
  for (const name of ["Morgan Hayes", "Pat O'Connor", "Riley James"]) {
    const [r] = await db
      .insert(registrationsTable)
      .values({
        gameId: second.id,
        name,
        status: "pending",
        token: token(),
      })
      .returning();
    await db.insert(activityTable).values({
      type: "registration",
      message: `${r.name} requested to join`,
      gameId: second.id,
      gameTitle: second.title,
    });
  }

  console.log("Seeded games and players");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
