import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../db";
import { employees } from "../db/schema";
import { newId, nowIso, requireAuth } from "../middleware/auth";

const router = Router();

function mapEmployee(row: typeof employees.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    roles: JSON.parse(row.roles || "[]") as string[],
    phone: row.phone,
  };
}

const createSchema = z.object({
  name: z.string().min(1),
  roles: z.array(z.string()).optional(),
  phone: z.string().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  roles: z.array(z.string()).optional(),
  phone: z.string().nullable().optional(),
});

router.get("/", requireAuth, (req, res) => {
  const rows = db
    .select()
    .from(employees)
    .where(eq(employees.venueId, req.auth!.venueId))
    .all();
  res.json(rows.map(mapEmployee));
});

router.post("/", requireAuth, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid employee data" });
    return;
  }

  const now = nowIso();
  const id = newId();
  db.insert(employees)
    .values({
      id,
      venueId: req.auth!.venueId,
      name: parsed.data.name.trim(),
      roles: JSON.stringify(parsed.data.roles ?? []),
      phone: parsed.data.phone ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const row = db.select().from(employees).where(eq(employees.id, id)).get()!;
  res.status(201).json(mapEmployee(row));
});

router.patch("/:id", requireAuth, (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid employee data" });
    return;
  }

  const existing = db
    .select()
    .from(employees)
    .where(and(eq(employees.id, req.params.id), eq(employees.venueId, req.auth!.venueId)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const patch: Partial<typeof employees.$inferInsert> = { updatedAt: nowIso() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
  if (parsed.data.roles !== undefined) patch.roles = JSON.stringify(parsed.data.roles);
  if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone;

  db.update(employees)
    .set(patch)
    .where(eq(employees.id, existing.id))
    .run();

  const row = db.select().from(employees).where(eq(employees.id, existing.id)).get()!;
  res.json(mapEmployee(row));
});

router.delete("/:id", requireAuth, (req, res) => {
  const existing = db
    .select()
    .from(employees)
    .where(and(eq(employees.id, req.params.id), eq(employees.venueId, req.auth!.venueId)))
    .get();
  if (!existing) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  db.delete(employees).where(eq(employees.id, existing.id)).run();
  res.status(204).send();
});

export default router;
