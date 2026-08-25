import fs from "node:fs";
import path from "node:path";

import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { dataDir, db } from "../db";
import {
  inventoryItems,
  ledgerEntries,
  organizations,
  recipeLines,
  recipes,
  staff,
  staffDocuments,
  suppliers,
  venues,
  workShifts,
} from "../db/schema";
import {
  newId,
  nowIso,
  publicOrganization,
  publicVenue,
  requireOwner,
  requirePaidOrg,
} from "../middleware/auth";
import { shiftLaborCost } from "../services/laborCost";

const router = Router();
router.use(requireOwner);
router.use(requirePaidOrg);

const PERMISSIONS = [
  "view_stock",
  "edit_stock",
  "manage_staff",
  "manage_recipes",
  "manage_suppliers",
  "run_shift",
  "view_reports",
] as const;

function venueScope(req: { auth?: { venueId: string; organizationId?: string } }) {
  return { venueId: req.auth!.venueId, organizationId: req.auth!.organizationId! };
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function publicStaff(row: typeof staff.$inferSelect) {
  return {
    id: row.id,
    venueId: row.venueId,
    name: row.name,
    phone: row.phone,
    jobRole: row.jobRole,
    customRole: row.customRole,
    permissions: parseJson<string[]>(row.permissions, []),
    payType: row.payType,
    payAmount: row.payAmount,
    nationalId: row.nationalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function publicInventory(row: typeof inventoryItems.$inferSelect) {
  return {
    id: row.id,
    venueId: row.venueId,
    department: row.department,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    minQuantity: row.minQuantity,
    unitCost: row.unitCost ?? 0,
    supplierId: row.supplierId,
    belowMin: row.quantity < row.minQuantity,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function computeRecipeCost(recipeId: string, seen = new Set<string>()): number {
  if (seen.has(recipeId)) return 0;
  seen.add(recipeId);
  const lines = db.select().from(recipeLines).where(eq(recipeLines.recipeId, recipeId)).all();
  let total = 0;
  for (const line of lines) {
    if (line.inventoryItemId) {
      const item = db.select().from(inventoryItems).where(eq(inventoryItems.id, line.inventoryItemId)).get();
      total += (item?.unitCost ?? 0) * line.quantity;
    } else if (line.subRecipeId) {
      total += computeRecipeCost(line.subRecipeId, seen) * line.quantity;
    }
  }
  return Math.round(total * 100) / 100;
}

function publicRecipe(
  row: typeof recipes.$inferSelect,
  lines: (typeof recipeLines.$inferSelect)[]
) {
  return {
    id: row.id,
    venueId: row.venueId,
    department: row.department,
    name: row.name,
    kind: row.kind,
    notes: row.notes,
    cost: computeRecipeCost(row.id),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lines: lines.map((l) => ({
      id: l.id,
      inventoryItemId: l.inventoryItemId,
      subRecipeId: l.subRecipeId,
      quantity: l.quantity,
      unit: l.unit,
    })),
  };
}

function publicSupplier(row: typeof suppliers.$inferSelect) {
  return {
    id: row.id,
    venueId: row.venueId,
    name: row.name,
    phone: row.phone,
    whatSupplies: row.whatSupplies,
    scheduleNote: row.scheduleNote,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const venueCreateSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["bar", "restaurant"]),
  address: z.string().optional(),
});

const venuePatchSchema = z.object({
  name: z.string().min(1).optional(),
  kind: z.enum(["bar", "restaurant"]).optional(),
  address: z.string().nullable().optional(),
});

const orgPatchSchema = z.object({
  name: z.string().min(1).optional(),
  companyId: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

const staffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  jobRole: z.enum(["bartender", "waiter", "cook", "custom"]).default("bartender"),
  customRole: z.string().optional().nullable(),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
  payType: z.enum(["hourly", "monthly", "topup"]).default("hourly"),
  payAmount: z.number().min(0).default(0),
  nationalId: z.string().optional().nullable(),
});

const docSchema = z.object({
  kind: z.enum(["id", "form101", "other"]),
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
  contentBase64: z.string().min(8),
});

const inventorySchema = z.object({
  name: z.string().min(1),
  department: z.enum(["bar", "kitchen"]),
  category: z.string().min(1).default("other"),
  quantity: z.number().min(0).default(0),
  unit: z.string().min(1).default("pcs"),
  minQuantity: z.number().min(0).default(0),
  unitCost: z.number().min(0).default(0),
  supplierId: z.string().nullable().optional(),
});

const recipeLineSchema = z.object({
  inventoryItemId: z.string().nullable().optional(),
  subRecipeId: z.string().nullable().optional(),
  quantity: z.number().positive(),
  unit: z.string().min(1).default("pcs"),
});

const recipeSchema = z.object({
  name: z.string().min(1),
  department: z.enum(["bar", "kitchen"]),
  kind: z.string().min(1).default("item"),
  notes: z.string().optional().nullable(),
  lines: z.array(recipeLineSchema).default([]),
});

const supplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  whatSupplies: z.string().optional().nullable(),
  scheduleNote: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// —— Organization / venues ——

router.patch("/organization", (req, res) => {
  const parsed = orgPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const { organizationId } = venueScope(req);
  const now = nowIso();
  db.update(organizations)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.companyId !== undefined ? { companyId: parsed.data.companyId } : {}),
      ...(parsed.data.address !== undefined ? { address: parsed.data.address } : {}),
      updatedAt: now,
    })
    .where(eq(organizations.id, organizationId))
    .run();
  const org = db.select().from(organizations).where(eq(organizations.id, organizationId)).get()!;
  res.json(publicOrganization(org));
});

router.get("/venues", (req, res) => {
  const { organizationId } = venueScope(req);
  const list = db
    .select()
    .from(venues)
    .where(eq(venues.organizationId, organizationId))
    .all()
    .map(publicVenue);
  res.json(list);
});

router.post("/venues", (req, res) => {
  const parsed = venueCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid venue" });
    return;
  }
  const { organizationId } = venueScope(req);
  const now = nowIso();
  const id = newId();
  db.insert(venues)
    .values({
      id,
      name: parsed.data.name.trim(),
      organizationId,
      kind: parsed.data.kind,
      address: parsed.data.address?.trim() || null,
      currency: "ILS",
      timezone: "Asia/Jerusalem",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  res.status(201).json(publicVenue(db.select().from(venues).where(eq(venues.id, id)).get()!));
});

router.patch("/venues/:id", (req, res) => {
  const parsed = venuePatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid venue" });
    return;
  }
  const { organizationId } = venueScope(req);
  const row = db.select().from(venues).where(eq(venues.id, req.params.id)).get();
  if (!row || row.organizationId !== organizationId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.update(venues)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.kind ? { kind: parsed.data.kind } : {}),
      ...(parsed.data.address !== undefined ? { address: parsed.data.address } : {}),
      updatedAt: nowIso(),
    })
    .where(eq(venues.id, row.id))
    .run();
  res.json(publicVenue(db.select().from(venues).where(eq(venues.id, row.id)).get()!));
});

// —— Staff ——

router.get("/staff", (req, res) => {
  const { venueId } = venueScope(req);
  res.json(db.select().from(staff).where(eq(staff.venueId, venueId)).all().map(publicStaff));
});

router.post("/staff", (req, res) => {
  const parsed = staffSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid staff" });
    return;
  }
  const { venueId } = venueScope(req);
  const now = nowIso();
  const id = newId();
  db.insert(staff)
    .values({
      id,
      venueId,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone?.trim() || null,
      jobRole: parsed.data.jobRole,
      customRole: parsed.data.customRole?.trim() || null,
      permissions: JSON.stringify(parsed.data.permissions),
      payType: parsed.data.payType,
      payAmount: parsed.data.payAmount,
      nationalId: parsed.data.nationalId?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  res.status(201).json(publicStaff(db.select().from(staff).where(eq(staff.id, id)).get()!));
});

router.patch("/staff/:id", (req, res) => {
  const parsed = staffSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid staff" });
    return;
  }
  const { venueId } = venueScope(req);
  const row = db
    .select()
    .from(staff)
    .where(and(eq(staff.id, req.params.id), eq(staff.venueId, venueId)))
    .get();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.update(staff)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone?.trim() || null } : {}),
      ...(parsed.data.jobRole ? { jobRole: parsed.data.jobRole } : {}),
      ...(parsed.data.customRole !== undefined
        ? { customRole: parsed.data.customRole?.trim() || null }
        : {}),
      ...(parsed.data.permissions ? { permissions: JSON.stringify(parsed.data.permissions) } : {}),
      ...(parsed.data.payType ? { payType: parsed.data.payType } : {}),
      ...(parsed.data.payAmount !== undefined ? { payAmount: parsed.data.payAmount } : {}),
      ...(parsed.data.nationalId !== undefined
        ? { nationalId: parsed.data.nationalId?.trim() || null }
        : {}),
      updatedAt: nowIso(),
    })
    .where(eq(staff.id, row.id))
    .run();
  res.json(publicStaff(db.select().from(staff).where(eq(staff.id, row.id)).get()!));
});

router.delete("/staff/:id", (req, res) => {
  const { venueId } = venueScope(req);
  const row = db
    .select()
    .from(staff)
    .where(and(eq(staff.id, req.params.id), eq(staff.venueId, venueId)))
    .get();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.delete(staff).where(eq(staff.id, row.id)).run();
  res.status(204).send();
});

router.get("/staff/:id/documents", (req, res) => {
  const { venueId } = venueScope(req);
  const person = db
    .select()
    .from(staff)
    .where(and(eq(staff.id, req.params.id), eq(staff.venueId, venueId)))
    .get();
  if (!person) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const docs = db.select().from(staffDocuments).where(eq(staffDocuments.staffId, person.id)).all();
  res.json(
    docs.map((d) => ({
      id: d.id,
      staffId: d.staffId,
      kind: d.kind,
      fileName: d.fileName,
      mimeType: d.mimeType,
      createdAt: d.createdAt,
    }))
  );
});

router.post("/staff/:id/documents", (req, res) => {
  const parsed = docSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid document" });
    return;
  }
  const { venueId } = venueScope(req);
  const person = db
    .select()
    .from(staff)
    .where(and(eq(staff.id, req.params.id), eq(staff.venueId, venueId)))
    .get();
  if (!person) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const id = newId();
  const uploadDir = path.join(dataDir, "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const raw = parsed.data.contentBase64.replace(/^data:[^;]+;base64,/, "");
  const storagePath = path.join(uploadDir, `${id}`);
  fs.writeFileSync(storagePath, Buffer.from(raw, "base64"));
  db.insert(staffDocuments)
    .values({
      id,
      staffId: person.id,
      kind: parsed.data.kind,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType ?? null,
      storagePath,
      createdAt: nowIso(),
    })
    .run();
  res.status(201).json({
    id,
    staffId: person.id,
    kind: parsed.data.kind,
    fileName: parsed.data.fileName,
    mimeType: parsed.data.mimeType ?? null,
    createdAt: nowIso(),
  });
});

router.delete("/staff/:staffId/documents/:docId", (req, res) => {
  const { venueId } = venueScope(req);
  const person = db
    .select()
    .from(staff)
    .where(and(eq(staff.id, req.params.staffId), eq(staff.venueId, venueId)))
    .get();
  if (!person) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const doc = db
    .select()
    .from(staffDocuments)
    .where(and(eq(staffDocuments.id, req.params.docId), eq(staffDocuments.staffId, person.id)))
    .get();
  if (!doc) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    fs.unlinkSync(doc.storagePath);
  } catch {
    /* ignore missing file */
  }
  db.delete(staffDocuments).where(eq(staffDocuments.id, doc.id)).run();
  res.status(204).send();
});

// —— Inventory ——

router.get("/inventory", (req, res) => {
  const { venueId } = venueScope(req);
  const department = typeof req.query.department === "string" ? req.query.department : null;
  const rows = db.select().from(inventoryItems).where(eq(inventoryItems.venueId, venueId)).all();
  const filtered = department ? rows.filter((r) => r.department === department) : rows;
  res.json(filtered.map(publicInventory));
});

router.post("/inventory", (req, res) => {
  const parsed = inventorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid item" });
    return;
  }
  const { venueId } = venueScope(req);
  const now = nowIso();
  const id = newId();
  db.insert(inventoryItems)
    .values({
      id,
      venueId,
      department: parsed.data.department,
      name: parsed.data.name.trim(),
      category: parsed.data.category.trim(),
      quantity: parsed.data.quantity,
      unit: parsed.data.unit.trim(),
      minQuantity: parsed.data.minQuantity,
      unitCost: parsed.data.unitCost,
      supplierId: parsed.data.supplierId || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  res
    .status(201)
    .json(publicInventory(db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get()!));
});

router.patch("/inventory/:id", (req, res) => {
  const parsed = inventorySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid item" });
    return;
  }
  const { venueId } = venueScope(req);
  const row = db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, req.params.id), eq(inventoryItems.venueId, venueId)))
    .get();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.update(inventoryItems)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.department ? { department: parsed.data.department } : {}),
      ...(parsed.data.category ? { category: parsed.data.category.trim() } : {}),
      ...(parsed.data.quantity !== undefined ? { quantity: parsed.data.quantity } : {}),
      ...(parsed.data.unit ? { unit: parsed.data.unit.trim() } : {}),
      ...(parsed.data.minQuantity !== undefined ? { minQuantity: parsed.data.minQuantity } : {}),
      ...(parsed.data.unitCost !== undefined ? { unitCost: parsed.data.unitCost } : {}),
      ...(parsed.data.supplierId !== undefined ? { supplierId: parsed.data.supplierId } : {}),
      updatedAt: nowIso(),
    })
    .where(eq(inventoryItems.id, row.id))
    .run();
  res.json(
    publicInventory(db.select().from(inventoryItems).where(eq(inventoryItems.id, row.id)).get()!)
  );
});

router.delete("/inventory/:id", (req, res) => {
  const { venueId } = venueScope(req);
  const row = db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, req.params.id), eq(inventoryItems.venueId, venueId)))
    .get();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.delete(inventoryItems).where(eq(inventoryItems.id, row.id)).run();
  res.status(204).send();
});

// —— Recipes ——

function recipeWithLines(recipeId: string) {
  const row = db.select().from(recipes).where(eq(recipes.id, recipeId)).get();
  if (!row) return null;
  const lines = db.select().from(recipeLines).where(eq(recipeLines.recipeId, recipeId)).all();
  return publicRecipe(row, lines);
}

router.get("/recipes", (req, res) => {
  const { venueId } = venueScope(req);
  const department = typeof req.query.department === "string" ? req.query.department : null;
  const rows = db.select().from(recipes).where(eq(recipes.venueId, venueId)).all();
  const filtered = department ? rows.filter((r) => r.department === department) : rows;
  res.json(filtered.map((r) => recipeWithLines(r.id)!));
});

function replaceLines(recipeId: string, lines: z.infer<typeof recipeLineSchema>[], venueId: string) {
  db.delete(recipeLines).where(eq(recipeLines.recipeId, recipeId)).run();
  for (const line of lines) {
    if (!line.inventoryItemId && !line.subRecipeId) continue;
    if (line.subRecipeId === recipeId) continue;
    if (line.inventoryItemId) {
      const item = db
        .select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.id, line.inventoryItemId), eq(inventoryItems.venueId, venueId)))
        .get();
      if (!item) continue;
    }
    if (line.subRecipeId) {
      const sub = db
        .select()
        .from(recipes)
        .where(and(eq(recipes.id, line.subRecipeId), eq(recipes.venueId, venueId)))
        .get();
      if (!sub) continue;
    }
    db.insert(recipeLines)
      .values({
        id: newId(),
        recipeId,
        inventoryItemId: line.inventoryItemId || null,
        subRecipeId: line.subRecipeId || null,
        quantity: line.quantity,
        unit: line.unit,
      })
      .run();
  }
}

router.post("/recipes", (req, res) => {
  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid recipe" });
    return;
  }
  const { venueId } = venueScope(req);
  const now = nowIso();
  const id = newId();
  db.insert(recipes)
    .values({
      id,
      venueId,
      department: parsed.data.department,
      name: parsed.data.name.trim(),
      kind: parsed.data.kind.trim(),
      notes: parsed.data.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  replaceLines(id, parsed.data.lines, venueId);
  res.status(201).json(recipeWithLines(id));
});

router.patch("/recipes/:id", (req, res) => {
  const parsed = recipeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid recipe" });
    return;
  }
  const { venueId } = venueScope(req);
  const row = db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, req.params.id), eq(recipes.venueId, venueId)))
    .get();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.update(recipes)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.department ? { department: parsed.data.department } : {}),
      ...(parsed.data.kind ? { kind: parsed.data.kind.trim() } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes?.trim() || null } : {}),
      updatedAt: nowIso(),
    })
    .where(eq(recipes.id, row.id))
    .run();
  if (parsed.data.lines) replaceLines(row.id, parsed.data.lines, venueId);
  res.json(recipeWithLines(row.id));
});

router.delete("/recipes/:id", (req, res) => {
  const { venueId } = venueScope(req);
  const row = db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, req.params.id), eq(recipes.venueId, venueId)))
    .get();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.delete(recipes).where(eq(recipes.id, row.id)).run();
  res.status(204).send();
});

// —— Suppliers ——

router.get("/suppliers", (req, res) => {
  const { venueId } = venueScope(req);
  const list = db.select().from(suppliers).where(eq(suppliers.venueId, venueId)).all();
  const items = db.select().from(inventoryItems).where(eq(inventoryItems.venueId, venueId)).all();
  res.json(
    list.map((s) => {
      const linked = items.filter((i) => i.supplierId === s.id).map(publicInventory);
      return {
        ...publicSupplier(s),
        items: linked,
        lowStockItems: linked.filter((i) => i.belowMin),
      };
    })
  );
});

router.post("/suppliers", (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid supplier" });
    return;
  }
  const { venueId } = venueScope(req);
  const now = nowIso();
  const id = newId();
  db.insert(suppliers)
    .values({
      id,
      venueId,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone?.trim() || null,
      whatSupplies: parsed.data.whatSupplies?.trim() || null,
      scheduleNote: parsed.data.scheduleNote?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  res.status(201).json({
    ...publicSupplier(db.select().from(suppliers).where(eq(suppliers.id, id)).get()!),
    items: [],
    lowStockItems: [],
  });
});

router.patch("/suppliers/:id", (req, res) => {
  const parsed = supplierSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid supplier" });
    return;
  }
  const { venueId } = venueScope(req);
  const row = db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, req.params.id), eq(suppliers.venueId, venueId)))
    .get();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.update(suppliers)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone?.trim() || null } : {}),
      ...(parsed.data.whatSupplies !== undefined
        ? { whatSupplies: parsed.data.whatSupplies?.trim() || null }
        : {}),
      ...(parsed.data.scheduleNote !== undefined
        ? { scheduleNote: parsed.data.scheduleNote?.trim() || null }
        : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes?.trim() || null } : {}),
      updatedAt: nowIso(),
    })
    .where(eq(suppliers.id, row.id))
    .run();
  res.json(publicSupplier(db.select().from(suppliers).where(eq(suppliers.id, row.id)).get()!));
});

router.delete("/suppliers/:id", (req, res) => {
  const { venueId } = venueScope(req);
  const row = db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, req.params.id), eq(suppliers.venueId, venueId)))
    .get();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.delete(suppliers).where(eq(suppliers.id, row.id)).run();
  res.status(204).send();
});

// —— Finance ——

function monthBounds(ym: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const last = new Date(year, month, 0).getDate();
  return {
    start: `${m[1]}-${m[2]}-01`,
    end: `${m[1]}-${m[2]}-${String(last).padStart(2, "0")}`,
  };
}

function publicLedger(row: typeof ledgerEntries.$inferSelect) {
  return {
    id: row.id,
    venueId: row.venueId,
    date: row.date,
    kind: row.kind,
    amount: row.amount,
    note: row.note,
    createdAt: row.createdAt,
  };
}

const ledgerSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["revenue", "expense"]),
  amount: z.number().positive(),
  note: z.string().optional().nullable(),
});

router.get("/finance/summary", (req, res) => {
  const { venueId } = venueScope(req);
  const now = new Date();
  const month =
    typeof req.query.month === "string"
      ? req.query.month
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const bounds = monthBounds(month);
  if (!bounds) {
    res.status(400).json({ error: "Invalid month" });
    return;
  }
  const rows = db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.venueId, venueId))
    .all()
    .filter((r) => r.date >= bounds.start && r.date <= bounds.end)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const revenue = rows.filter((r) => r.kind === "revenue").reduce((s, r) => s + r.amount, 0);
  const expenses = rows.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);

  const staffRows = db.select().from(staff).where(eq(staff.venueId, venueId)).all();
  const staffById = new Map(staffRows.map((s) => [s.id, s]));
  const monthShifts = db
    .select()
    .from(workShifts)
    .where(eq(workShifts.venueId, venueId))
    .all()
    .filter((s) => s.startsAt.slice(0, 10) >= bounds.start && s.startsAt.slice(0, 10) <= bounds.end);

  const byStaffMap = new Map<
    string,
    { staffId: string; staffName: string; hours: number; laborCost: number; payType: string }
  >();
  let laborCost = 0;
  let laborHours = 0;
  for (const sh of monthShifts) {
    const member = staffById.get(sh.staffId);
    if (!member) continue;
    const calc = shiftLaborCost({
      payType: member.payType,
      payAmount: member.payAmount,
      startsAt: sh.startsAt,
      endsAt: sh.endsAt,
    });
    laborCost += calc.laborCost;
    laborHours += calc.hours;
    const prev = byStaffMap.get(member.id) ?? {
      staffId: member.id,
      staffName: member.name,
      hours: 0,
      laborCost: 0,
      payType: member.payType,
    };
    prev.hours += calc.hours;
    prev.laborCost += calc.laborCost;
    byStaffMap.set(member.id, prev);
  }
  laborCost = Math.round(laborCost * 100) / 100;
  laborHours = Math.round(laborHours * 100) / 100;
  const staffLabor = [...byStaffMap.values()]
    .map((s) => ({
      ...s,
      hours: Math.round(s.hours * 100) / 100,
      laborCost: Math.round(s.laborCost * 100) / 100,
    }))
    .sort((a, b) => b.laborCost - a.laborCost);

  const totalExpenses = Math.round((expenses + laborCost) * 100) / 100;
  const profitAfterLabor = Math.round((revenue - totalExpenses) * 100) / 100;

  res.json({
    month,
    revenue: Math.round(revenue * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    laborCost,
    laborHours,
    totalExpenses,
    profit: Math.round((revenue - expenses) * 100) / 100,
    profitAfterLabor,
    staffLabor,
    entries: rows.map(publicLedger),
  });
});

router.post("/finance/entries", (req, res) => {
  const parsed = ledgerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid entry" });
    return;
  }
  const { venueId } = venueScope(req);
  const id = newId();
  db.insert(ledgerEntries)
    .values({
      id,
      venueId,
      date: parsed.data.date,
      kind: parsed.data.kind,
      amount: parsed.data.amount,
      note: parsed.data.note?.trim() || null,
      createdAt: nowIso(),
    })
    .run();
  res.status(201).json(publicLedger(db.select().from(ledgerEntries).where(eq(ledgerEntries.id, id)).get()!));
});

router.delete("/finance/entries/:id", (req, res) => {
  const { venueId } = venueScope(req);
  const row = db
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.id, req.params.id), eq(ledgerEntries.venueId, venueId)))
    .get();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.delete(ledgerEntries).where(eq(ledgerEntries.id, row.id)).run();
  res.status(204).send();
});

// —— Schedule ——

function publicShift(
  row: typeof workShifts.$inferSelect,
  member: { name: string; payType: string; payAmount: number } | null
) {
  const calc = member
    ? shiftLaborCost({
        payType: member.payType,
        payAmount: member.payAmount,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      })
    : { hours: 0, laborCost: 0, hourlyRate: 0 };
  return {
    id: row.id,
    venueId: row.venueId,
    staffId: row.staffId,
    staffName: member?.name ?? "",
    payType: member?.payType ?? null,
    payAmount: member?.payAmount ?? 0,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    note: row.note,
    hours: calc.hours,
    laborCost: calc.laborCost,
    hourlyRate: calc.hourlyRate,
    createdAt: row.createdAt,
  };
}

const shiftSchema = z.object({
  staffId: z.string().min(1),
  startsAt: z.string().min(10),
  endsAt: z.string().min(10),
  note: z.string().optional().nullable(),
});

router.get("/schedule", (req, res) => {
  const { venueId } = venueScope(req);
  const from = typeof req.query.from === "string" ? req.query.from : "";
  const to = typeof req.query.to === "string" ? req.query.to : "";
  const staffRows = db.select().from(staff).where(eq(staff.venueId, venueId)).all();
  const byId = new Map(staffRows.map((s) => [s.id, s]));
  const rows = db
    .select()
    .from(workShifts)
    .where(eq(workShifts.venueId, venueId))
    .all()
    .filter((s) => {
      if (from && s.startsAt < from) return false;
      if (to && s.startsAt > to) return false;
      return true;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const shifts = rows.map((r) => publicShift(r, byId.get(r.staffId) ?? null));
  const weekLaborCost = Math.round(shifts.reduce((s, sh) => s + sh.laborCost, 0) * 100) / 100;
  const weekHours = Math.round(shifts.reduce((s, sh) => s + sh.hours, 0) * 100) / 100;
  res.json({ shifts, weekLaborCost, weekHours });
});

router.post("/schedule", (req, res) => {
  const parsed = shiftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid shift" });
    return;
  }
  const { venueId } = venueScope(req);
  const member = db
    .select()
    .from(staff)
    .where(and(eq(staff.id, parsed.data.staffId), eq(staff.venueId, venueId)))
    .get();
  if (!member) {
    res.status(400).json({ error: "Staff not found" });
    return;
  }
  if (parsed.data.endsAt <= parsed.data.startsAt) {
    res.status(400).json({ error: "End must be after start" });
    return;
  }
  const id = newId();
  db.insert(workShifts)
    .values({
      id,
      venueId,
      staffId: member.id,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      note: parsed.data.note?.trim() || null,
      createdAt: nowIso(),
    })
    .run();
  res
    .status(201)
    .json(publicShift(db.select().from(workShifts).where(eq(workShifts.id, id)).get()!, member));
});

router.delete("/schedule/:id", (req, res) => {
  const { venueId } = venueScope(req);
  const row = db
    .select()
    .from(workShifts)
    .where(and(eq(workShifts.id, req.params.id), eq(workShifts.venueId, venueId)))
    .get();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  db.delete(workShifts).where(eq(workShifts.id, row.id)).run();
  res.status(204).send();
});

export default router;
