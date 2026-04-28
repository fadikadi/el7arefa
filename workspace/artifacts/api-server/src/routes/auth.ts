import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminsTable } from "@workspace/db";
import { AdminLoginBody } from "@workspace/api-zod";
import {
  createSession,
  destroySession,
  getAdminFromRequest,
  setSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  verifyPassword,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", (req, res) => {
  void (async () => {
    const parsed = AdminLoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const { username, password } = parsed.data;

    const rows = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.username, username))
      .limit(1);
    const admin = rows[0];
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      res.status(401).json({ message: "Invalid username or password" });
      return;
    }

    const sessionId = await createSession(admin.id);
    setSessionCookie(res, sessionId);
    res.json({ authenticated: true, username: admin.username });
  })();
});

router.post("/auth/logout", (req, res) => {
  void (async () => {
    const sid = readSessionCookie(req);
    if (sid) await destroySession(sid);
    clearSessionCookie(res);
    res.json({ ok: true });
  })();
});

router.get("/auth/me", (req, res) => {
  void (async () => {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      res.json({ authenticated: false, username: null });
      return;
    }
    res.json({ authenticated: true, username: admin.username });
  })();
});

export default router;
