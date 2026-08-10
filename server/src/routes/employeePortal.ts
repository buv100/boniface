import { Router } from "express";
import { z } from "zod";

import { requireEmployee } from "../middleware/auth";
import { dayEntriesService } from "../services/dayEntriesService";
import { stockService, stopListService } from "../services/inventoryService";

const router = Router();

router.get("/me/tips", requireEmployee, (req, res) => {
  const data = dayEntriesService.tipsForEmployee(req.auth!.venueId, req.auth!.employeeId!);
  res.json(data);
});

router.get("/stock-lite", requireEmployee, (req, res) => {
  res.json(stockService.listLite(req.auth!.venueId));
});

router.get("/stop-list", requireEmployee, (req, res) => {
  res.json(stopListService.list(req.auth!.venueId));
});

router.post("/stop-list", requireEmployee, (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1),
      reason: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const item = stopListService.reportOutOfStock(
    req.auth!.venueId,
    parsed.data.name,
    parsed.data.reason
  );
  res.status(201).json(item);
});

export default router;
