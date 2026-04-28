import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  appSettingsTable,
  pushSubscriptionsTable,
  registrationsTable,
} from "@workspace/db";
import { logger } from "./logger";

const VAPID_SUBJECT = "mailto:admin@minifootball.app";
const KEY_PUBLIC = "vapid_public_key";
const KEY_PRIVATE = "vapid_private_key";

let cachedPublicKey: string | null = null;
let initialized = false;

export async function initPush(): Promise<string> {
  if (cachedPublicKey && initialized) return cachedPublicKey;

  const rows = await db
    .select()
    .from(appSettingsTable)
    .where(inArray(appSettingsTable.key, [KEY_PUBLIC, KEY_PRIVATE]));

  let publicKey = rows.find((r) => r.key === KEY_PUBLIC)?.value;
  let privateKey = rows.find((r) => r.key === KEY_PRIVATE)?.value;

  if (!publicKey || !privateKey) {
    const generated = webpush.generateVAPIDKeys();
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    await db
      .insert(appSettingsTable)
      .values([
        { key: KEY_PUBLIC, value: publicKey },
        { key: KEY_PRIVATE, value: privateKey },
      ])
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: { value: publicKey, updatedAt: new Date() },
      });
    logger.info("Generated VAPID keys and stored in app_settings");
  }

  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
  cachedPublicKey = publicKey;
  initialized = true;
  return publicKey;
}

export function getPublicKey(): string | null {
  return cachedPublicKey;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

async function sendToSubscriptions(
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload,
) {
  if (!initialized) await initPush();
  const json = JSON.stringify(payload);
  const deadIds: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          json,
          { TTL: 60 * 60 * 24 },
        );
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          deadIds.push(s.id);
        } else {
          logger.warn(
            { err: e?.message, statusCode: e?.statusCode },
            "Push send failed",
          );
        }
      }
    }),
  );

  if (deadIds.length > 0) {
    await db
      .delete(pushSubscriptionsTable)
      .where(inArray(pushSubscriptionsTable.id, deadIds));
  }
}

export async function sendPushToRegistration(
  registrationId: string,
  payload: PushPayload,
): Promise<void> {
  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.registrationId, registrationId));
  if (subs.length === 0) return;
  await sendToSubscriptions(subs, payload);
}

export async function sendPushToGame(
  gameId: string,
  audience: "all" | "approved" | "pending",
  payload: PushPayload,
): Promise<void> {
  const regs = await db
    .select({ id: registrationsTable.id, status: registrationsTable.status })
    .from(registrationsTable)
    .where(eq(registrationsTable.gameId, gameId));

  const targetIds = regs
    .filter((r) =>
      audience === "all" ? true : r.status === audience,
    )
    .map((r) => r.id);

  if (targetIds.length === 0) return;

  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(inArray(pushSubscriptionsTable.registrationId, targetIds));

  if (subs.length === 0) return;
  await sendToSubscriptions(subs, payload);
}
