import { Router } from "express";
import { z } from "zod";

import { requireManager } from "../middleware/auth";
import { employeesService } from "../services/employeesService";

const router = Router();

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

router.get("/", requireManager, (req, res) => {
  res.json(employeesService.list(req.auth!.venueId));
});

router.post("/", requireManager, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid employee data" });
    return;
  }
  res.status(201).json(employeesService.create(req.auth!.venueId, parsed.data));
});

router.patch("/:id", requireManager, (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid employee data" });
    return;
  }
  const row = employeesService.update(req.auth!.venueId, req.params.id, parsed.data);
  if (!row) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(row);
});

router.delete("/:id", requireManager, (req, res) => {
  const ok = employeesService.remove(req.auth!.venueId, req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.status(204).send();
});

export default router;
