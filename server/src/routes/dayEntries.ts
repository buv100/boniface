import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../db";
import { dayEntries } from "../db/schema";
import { newId, nowIso, requireAuth } from "../middleware/auth";

const router = Router();

const shiftSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  tipMode: z.enum(["hours", "percent"]),
  startTime: z.string(),
  endTime: z.string(),
  cashPercent: z.number(),
  cardPercent: z.number(),
});

const entryBodySchema = z.object({
  date: z.string().min(8),
  totalCash: z.number(),
  totalCard: z.number(),
  shifts: z.array(shiftSchema).default([]),
});

function mapEntry(row: typeof dayEntries.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    totalCash: row.totalCash,
    totalCard: row.totalCard,
    shifts: JSON.parse(row.shifts || "[]"),
  };
}

router.get("/", requireAuth, (req, res) => {
  const rows = db
    .select()
    .from(dayEntries)
    .where(eq(dayEntries.venueId, req.auth!.venueId))
    .all();
  res.json(rows.map(mapEntry));
});

router.post("/", requireAuth, (req, res) => {
  const parsed = entryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid day entry" });
    return;
  }

  const now = nowIso();
  const id = newId();
  db.insert(dayEntries)
    .values({
      id,
      venueId: req.auth!.venueId,
      date: parsed.data.date,
      totalCash: parsed.data.totalCash,
      totalCard: parsed.data.totalCard,
      shifts: JSON.stringify(parsed.data.shifts),
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const row = db.select().from(dayEntries).where(eq(dayEntries.id, id)).get()!;
  res.status(201).json(mapEntry(row));
});

router.put("/:id", requireAuth, (req, res) => {
  const parsed = entryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid day entry" });
    return;
  }

  const now = nowIso();
  const id = req.params.id;
  const existing = db
    .select()
    .from(dayEntries)
    .where(and(eq(dayEntries.id, id), eq(dayEntries.venueId, req.auth!.venueId)))
    .get();

  if (existing) {
    db.update(dayEntries)
      .set({
        date: parsed.data.date,
        totalCash: parsed.data.totalCash,
        totalCard: parsed.data.totalCard,
        shifts: JSON.stringify(parsed.data.shifts),
        updatedAt: now,
      })
      .where(eq(dayEntries.id, id))
      .run();
  } else {
    db.insert(dayEntries)
      .values({
        id,
        venueId: req.auth!.venueId,
        date: parsed.data.date,
        totalCash: parsed.data.totalCash,
        totalCard: parsed.data.totalCard,
        shifts: JSON.stringify(parsed.data.shifts),
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  const row = db.select().from(dayEntries).where(eq(dayEntries.id, id)).get()!;
  res.json(mapEntry(row));
});

router.delete("/:id", requireAuth, (req, res) => {
  const existing = db
    .select()
    .from(dayEntries)
    .where(and(eq(dayEntries.id, req.params.id), eq(dayEntries.venueId, req.auth!.venueId)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Day entry not found" });
    return;
  }

  db.delete(dayEntries).where(eq(dayEntries.id, existing.id)).run();
  res.status(204).send();
});

export default router;
