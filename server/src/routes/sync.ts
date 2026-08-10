import { and, eq, gte, lte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../db";
import {
  checklists,
  dayEntries,
  employees,
  inviteCodes,
  shiftClaims,
  shiftSlots,
  stockItems,
  stopList,
  subscriptions,
  writeOffs,
} from "../db/schema";
import {
  newId,
  nowIso,
  randomInviteCode,
  requireActiveSubscription,
  requireAuth,
  requireManager,
} from "../middleware/auth";

const router = Router();

/** Israel work week: Sunday (0) → Saturday (6). Returns YYYY-MM-DD bounds. */
function israelWeekBounds(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0=Sun
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  return { start: fmt(start), end: fmt(end) };
}

function mapSlot(row: typeof shiftSlots.$inferSelect, claims: (typeof shiftClaims.$inferSelect)[]) {
  return {
    id: row.id,
    venueId: row.venueId,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    role: row.role ?? undefined,
    mode: row.mode,
    maxClaims: row.maxClaims,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    claims: claims
      .filter((c) => c.slotId === row.id && c.status === "claimed")
      .map((c) => ({
        id: c.id,
        employeeId: c.employeeId,
        status: c.status,
        claimedAt: c.claimedAt,
      })),
  };
}

// —— Bulk sync pull (managers only — employees use /api/employee/*) ——
router.get("/pull", requireManager, (req, res) => {
  const venueId = req.auth!.venueId;
  res.json({
    employees: db
      .select()
      .from(employees)
      .where(eq(employees.venueId, venueId))
      .all()
      .map((r) => ({
        id: r.id,
        name: r.name,
        roles: JSON.parse(r.roles || "[]"),
        phone: r.phone,
      })),
    dayEntries: db
      .select()
      .from(dayEntries)
      .where(eq(dayEntries.venueId, venueId))
      .all()
      .map((r) => ({
        id: r.id,
        date: r.date,
        totalCash: r.totalCash,
        totalCard: r.totalCard,
        shifts: JSON.parse(r.shifts || "[]"),
      })),
    stock: db.select().from(stockItems).where(eq(stockItems.venueId, venueId)).all(),
    stopList: db.select().from(stopList).where(eq(stopList.venueId, venueId)).all(),
    writeOffs: db.select().from(writeOffs).where(eq(writeOffs.venueId, venueId)).all(),
    checklists: db
      .select()
      .from(checklists)
      .where(eq(checklists.venueId, venueId))
      .all()
      .map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        items: JSON.parse(r.items || "[]"),
        createdAt: r.createdAt,
      })),
  });
});

// —— Subscription ——
router.get("/subscription", requireAuth, (req, res) => {
  const sub = db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.venueId, req.auth!.venueId))
    .get();

  if (!sub) {
    res.json({ status: "none", expiresAt: null, plan: null, isActive: false });
    return;
  }

  const expired = new Date(sub.expiresAt).getTime() < Date.now();
  const status = expired ? "expired" : sub.status;
  if (expired && sub.status !== "expired") {
    db.update(subscriptions)
      .set({ status: "expired", updatedAt: nowIso() })
      .where(eq(subscriptions.id, sub.id))
      .run();
  }

  res.json({
    id: sub.id,
    status,
    plan: sub.plan,
    expiresAt: sub.expiresAt,
    isActive: !expired && status === "active",
  });
});

router.post("/subscription/expire-simulate", requireManager, (req, res) => {
  const sub = db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.venueId, req.auth!.venueId))
    .get();
  if (!sub) {
    res.status(404).json({ error: "No subscription" });
    return;
  }

  const expiresAt = new Date(Date.now() - 60_000).toISOString();
  db.update(subscriptions)
    .set({ status: "expired", expiresAt, updatedAt: nowIso() })
    .where(eq(subscriptions.id, sub.id))
    .run();

  res.json({
    id: sub.id,
    status: "expired",
    plan: sub.plan,
    expiresAt,
    isActive: false,
  });
});

// —— Invites ——
const inviteSchema = z.object({
  employeeName: z.string().optional(),
  expiresInDays: z.number().int().positive().optional(),
});

router.post("/invites", requireActiveSubscription, (req, res) => {
  const parsed = inviteSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid invite data" });
    return;
  }

  const now = nowIso();
  let code = randomInviteCode();
  while (db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).get()) {
    code = randomInviteCode();
  }

  let expiresAt: string | null = null;
  if (parsed.data.expiresInDays) {
    const d = new Date();
    d.setDate(d.getDate() + parsed.data.expiresInDays);
    expiresAt = d.toISOString();
  }

  const id = newId();
  db.insert(inviteCodes)
    .values({
      id,
      venueId: req.auth!.venueId,
      code,
      employeeName: parsed.data.employeeName?.trim() || null,
      usedAt: null,
      expiresAt,
      createdAt: now,
      createdByManagerId: req.auth!.managerId ?? null,
    })
    .run();

  res.status(201).json({
    id,
    code,
    venueId: req.auth!.venueId,
    employeeName: parsed.data.employeeName ?? null,
    expiresAt,
    createdAt: now,
  });
});

// —— Shift slots ——
const slotSchema = z.object({
  date: z.string().min(8),
  startTime: z.string().min(4),
  endTime: z.string().min(4),
  role: z.string().optional().nullable(),
  mode: z.enum(["can", "want"]).optional(),
  maxClaims: z.number().int().positive().optional(),
  notes: z.string().optional().nullable(),
});

router.get("/shift-slots", requireAuth, (req, res) => {
  const venueId = req.auth!.venueId;
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;

  let slots = db.select().from(shiftSlots).where(eq(shiftSlots.venueId, venueId)).all();
  if (from) slots = slots.filter((s) => s.date >= from);
  if (to) slots = slots.filter((s) => s.date <= to);

  const claims = db.select().from(shiftClaims).all().filter((c) =>
    slots.some((s) => s.id === c.slotId)
  );

  res.json(slots.map((s) => mapSlot(s, claims)));
});

router.post("/shift-slots", requireActiveSubscription, (req, res) => {
  const parsed = slotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid shift slot" });
    return;
  }

  const id = newId();
  const now = nowIso();
  db.insert(shiftSlots)
    .values({
      id,
      venueId: req.auth!.venueId,
      date: parsed.data.date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      role: parsed.data.role ?? null,
      mode: parsed.data.mode ?? "can",
      maxClaims: parsed.data.maxClaims ?? 4,
      notes: parsed.data.notes ?? null,
      createdAt: now,
    })
    .run();

  const row = db.select().from(shiftSlots).where(eq(shiftSlots.id, id)).get()!;
  res.status(201).json(mapSlot(row, []));
});

router.patch("/shift-slots/:id", requireActiveSubscription, (req, res) => {
  const parsed = slotSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid shift slot" });
    return;
  }

  const existing = db
    .select()
    .from(shiftSlots)
    .where(and(eq(shiftSlots.id, req.params.id), eq(shiftSlots.venueId, req.auth!.venueId)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Shift slot not found" });
    return;
  }

  const patch: Partial<typeof shiftSlots.$inferInsert> = {};
  if (parsed.data.date !== undefined) patch.date = parsed.data.date;
  if (parsed.data.startTime !== undefined) patch.startTime = parsed.data.startTime;
  if (parsed.data.endTime !== undefined) patch.endTime = parsed.data.endTime;
  if (parsed.data.role !== undefined) patch.role = parsed.data.role;
  if (parsed.data.mode !== undefined) patch.mode = parsed.data.mode;
  if (parsed.data.maxClaims !== undefined) patch.maxClaims = parsed.data.maxClaims;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;

  db.update(shiftSlots).set(patch).where(eq(shiftSlots.id, existing.id)).run();
  const row = db.select().from(shiftSlots).where(eq(shiftSlots.id, existing.id)).get()!;
  const claims = db.select().from(shiftClaims).where(eq(shiftClaims.slotId, row.id)).all();
  res.json(mapSlot(row, claims));
});

router.delete("/shift-slots/:id", requireActiveSubscription, (req, res) => {
  const existing = db
    .select()
    .from(shiftSlots)
    .where(and(eq(shiftSlots.id, req.params.id), eq(shiftSlots.venueId, req.auth!.venueId)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Shift slot not found" });
    return;
  }

  db.delete(shiftClaims).where(eq(shiftClaims.slotId, existing.id)).run();
  db.delete(shiftSlots).where(eq(shiftSlots.id, existing.id)).run();
  res.status(204).send();
});

const claimSchema = z.object({
  employeeId: z.string().min(1),
});

/**
 * Claim a shift with Israel labor rules:
 * - max 1 shift / calendar day
 * - max 6 distinct work days / Israel week (Sun–Sat)
 */
router.post("/shift-slots/:id/claim", requireAuth, (req, res) => {
  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "employeeId required" });
    return;
  }

  const slot = db
    .select()
    .from(shiftSlots)
    .where(and(eq(shiftSlots.id, req.params.id), eq(shiftSlots.venueId, req.auth!.venueId)))
    .get();
  if (!slot) {
    res.status(404).json({ error: "Shift slot not found" });
    return;
  }

  const employeeId =
    req.auth!.role === "employee" ? req.auth!.employeeId! : parsed.data.employeeId;

  if (req.auth!.role === "employee" && parsed.data.employeeId !== employeeId) {
    res.status(403).json({ error: "Cannot claim for another employee" });
    return;
  }

  const employee = db
    .select()
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.venueId, req.auth!.venueId)))
    .get();
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const existingClaims = db
    .select()
    .from(shiftClaims)
    .where(and(eq(shiftClaims.slotId, slot.id), eq(shiftClaims.status, "claimed")))
    .all();

  if (existingClaims.some((c) => c.employeeId === employeeId)) {
    res.status(409).json({ error: "Already claimed this shift" });
    return;
  }

  if (slot.mode === "want" && existingClaims.length >= 1) {
    res.status(409).json({ error: "Shift already taken (first-come mode)" });
    return;
  }

  if (slot.mode === "can" && existingClaims.length >= slot.maxClaims) {
    res.status(409).json({ error: "Shift is full" });
    return;
  }

  // Labor: max 1 shift per day
  const venueSlots = db
    .select()
    .from(shiftSlots)
    .where(and(eq(shiftSlots.venueId, req.auth!.venueId), eq(shiftSlots.date, slot.date)))
    .all();
  const slotIdsSameDay = venueSlots.map((s) => s.id);
  const sameDayClaims = db
    .select()
    .from(shiftClaims)
    .where(and(eq(shiftClaims.employeeId, employeeId), eq(shiftClaims.status, "claimed")))
    .all()
    .filter((c) => slotIdsSameDay.includes(c.slotId));

  if (sameDayClaims.length > 0) {
    res.status(422).json({
      error: "Israel labor rule: maximum 1 shift per day",
      code: "MAX_ONE_SHIFT_PER_DAY",
    });
    return;
  }

  // Labor: max 6 days per week (Sun–Sat)
  const { start, end } = israelWeekBounds(slot.date);
  const weekSlots = db
    .select()
    .from(shiftSlots)
    .where(
      and(
        eq(shiftSlots.venueId, req.auth!.venueId),
        gte(shiftSlots.date, start),
        lte(shiftSlots.date, end)
      )
    )
    .all();
  const weekSlotIds = weekSlots.map((s) => s.id);
  const weekClaims = db
    .select()
    .from(shiftClaims)
    .where(and(eq(shiftClaims.employeeId, employeeId), eq(shiftClaims.status, "claimed")))
    .all()
    .filter((c) => weekSlotIds.includes(c.slotId));

  const daysWorked = new Set(
    weekClaims
      .map((c) => weekSlots.find((s) => s.id === c.slotId)?.date)
      .filter(Boolean) as string[]
  );
  if (!daysWorked.has(slot.date) && daysWorked.size >= 6) {
    res.status(422).json({
      error: "Israel labor rule: maximum 6 work days per week",
      code: "MAX_SIX_DAYS_PER_WEEK",
    });
    return;
  }

  const claimId = newId();
  const claimedAt = nowIso();
  db.insert(shiftClaims)
    .values({
      id: claimId,
      slotId: slot.id,
      employeeId,
      status: "claimed",
      claimedAt,
    })
    .run();

  const claims = db.select().from(shiftClaims).where(eq(shiftClaims.slotId, slot.id)).all();
  res.status(201).json({
    claim: { id: claimId, slotId: slot.id, employeeId, status: "claimed", claimedAt },
    slot: mapSlot(slot, claims),
  });
});

router.delete("/shift-claims/:id", requireAuth, (req, res) => {
  const claim = db.select().from(shiftClaims).where(eq(shiftClaims.id, req.params.id)).get();
  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  const slot = db.select().from(shiftSlots).where(eq(shiftSlots.id, claim.slotId)).get();
  if (!slot || slot.venueId !== req.auth!.venueId) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  if (
    req.auth!.role === "employee" &&
    claim.employeeId !== req.auth!.employeeId
  ) {
    res.status(403).json({ error: "Cannot cancel another employee's claim" });
    return;
  }

  db.update(shiftClaims)
    .set({ status: "cancelled" })
    .where(eq(shiftClaims.id, claim.id))
    .run();

  res.status(204).send();
});

export default router;
