import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../db";
import {
  employees,
  inviteCodes,
  managers,
  organizations,
  owners,
  platformAdmins,
  subscriptions,
  venues,
} from "../db/schema";
import {
  createAdminSession,
  createSession,
  destroySession,
  getOrgBilling,
  hashPin,
  newId,
  normalizePhone,
  nowIso,
  publicManager,
  publicOrganization,
  publicOrgSubscription,
  publicOwner,
  publicPlatformAdmin,
  publicVenue,
  questionHint,
  requireAuth,
  requireOwner,
  requirePaidOrg,
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

const ownerLoginSchema = z.object({
  phone: z.string().min(5),
  pin: z.string().min(4),
});

const selectVenueSchema = z.object({
  venueId: z.string().min(1),
});

function listOwnerVenues(organizationId: string) {
  return db
    .select()
    .from(venues)
    .where(eq(venues.organizationId, organizationId))
    .all()
    .map(publicVenue);
}

async function ownerSessionJson(opts: {
  ownerId: string;
  organizationId: string;
  venueId: string;
}) {
  const token = await createSession({
    venueId: opts.venueId,
    ownerId: opts.ownerId,
    organizationId: opts.organizationId,
    role: "owner",
  });
  const owner = db.select().from(owners).where(eq(owners.id, opts.ownerId)).get()!;
  const organization = db
    .select()
    .from(organizations)
    .where(eq(organizations.id, opts.organizationId))
    .get()!;
  const venueList = listOwnerVenues(opts.organizationId);
  const venue = venueList.find((v) => v.id === opts.venueId) ?? venueList[0];
  const subscription = publicOrgSubscription(getOrgBilling(opts.organizationId));
  return {
    token,
    role: "owner" as const,
    owner: publicOwner(owner),
    organization: publicOrganization(organization),
    venue,
    venues: venueList,
    subscription,
    ...(subscription.isActive ? {} : { code: "SUBSCRIPTION_INACTIVE" as const }),
  };
}

router.post("/owner/register", (_req, res) => {
  res.status(403).json({
    error: "Owner self-registration is closed",
    code: "NO_PUBLIC_SIGNUP",
  });
});

router.post("/owner/login", async (req, res) => {
  const parsed = ownerLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login data" });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const owner = db.select().from(owners).where(eq(owners.phone, phone)).get();
  if (!owner || !(await verifyPin(parsed.data.pin, owner.pinHash))) {
    res.status(401).json({ error: "Invalid phone or PIN" });
    return;
  }

  const org = db.select().from(organizations).where(eq(organizations.ownerId, owner.id)).get();
  if (!org) {
    res.status(500).json({ error: "Organization missing" });
    return;
  }

  const venueList = listOwnerVenues(org.id);
  if (!venueList.length) {
    res.status(500).json({ error: "No venues" });
    return;
  }

  const payload = await ownerSessionJson({
    ownerId: owner.id,
    organizationId: org.id,
    venueId: venueList[0].id,
  });
  res.json(payload);
});

router.post("/admin/login", async (req, res) => {
  const parsed = ownerLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login data" });
    return;
  }
  const phone = normalizePhone(parsed.data.phone);
  const admin = db.select().from(platformAdmins).where(eq(platformAdmins.phone, phone)).get();
  if (!admin || !(await verifyPin(parsed.data.pin, admin.pinHash))) {
    res.status(401).json({ error: "Invalid phone or PIN" });
    return;
  }
  const token = await createAdminSession(admin.id);
  res.json({
    token,
    role: "platform_admin" as const,
    admin: publicPlatformAdmin(admin),
  });
});

router.post("/select-venue", requireOwner, requirePaidOrg, async (req, res) => {
  const parsed = selectVenueSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid venue" });
    return;
  }
  const auth = req.auth!;
  const venue = db.select().from(venues).where(eq(venues.id, parsed.data.venueId)).get();
  if (!venue || venue.organizationId !== auth.organizationId) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }
  await destroySession(auth.sessionId);
  const payload = await ownerSessionJson({
    ownerId: auth.ownerId!,
    organizationId: auth.organizationId!,
    venueId: venue.id,
  });
  res.json(payload);
});

router.get("/me", requireAuth, (req, res) => {
  const auth = req.auth!;

  if (auth.role === "platform_admin" && auth.platformAdminId) {
    const admin = db.select().from(platformAdmins).where(eq(platformAdmins.id, auth.platformAdminId)).get();
    if (!admin) {
      res.status(401).json({ error: "Session invalid" });
      return;
    }
    res.json({ role: "platform_admin", admin: publicPlatformAdmin(admin) });
    return;
  }

  if (auth.role === "owner" && auth.ownerId && auth.organizationId) {
    const owner = db.select().from(owners).where(eq(owners.id, auth.ownerId)).get();
    const organization = db
      .select()
      .from(organizations)
      .where(eq(organizations.id, auth.organizationId))
      .get();
    const venueList = listOwnerVenues(auth.organizationId);
    const venue = venueList.find((v) => v.id === auth.venueId) ?? venueList[0] ?? null;
    if (!owner || !organization || !venue) {
      res.status(401).json({ error: "Session invalid" });
      return;
    }
    const subscription = publicOrgSubscription(getOrgBilling(auth.organizationId));
    res.json({
      role: "owner",
      owner: publicOwner(owner),
      organization: publicOrganization(organization),
      venue,
      venues: venueList,
      subscription,
    });
    return;
  }

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
