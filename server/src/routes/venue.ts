import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../db";
import { venues } from "../db/schema";
import { nowIso, publicVenue, requireManager } from "../middleware/auth";

const router = Router();

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.enum(["ILS", "USD", "EUR"]).optional(),
  timezone: z.string().min(1).optional(),
});

router.patch("/", requireManager, (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid venue data" });
    return;
  }

  const venue = db.select().from(venues).where(eq(venues.id, req.auth!.venueId)).get();
  if (!venue) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }

  const patch: Partial<typeof venues.$inferInsert> = { updatedAt: nowIso() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
  if (parsed.data.currency !== undefined) patch.currency = parsed.data.currency;
  if (parsed.data.timezone !== undefined) patch.timezone = parsed.data.timezone;

  db.update(venues).set(patch).where(eq(venues.id, venue.id)).run();
  const updated = db.select().from(venues).where(eq(venues.id, venue.id)).get()!;
  res.json(publicVenue(updated));
});

router.get("/", requireManager, (req, res) => {
  const venue = db.select().from(venues).where(eq(venues.id, req.auth!.venueId)).get();
  if (!venue) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }
  res.json(publicVenue(venue));
});

export default router;
