import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, pushSubscriptionsTable, registrationsTable } from "@workspace/db";
import { z } from "zod";
import { getPublicKey, initPush } from "../lib/push";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SubscribeBody = z.object({
  registrationToken: z.string().min(1),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

const UnsubscribeBody = z.object({
  endpoint: z.string().url(),
});

router.get("/push/public-key", (_req, res) => {
  void (async () => {
    let key = getPublicKey();
    if (!key) {
      try {
        key = await initPush();
      } catch (err) {
        logger.error({ err }, "Failed to init push");
        res.status(500).json({ message: "Push not available" });
        return;
      }
    }
    res.json({ publicKey: key });
  })();
});

router.post("/push/subscribe", (req, res) => {
  void (async () => {
    const parsed = SubscribeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid subscription" });
      return;
    }
    const { registrationToken, subscription } = parsed.data;

    const [reg] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.token, registrationToken))
      .limit(1);
    if (!reg) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    await db
      .insert(pushSubscriptionsTable)
      .values({
        registrationId: reg.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: {
          registrationId: reg.id,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });

    res.status(201).json({ ok: true });
  })();
});

router.post("/push/unsubscribe", (req, res) => {
  void (async () => {
    const parsed = UnsubscribeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid endpoint" });
      return;
    }
    await db
      .delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, parsed.data.endpoint));
    res.json({ ok: true });
  })();
});

export default router;
