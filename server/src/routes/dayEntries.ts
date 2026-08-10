import { Router } from "express";
import { z } from "zod";

import { requireManager } from "../middleware/auth";
import { dayEntriesService } from "../services/dayEntriesService";

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

router.get("/", requireManager, (req, res) => {
  res.json(dayEntriesService.list(req.auth!.venueId));
});

router.post("/", requireManager, (req, res) => {
  const parsed = entryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid day entry" });
    return;
  }
  res.status(201).json(dayEntriesService.create(req.auth!.venueId, parsed.data));
});

router.put("/:id", requireManager, (req, res) => {
  const parsed = entryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid day entry" });
    return;
  }
  res.json(dayEntriesService.upsert(req.auth!.venueId, req.params.id, parsed.data));
});

router.delete("/:id", requireManager, (req, res) => {
  const ok = dayEntriesService.remove(req.auth!.venueId, req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Day entry not found" });
    return;
  }
  res.status(204).send();
});

export default router;
