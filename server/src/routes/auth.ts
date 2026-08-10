import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../db";
import { employees, inviteCodes, managers, subscriptions, venues } from "../db/schema";
import {
  createSession,
  destroySession,
  hashPin,
  newId,
  normalizePhone,
  nowIso,
  publicManager,
  publicVenue,
  questionHint,
  requireAuth,
  verifyPin,
} from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  venueName: z.string().min(1),
  managerName: z.string().min(1),
  phone: z.string().min(5),
  pin: z.string().min(4),
  securityQuestion: z.string().optional(),
  securityAnswer: z.string().optional(),
});

const loginSchema = z.object({
  phone: z.string().min(5),
  pin: z.string().min(4),
});

const recoverSchema = z.object({
  phone: z.string().min(5),
  securityAnswer: z.string().min(1),
  newPin: z.string().min(4),
});

const forgotCheckSchema = z.object({
  phone: z.string().min(5),
});

const employeeJoinSchema = z.object({
  code: z.string().min(4),
  name: z.string().min(1),
  pin: z.string().min(4),
  phone: z.string().optional(),
});

const employeeLoginSchema = z.object({
  phone: z.string().min(5),
  pin: z.string().min(4),
});

function defaultExpiry(days = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration data" });
    return;
  }

  const { venueName, managerName, pin, securityQuestion, securityAnswer } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);

  const existing = db.select().from(managers).where(eq(managers.phone, phone)).get();
  if (existing) {
    res.status(409).json({ error: "Phone already registered" });
    return;
  }

  const now = nowIso();
  const venueId = newId();
  const managerId = newId();
  const pinHash = await hashPin(pin);
  const answerHash =
    securityAnswer && securityAnswer.trim()
      ? await hashPin(securityAnswer.trim().toLowerCase())
      : null;

  db.insert(venues)
    .values({
      id: venueId,
      name: venueName.trim(),
      currency: "ILS",
      timezone: "Asia/Jerusalem",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(managers)
    .values({
      id: managerId,
      venueId,
      name: managerName.trim(),
      phone,
      pinHash,
      securityQuestion: securityQuestion?.trim() || null,
      securityAnswerHash: answerHash,
      createdAt: now,
    })
    .run();

  db.insert(subscriptions)
    .values({
      id: newId(),
      venueId,
      status: "active",
      plan: "basic",
      expiresAt: defaultExpiry(30),
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const token = await createSession({ venueId, managerId, role: "manager" });
  const venue = db.select().from(venues).where(eq(venues.id, venueId)).get()!;
  const manager = db.select().from(managers).where(eq(managers.id, managerId)).get()!;

  res.status(201).json({
    token,
    manager: publicManager(manager),
    venue: publicVenue(venue),
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login data" });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const manager = db.select().from(managers).where(eq(managers.phone, phone)).get();
  if (!manager || !(await verifyPin(parsed.data.pin, manager.pinHash))) {
    res.status(401).json({ error: "Invalid phone or PIN" });
    return;
  }

  const venue = db.select().from(venues).where(eq(venues.id, manager.venueId)).get();
  if (!venue) {
    res.status(500).json({ error: "Venue missing" });
    return;
  }

  const token = await createSession({
    venueId: manager.venueId,
    managerId: manager.id,
    role: "manager",
  });

  res.json({
    token,
    manager: publicManager(manager),
    venue: publicVenue(venue),
  });
});

router.get("/me", requireAuth, (req, res) => {
  const auth = req.auth!;

  if (auth.role === "manager" && auth.managerId) {
    const manager = db.select().from(managers).where(eq(managers.id, auth.managerId)).get();
    const venue = db.select().from(venues).where(eq(venues.id, auth.venueId)).get();
    if (!manager || !venue) {
      res.status(401).json({ error: "Session invalid" });
      return;
    }
    res.json({ role: "manager", manager: publicManager(manager), venue: publicVenue(venue) });
    return;
  }

  if (auth.role === "employee" && auth.employeeId) {
    const employee = db.select().from(employees).where(eq(employees.id, auth.employeeId)).get();
    const venue = db.select().from(venues).where(eq(venues.id, auth.venueId)).get();
    if (!employee || !venue) {
      res.status(401).json({ error: "Session invalid" });
      return;
    }
    res.json({
      role: "employee",
      employee: {
        id: employee.id,
        venueId: employee.venueId,
        name: employee.name,
        roles: JSON.parse(employee.roles || "[]"),
        phone: employee.phone,
        onboardedAt: employee.onboardedAt,
        createdAt: employee.createdAt,
      },
      venue: publicVenue(venue),
    });
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
});

router.post("/logout", requireAuth, async (req, res) => {
  await destroySession(req.auth!.sessionId);
  res.status(204).send();
});

router.post("/forgot-check", (req, res) => {
  const parsed = forgotCheckSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid phone" });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const manager = db.select().from(managers).where(eq(managers.phone, phone)).get();
  if (!manager) {
    // Do not leak whether phone exists
    res.json({ hasSecurityQuestion: false });
    return;
  }

  const has = !!(manager.securityQuestion && manager.securityAnswerHash);
  res.json({
    hasSecurityQuestion: has,
    questionHint: has ? questionHint(manager.securityQuestion) : undefined,
  });
});

router.post("/recover", async (req, res) => {
  const parsed = recoverSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid recovery data" });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const manager = db.select().from(managers).where(eq(managers.phone, phone)).get();
  if (!manager?.securityAnswerHash) {
    res.status(400).json({ error: "Recovery not available for this account" });
    return;
  }

  const ok = await verifyPin(
    parsed.data.securityAnswer.trim().toLowerCase(),
    manager.securityAnswerHash
  );
  if (!ok) {
    res.status(401).json({ error: "Incorrect security answer" });
    return;
  }

  const pinHash = await hashPin(parsed.data.newPin);
  db.update(managers).set({ pinHash }).where(eq(managers.id, manager.id)).run();

  const venue = db.select().from(venues).where(eq(venues.id, manager.venueId)).get()!;
  const token = await createSession({
    venueId: manager.venueId,
    managerId: manager.id,
    role: "manager",
  });

  res.json({
    token,
    manager: publicManager({ ...manager, pinHash }),
    venue: publicVenue(venue),
  });
});

router.post("/employee-join", async (req, res) => {
  const parsed = employeeJoinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid join data" });
    return;
  }

  const code = parsed.data.code.trim().toUpperCase();
  const invite = db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).get();
  if (!invite) {
    res.status(404).json({ error: "Invalid invite code" });
    return;
  }
  if (invite.usedAt) {
    res.status(410).json({ error: "Invite code already used" });
    return;
  }
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    res.status(410).json({ error: "Invite code expired" });
    return;
  }

  const now = nowIso();
  const employeeId = newId();
  const pinHash = await hashPin(parsed.data.pin);
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;

  db.insert(employees)
    .values({
      id: employeeId,
      venueId: invite.venueId,
      name: parsed.data.name.trim(),
      roles: "[]",
      phone,
      pinHash,
      onboardedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.update(inviteCodes)
    .set({ usedAt: now, employeeName: parsed.data.name.trim() })
    .where(eq(inviteCodes.id, invite.id))
    .run();

  const venue = db.select().from(venues).where(eq(venues.id, invite.venueId)).get()!;
  const token = await createSession({
    venueId: invite.venueId,
    employeeId,
    role: "employee",
  });

  res.status(201).json({
    token,
    role: "employee",
    employee: {
      id: employeeId,
      venueId: invite.venueId,
      name: parsed.data.name.trim(),
      roles: [],
      phone,
      onboardedAt: now,
      createdAt: now,
    },
    venue: publicVenue(venue),
  });
});

router.post("/employee-login", async (req, res) => {
  const parsed = employeeLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login data" });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const employee = db.select().from(employees).where(eq(employees.phone, phone)).get();
  if (!employee?.pinHash || !(await verifyPin(parsed.data.pin, employee.pinHash))) {
    res.status(401).json({ error: "Invalid phone or PIN" });
    return;
  }

  const venue = db.select().from(venues).where(eq(venues.id, employee.venueId)).get();
  if (!venue) {
    res.status(500).json({ error: "Venue missing" });
    return;
  }

  const token = await createSession({
    venueId: employee.venueId,
    employeeId: employee.id,
    role: "employee",
  });

  res.json({
    token,
    role: "employee",
    employee: {
      id: employee.id,
      venueId: employee.venueId,
      name: employee.name,
      roles: JSON.parse(employee.roles || "[]"),
      phone: employee.phone,
      onboardedAt: employee.onboardedAt,
      createdAt: employee.createdAt,
    },
    venue: publicVenue(venue),
  });
});

export default router;
