import { createHash, randomBytes, randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { db } from "../db";
import {
  adminSessions,
  managers,
  organizations,
  orgSubscriptions,
  owners,
  platformAdmins,
  sessions,
  subscriptions,
  venues,
} from "../db/schema";

const SESSION_DAYS = 90;

export type AuthRole = "manager" | "employee" | "owner" | "platform_admin";

export interface AuthUser {
  sessionId: string;
  venueId: string;
  role: AuthRole;
  managerId?: string;
  employeeId?: string;
  ownerId?: string;
  organizationId?: string;
  platformAdminId?: string;
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
  venueId?: string;
  role: AuthRole;
  managerId?: string;
  employeeId?: string;
  ownerId?: string;
  organizationId?: string;
  platformAdminId?: string;
}

export async function createSession(opts: {
  venueId: string;
  managerId?: string;
  employeeId?: string;
  ownerId?: string;
  organizationId?: string;
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
    ownerId: opts.ownerId,
    organizationId: opts.organizationId,
  };

  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: `${SESSION_DAYS}d` });
  const createdAt = nowIso();

  db.insert(sessions)
    .values({
      id: sessionId,
      managerId: opts.managerId ?? null,
      employeeId: opts.employeeId ?? null,
      ownerId: opts.ownerId ?? null,
      organizationId: opts.organizationId ?? null,
      venueId: opts.venueId,
      tokenHash: hashToken(token),
      expiresAt,
      createdAt,
    })
    .run();

  return token;
}

export async function createAdminSession(
  adminId: string,
  expiresInDays = 30
): Promise<string> {
  const sessionId = newId();
  const payload: TokenPayload = {
    sid: sessionId,
    role: "platform_admin",
    platformAdminId: adminId,
  };
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: `${expiresInDays}d` });
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();

  db.insert(adminSessions)
    .values({
      id: sessionId,
      adminId,
      tokenHash: hashToken(token),
      expiresAt,
      createdAt,
    })
    .run();

  return token;
}

export async function destroySession(sessionId: string): Promise<void> {
  db.delete(sessions).where(eq(sessions.id, sessionId)).run();
  db.delete(adminSessions).where(eq(adminSessions.id, sessionId)).run();
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

    if (payload.role === "platform_admin") {
      const row = db.select().from(adminSessions).where(eq(adminSessions.id, payload.sid)).get();
      if (!row) {
        res.status(401).json({ error: "Session expired" });
        return;
      }
      if (row.tokenHash !== hashToken(token)) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
      if (new Date(row.expiresAt).getTime() < Date.now()) {
        db.delete(adminSessions).where(eq(adminSessions.id, row.id)).run();
        res.status(401).json({ error: "Session expired" });
        return;
      }
      req.token = token;
      req.auth = {
        sessionId: payload.sid,
        venueId: "",
        role: "platform_admin",
        platformAdminId: payload.platformAdminId,
      };
      next();
      return;
    }

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
      venueId: payload.venueId ?? row.venueId,
      role: payload.role,
      managerId: payload.managerId,
      employeeId: payload.employeeId,
      ownerId: payload.ownerId,
      organizationId: payload.organizationId,
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
        ownerId: payload.ownerId,
        organizationId: payload.organizationId,
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

export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "owner" || !req.auth.ownerId || !req.auth.organizationId) {
      res.status(403).json({ error: "Owner access required" });
      return;
    }
    next();
  });
}

export type OrgSubStatus = "active" | "past_due" | "suspended";

export interface OrgBilling {
  id: string | null;
  organizationId: string;
  status: OrgSubStatus;
  plan: string | null;
  expiresAt: string | null;
  notes: string | null;
  isActive: boolean;
}

export function getOrgBilling(organizationId: string): OrgBilling {
  const row = db
    .select()
    .from(orgSubscriptions)
    .where(eq(orgSubscriptions.organizationId, organizationId))
    .get();
  if (!row) {
    return {
      id: null,
      organizationId,
      status: "suspended",
      plan: null,
      expiresAt: null,
      notes: null,
      isActive: false,
    };
  }
  const status = (row.status as OrgSubStatus) || "suspended";
  const notExpired = new Date(row.expiresAt).getTime() > Date.now();
  const isActive = status === "active" && notExpired;
  return {
    id: row.id,
    organizationId,
    status,
    plan: row.plan,
    expiresAt: row.expiresAt,
    notes: row.notes,
    isActive,
  };
}

export function publicOrgSubscription(billing: OrgBilling) {
  return {
    id: billing.id,
    status: billing.status,
    plan: billing.plan,
    expiresAt: billing.expiresAt,
    notes: billing.notes,
    isActive: billing.isActive,
  };
}

export function requirePaidOrg(req: Request, res: Response, next: NextFunction): void {
  const orgId = req.auth?.organizationId;
  if (!orgId) {
    res.status(402).json({
      error: "Subscription inactive",
      code: "SUBSCRIPTION_INACTIVE",
    });
    return;
  }
  const billing = getOrgBilling(orgId);
  if (!billing.isActive) {
    res.status(402).json({
      error: "Subscription inactive",
      code: "SUBSCRIPTION_INACTIVE",
      subscription: publicOrgSubscription(billing),
    });
    return;
  }
  next();
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "platform_admin" || !req.auth.platformAdminId) {
      res.status(403).json({ error: "Platform admin access required" });
      return;
    }
    next();
  });
}

export function publicPlatformAdmin(admin: typeof platformAdmins.$inferSelect) {
  return {
    id: admin.id,
    name: admin.name,
    phone: admin.phone,
    createdAt: admin.createdAt,
  };
}

export async function bootstrapPlatformAdmin(): Promise<void> {
  const phoneRaw = process.env.PLATFORM_ADMIN_PHONE?.trim() || "0501234567";
  const pin = process.env.PLATFORM_ADMIN_PIN?.trim() || "2020";
  const phone = normalizePhone(phoneRaw);
  const name = process.env.PLATFORM_ADMIN_NAME?.trim() || "Boniface";
  const pinHash = await hashPin(pin);
  const now = nowIso();

  const byPhone = db.select().from(platformAdmins).where(eq(platformAdmins.phone, phone)).get();
  if (byPhone) {
    db.update(platformAdmins).set({ pinHash, name }).where(eq(platformAdmins.id, byPhone.id)).run();
    return;
  }

  const first = db.select().from(platformAdmins).all()[0];
  if (first) {
    db.update(platformAdmins)
      .set({ phone, pinHash, name })
      .where(eq(platformAdmins.id, first.id))
      .run();
    return;
  }

  db.insert(platformAdmins)
    .values({
      id: newId(),
      name,
      phone,
      pinHash,
      createdAt: now,
    })
    .run();
  console.log(`Bootstrapped platform admin for ${phone}`);
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

export function publicOwner(owner: typeof owners.$inferSelect) {
  return {
    id: owner.id,
    name: owner.name,
    phone: owner.phone,
    email: owner.email,
    companyId: owner.companyId,
    address: owner.address,
    createdAt: owner.createdAt,
    updatedAt: owner.updatedAt,
  };
}

export function publicOrganization(org: typeof organizations.$inferSelect) {
  return {
    id: org.id,
    ownerId: org.ownerId,
    name: org.name,
    companyId: org.companyId,
    address: org.address,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

export function publicVenue(venue: typeof venues.$inferSelect) {
  return {
    id: venue.id,
    name: venue.name,
    organizationId: venue.organizationId,
    kind: venue.kind,
    address: venue.address,
    currency: venue.currency,
    timezone: venue.timezone,
    createdAt: venue.createdAt,
    updatedAt: venue.updatedAt,
    alerts: [] as { id: string; venueId: string; topic: string; severity: string; message: string; createdAt: string }[],
  };
}

export function randomInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}
