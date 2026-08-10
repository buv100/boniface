import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../db";
import { checklists, stockItems, stopList, writeOffs } from "../db/schema";
import { nowIso, requireAuth } from "../middleware/auth";

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

function mapStock(row: typeof stockItems.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    minQuantity: row.minQuantity,
    purchasePrice: row.purchasePrice ?? undefined,
    portionsPerUnit: row.portionsPerUnit ?? undefined,
    sellingPrice: row.sellingPrice ?? undefined,
    expiryDate: row.expiryDate ?? undefined,
    subCategory: row.subCategory ?? undefined,
  };
}

function mapStop(row: typeof stopList.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    reason: row.reason ?? undefined,
    addedAt: row.addedAt,
  };
}

function mapWriteOff(row: typeof writeOffs.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    itemId: row.itemId ?? undefined,
    itemName: row.itemName,
    quantity: row.quantity,
    unit: row.unit,
    reason: row.reason,
    notes: row.notes ?? undefined,
  };
}

function mapChecklist(row: typeof checklists.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    items: JSON.parse(row.items || "[]"),
    createdAt: row.createdAt,
  };
}

router.get("/stock", requireAuth, (req, res) => {
  const rows = db
    .select()
    .from(stockItems)
    .where(eq(stockItems.venueId, req.auth!.venueId))
    .all();
  res.json(rows.map(mapStock));
});

router.put("/stock", requireAuth, (req, res) => {
  const parsed = z.array(stockItemSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid stock payload" });
    return;
  }

  const venueId = req.auth!.venueId;
  const updatedAt = nowIso();
  db.delete(stockItems).where(eq(stockItems.venueId, venueId)).run();
  for (const item of parsed.data) {
    db.insert(stockItems)
      .values({
        id: item.id,
        venueId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minQuantity: item.minQuantity,
        purchasePrice: item.purchasePrice ?? null,
        portionsPerUnit: item.portionsPerUnit ?? null,
        sellingPrice: item.sellingPrice ?? null,
        expiryDate: item.expiryDate ?? null,
        subCategory: item.subCategory ?? null,
        updatedAt,
      })
      .run();
  }

  const rows = db.select().from(stockItems).where(eq(stockItems.venueId, venueId)).all();
  res.json(rows.map(mapStock));
});

router.get("/stop-list", requireAuth, (req, res) => {
  const rows = db.select().from(stopList).where(eq(stopList.venueId, req.auth!.venueId)).all();
  res.json(rows.map(mapStop));
});

router.put("/stop-list", requireAuth, (req, res) => {
  const parsed = z.array(stopItemSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid stop-list payload" });
    return;
  }

  const venueId = req.auth!.venueId;
  db.delete(stopList).where(eq(stopList.venueId, venueId)).run();
  for (const item of parsed.data) {
    db.insert(stopList)
      .values({
        id: item.id,
        venueId,
        name: item.name,
        reason: item.reason ?? null,
        addedAt: item.addedAt,
      })
      .run();
  }

  const rows = db.select().from(stopList).where(eq(stopList.venueId, venueId)).all();
  res.json(rows.map(mapStop));
});

router.get("/write-offs", requireAuth, (req, res) => {
  const rows = db.select().from(writeOffs).where(eq(writeOffs.venueId, req.auth!.venueId)).all();
  res.json(rows.map(mapWriteOff));
});

router.put("/write-offs", requireAuth, (req, res) => {
  const parsed = z.array(writeOffSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid write-offs payload" });
    return;
  }

  const venueId = req.auth!.venueId;
  db.delete(writeOffs).where(eq(writeOffs.venueId, venueId)).run();
  for (const item of parsed.data) {
    db.insert(writeOffs)
      .values({
        id: item.id,
        venueId,
        date: item.date,
        itemId: item.itemId ?? null,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        reason: item.reason,
        notes: item.notes ?? null,
      })
      .run();
  }

  const rows = db.select().from(writeOffs).where(eq(writeOffs.venueId, venueId)).all();
  res.json(rows.map(mapWriteOff));
});

router.get("/checklists", requireAuth, (req, res) => {
  const rows = db.select().from(checklists).where(eq(checklists.venueId, req.auth!.venueId)).all();
  res.json(rows.map(mapChecklist));
});

router.put("/checklists", requireAuth, (req, res) => {
  const parsed = z.array(checklistSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid checklists payload" });
    return;
  }

  const venueId = req.auth!.venueId;
  db.delete(checklists).where(eq(checklists.venueId, venueId)).run();
  for (const item of parsed.data) {
    db.insert(checklists)
      .values({
        id: item.id,
        venueId,
        title: item.title,
        type: item.type,
        items: JSON.stringify(item.items),
        createdAt: item.createdAt,
      })
      .run();
  }

  const rows = db.select().from(checklists).where(eq(checklists.venueId, venueId)).all();
  res.json(rows.map(mapChecklist));
});

export default router;
