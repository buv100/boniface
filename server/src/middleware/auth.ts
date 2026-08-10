import { createHash, randomBytes, randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { db } from "../db";
import { managers, sessions, subscriptions, venues } from "../db/schema";

const SESSION_DAYS = 90;

export type AuthRole = "manager" | "employee";

export interface AuthUser {
  sessionId: string;
  venueId: string;
  role: AuthRole;
  managerId?: string;
  employeeId?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      token?: string;
    }
  }
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "boniface-dev-secret-change-me";
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "").trim();
}

export function questionHint(question: string | null | undefined): string | undefined {
  if (!question) return undefined;
  const q = question.trim();
  if (q.length <= 4) return "****";
  return `${q.slice(0, 2)}${"*".repeat(Math.min(8, q.length - 2))}${q.slice(-1)}`;
}

interface TokenPayload {
  sid: string;
  venueId: string;
  role: AuthRole;
  managerId?: string;
  employeeId?: string;
}

export async function createSession(opts: {
  venueId: string;
  managerId?: string;
  employeeId?: string;
  role: AuthRole;
}): Promise<string> {
  const sessionId = newId();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  const expiresAt = expires.toISOString();

  const payload: TokenPayload = {
    sid: sessionId,
    venueId: opts.venueId,
    role: opts.role,
    managerId: opts.managerId,
    employeeId: opts.employeeId,
  };

  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: `${SESSION_DAYS}d` });
  const createdAt = nowIso();

  db.insert(sessions)
    .values({
      id: sessionId,
      managerId: opts.managerId ?? null,
      employeeId: opts.employeeId ?? null,
      venueId: opts.venueId,
      tokenHash: hashToken(token),
      expiresAt,
      createdAt,
    })
    .run();

  return token;
}

export async function destroySession(sessionId: string): Promise<void> {
  db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as TokenPayload;
    const row = db.select().from(sessions).where(eq(sessions.id, payload.sid)).get();
    if (!row) {
      res.status(401).json({ error: "Session expired" });
      return;
    }
    if (row.tokenHash !== hashToken(token)) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    if (new Date(row.expiresAt).getTime() < Date.now()) {
      db.delete(sessions).where(eq(sessions.id, row.id)).run();
      res.status(401).json({ error: "Session expired" });
      return;
    }

    req.token = token;
    req.auth = {
      sessionId: payload.sid,
      venueId: payload.venueId,
      role: payload.role,
      managerId: payload.managerId,
      employeeId: payload.employeeId,
    };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

/** Attach auth if present; never block anonymous assistant chats. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as TokenPayload;
    const row = db.select().from(sessions).where(eq(sessions.id, payload.sid)).get();
    if (
      row &&
      row.tokenHash === hashToken(token) &&
      new Date(row.expiresAt).getTime() >= Date.now()
    ) {
      req.token = token;
      req.auth = {
        sessionId: payload.sid,
        venueId: payload.venueId,
        role: payload.role,
        managerId: payload.managerId,
        employeeId: payload.employeeId,
      };
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "manager" || !req.auth.managerId) {
      res.status(403).json({ error: "Manager access required" });
      return;
    }
    next();
  });
}

export function requireEmployee(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "employee" || !req.auth.employeeId) {
      res.status(403).json({ error: "Employee access required" });
      return;
    }
    next();
  });
}

/** Soft gate: managers with expired subscription cannot mutate critical cloud resources */
export function requireActiveSubscription(req: Request, res: Response, next: NextFunction): void {
  requireManager(req, res, () => {
    const sub = db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.venueId, req.auth!.venueId))
      .get();
    const expired =
      !sub ||
      sub.status === "expired" ||
      new Date(sub.expiresAt).getTime() < Date.now();
    if (expired) {
      // Employees never hit this; managers get a clear error
      res.status(402).json({
        error: "Subscription expired",
        code: "SUBSCRIPTION_EXPIRED",
      });
      return;
    }
    next();
  });
}

export function publicManager(manager: typeof managers.$inferSelect) {
  return {
    id: manager.id,
    venueId: manager.venueId,
    name: manager.name,
    phone: manager.phone,
    createdAt: manager.createdAt,
  };
}

export function publicVenue(venue: typeof venues.$inferSelect) {
  return {
    id: venue.id,
    name: venue.name,
    currency: venue.currency,
    timezone: venue.timezone,
    createdAt: venue.createdAt,
    updatedAt: venue.updatedAt,
  };
}

export function randomInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}
