import crypto from "node:crypto";
import { type Request, type Response, type NextFunction } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, adminSessionsTable, adminsTable } from "@workspace/db";

const SESSION_COOKIE = "mf_admin_session";
const SESSION_TTL_DAYS = 30;

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function newSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(adminId: string): Promise<string> {
  const id = newSessionId();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  await db.insert(adminSessionsTable).values({ id, adminId, expiresAt });
  return id;
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.delete(adminSessionsTable).where(eq(adminSessionsTable.id, sessionId));
}

export interface AdminContext {
  id: string;
  username: string;
}

export async function getAdminFromRequest(
  req: Request,
): Promise<AdminContext | null> {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId || typeof sessionId !== "string") return null;

  const rows = await db
    .select({
      id: adminsTable.id,
      username: adminsTable.username,
    })
    .from(adminSessionsTable)
    .innerJoin(adminsTable, eq(adminsTable.id, adminSessionsTable.adminId))
    .where(
      and(
        eq(adminSessionsTable.id, sessionId),
        gt(adminSessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export function setSessionCookie(res: Response, sessionId: string): void {
  const prod = process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: prod,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function readSessionCookie(req: Request): string | null {
  const v = req.cookies?.[SESSION_COOKIE];
  return typeof v === "string" ? v : null;
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void (async () => {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    (req as Request & { admin: AdminContext }).admin = admin;
    next();
  })();
}

export function generatePlayerToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
