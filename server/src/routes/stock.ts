import { Router } from "express";
import { z } from "zod";

import { requireManager } from "../middleware/auth";
import {
  checklistsService,
  stockService,
  stopListService,
  writeOffsService,
} from "../services/inventoryService";

const router = Router();

const stockItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  quantity: z.number(),
  unit: z.string(),
  minQuantity: z.number(),
  purchasePrice: z.number().optional().nullable(),
  portionsPerUnit: z.number().optional().nullable(),
  sellingPrice: z.number().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  subCategory: z.string().optional().nullable(),
});

const stopItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  reason: z.string().optional().nullable(),
  addedAt: z.string(),
});

const writeOffSchema = z.object({
  id: z.string(),
  date: z.string(),
  itemId: z.string().optional().nullable(),
  itemName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  reason: z.string(),
  notes: z.string().optional().nullable(),
});

const checklistSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      done: z.boolean(),
    })
  ),
  createdAt: z.string(),
});

/** Managers: full stock. Employees use /api/employee/* */
router.get("/stock", requireManager, (req, res) => {
  res.json(stockService.list(req.auth!.venueId));
});

router.put("/stock", requireManager, (req, res) => {
  const parsed = z.array(stockItemSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid stock payload" });
    return;
  }
  res.json(stockService.replaceAll(req.auth!.venueId, parsed.data));
});

router.get("/stop-list", requireManager, (req, res) => {
  res.json(stopListService.list(req.auth!.venueId));
});

router.put("/stop-list", requireManager, (req, res) => {
  const parsed = z.array(stopItemSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid stop-list payload" });
    return;
  }
  res.json(stopListService.replaceAll(req.auth!.venueId, parsed.data));
});

router.get("/write-offs", requireManager, (req, res) => {
  res.json(writeOffsService.list(req.auth!.venueId));
});

router.put("/write-offs", requireManager, (req, res) => {
  const parsed = z.array(writeOffSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid write-offs payload" });
    return;
  }
  res.json(writeOffsService.replaceAll(req.auth!.venueId, parsed.data));
});

router.get("/checklists", requireManager, (req, res) => {
  res.json(checklistsService.list(req.auth!.venueId));
});

router.put("/checklists", requireManager, (req, res) => {
  const parsed = z.array(checklistSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid checklists payload" });
    return;
  }
  res.json(checklistsService.replaceAll(req.auth!.venueId, parsed.data));
});

export default router;
