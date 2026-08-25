import { eq } from "drizzle-orm";

import { db } from "../db";
import {
  inventoryItems,
  ledgerEntries,
  organizations,
  owners,
  recipeLines,
  recipes,
  staff,
  suppliers,
  venues,
  workShifts,
} from "../db/schema";
import { newId, nowIso } from "../middleware/auth";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

/** Fill the demo venue so investor walkthrough isn't empty. Idempotent. */
export function seedOwnerDemoVenue(venueId: string): void {
  const existingStaff = db.select().from(staff).where(eq(staff.venueId, venueId)).all();
  if (existingStaff.length > 0) return;

  const now = nowIso();
  const today = new Date();

  const bartId = newId();
  const waitId = newId();
  const cookId = newId();
  const hostId = newId();

  for (const row of [
    {
      id: bartId,
      name: "נועם כהן",
      phone: "0521112233",
      jobRole: "bartender",
      customRole: null as string | null,
      permissions: JSON.stringify(["view_stock", "edit_stock", "run_shift"]),
      payType: "hourly",
      payAmount: 48,
      nationalId: "301112223",
    },
    {
      id: waitId,
      name: "מיכל לוי",
      phone: "0542223344",
      jobRole: "waiter",
      customRole: null,
      permissions: JSON.stringify(["run_shift", "view_reports"]),
      payType: "hourly",
      payAmount: 42,
      nationalId: "302223334",
    },
    {
      id: cookId,
      name: "אנדריי סמירנוב",
      phone: "0503334455",
      jobRole: "cook",
      customRole: null,
      permissions: JSON.stringify(["view_stock", "manage_recipes"]),
      payType: "monthly",
      payAmount: 12500,
      nationalId: "303334445",
    },
    {
      id: hostId,
      name: "דנה אברהם",
      phone: "0534445566",
      jobRole: "custom",
      customRole: "אחראית משמרת",
      permissions: JSON.stringify([
        "view_stock",
        "edit_stock",
        "manage_staff",
        "run_shift",
        "view_reports",
      ]),
      payType: "monthly",
      payAmount: 14000,
      nationalId: "304445556",
    },
  ]) {
    db.insert(staff)
      .values({
        id: row.id,
        venueId,
        name: row.name,
        phone: row.phone,
        jobRole: row.jobRole,
        customRole: row.customRole,
        permissions: row.permissions,
        payType: row.payType,
        payAmount: row.payAmount,
        nationalId: row.nationalId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  const supBar = newId();
  const supKit = newId();
  db.insert(suppliers)
    .values({
      id: supBar,
      venueId,
      name: "יין ואלכוהול ת״א",
      phone: "03-5551212",
      whatSupplies: "וודקה, ג׳ין, ויסקי, יין",
      scheduleNote: "א׳ ג׳ ה׳ בבוקר",
      notes: "הזמנה עד 12:00 ליום למחרת",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(suppliers)
    .values({
      id: supKit,
      venueId,
      name: "טרי פוד מרקט",
      phone: "03-5553434",
      whatSupplies: "ירקות, בשר, דגים",
      scheduleNote: "כל יום עד 10:00",
      notes: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const vodka = newId();
  const gin = newId();
  const lime = newId();
  const mint = newId();
  const ice = newId();
  const cola = newId();
  const salmon = newId();
  const cream = newId();
  const pasta = newId();

  const inv: {
    id: string;
    department: "bar" | "kitchen";
    name: string;
    category: string;
    quantity: number;
    unit: string;
    minQuantity: number;
    unitCost: number;
    supplierId: string | null;
  }[] = [
    { id: vodka, department: "bar", name: "וודקה Absolut 1L", category: "spirits", quantity: 6, unit: "בק׳", minQuantity: 4, unitCost: 85, supplierId: supBar },
    { id: gin, department: "bar", name: "ג׳ין Bombay 1L", category: "spirits", quantity: 3, unit: "בק׳", minQuantity: 3, unitCost: 95, supplierId: supBar },
    { id: lime, department: "bar", name: "ליים", category: "fresh", quantity: 1.2, unit: "ק״ג", minQuantity: 2, unitCost: 18, supplierId: supKit },
    { id: mint, department: "bar", name: "נענע טרייה", category: "fresh", quantity: 8, unit: "צרור", minQuantity: 5, unitCost: 6, supplierId: supKit },
    { id: ice, department: "bar", name: "קרח", category: "other", quantity: 40, unit: "ק״ג", minQuantity: 20, unitCost: 2, supplierId: null },
    { id: cola, department: "bar", name: "Coca-Cola 0.33", category: "mixers", quantity: 48, unit: "יח׳", minQuantity: 24, unitCost: 2.5, supplierId: null },
    { id: salmon, department: "kitchen", name: "סלמון טרי", category: "protein", quantity: 2.5, unit: "ק״ג", minQuantity: 3, unitCost: 95, supplierId: supKit },
    { id: cream, department: "kitchen", name: "שמנת 38%", category: "dairy", quantity: 4, unit: "ל׳", minQuantity: 2, unitCost: 22, supplierId: null },
    { id: pasta, department: "kitchen", name: "פסטה פנה", category: "dry", quantity: 8, unit: "ק״ג", minQuantity: 3, unitCost: 12, supplierId: null },
  ];

  for (const item of inv) {
    db.insert(inventoryItems)
      .values({
        id: item.id,
        venueId,
        department: item.department,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minQuantity: item.minQuantity,
        unitCost: item.unitCost,
        supplierId: item.supplierId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  const mojito = newId();
  const ginTonic = newId();
  const pastaDish = newId();

  db.insert(recipes)
    .values({
      id: mojito,
      venueId,
      department: "bar",
      name: "מוחיטו",
      kind: "cocktail",
      notes: "קלאסי · כוס היי־בול",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  for (const line of [
    { inventoryItemId: vodka, quantity: 0.05, unit: "בק׳" },
    { inventoryItemId: lime, quantity: 0.03, unit: "ק״ג" },
    { inventoryItemId: mint, quantity: 0.25, unit: "צרור" },
    { inventoryItemId: ice, quantity: 0.15, unit: "ק״ג" },
    { inventoryItemId: cola, quantity: 1, unit: "יח׳" },
  ]) {
    db.insert(recipeLines)
      .values({
        id: newId(),
        recipeId: mojito,
        inventoryItemId: line.inventoryItemId,
        subRecipeId: null,
        quantity: line.quantity,
        unit: line.unit,
      })
      .run();
  }

  db.insert(recipes)
    .values({
      id: ginTonic,
      venueId,
      department: "bar",
      name: "ג׳ין טוניק",
      kind: "cocktail",
      notes: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  for (const line of [
    { inventoryItemId: gin, quantity: 0.05, unit: "בק׳" },
    { inventoryItemId: lime, quantity: 0.02, unit: "ק״ג" },
    { inventoryItemId: ice, quantity: 0.12, unit: "ק״ג" },
  ]) {
    db.insert(recipeLines)
      .values({
        id: newId(),
        recipeId: ginTonic,
        inventoryItemId: line.inventoryItemId,
        subRecipeId: null,
        quantity: line.quantity,
        unit: line.unit,
      })
      .run();
  }

  db.insert(recipes)
    .values({
      id: pastaDish,
      venueId,
      department: "kitchen",
      name: "פנה סלמון שמנת",
      kind: "dish",
      notes: "מנה עיקרית",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  for (const line of [
    { inventoryItemId: pasta, quantity: 0.12, unit: "ק״ג" },
    { inventoryItemId: salmon, quantity: 0.14, unit: "ק״ג" },
    { inventoryItemId: cream, quantity: 0.08, unit: "ל׳" },
  ]) {
    db.insert(recipeLines)
      .values({
        id: newId(),
        recipeId: pastaDish,
        inventoryItemId: line.inventoryItemId,
        subRecipeId: null,
        quantity: line.quantity,
        unit: line.unit,
      })
      .run();
  }

  for (const e of [
    { offset: -1, kind: "revenue" as const, amount: 18400, note: "קופה ערב שבת" },
    { offset: -2, kind: "revenue" as const, amount: 12100, note: "צהריים + ערב" },
    { offset: -3, kind: "expense" as const, amount: 4200, note: "הזמנת אלכוהול" },
    { offset: -4, kind: "revenue" as const, amount: 9800, note: "ערב חול" },
    { offset: -5, kind: "expense" as const, amount: 2650, note: "ירקות ובשר" },
    { offset: -6, kind: "revenue" as const, amount: 15200, note: "אירוע פרטי" },
    { offset: -10, kind: "revenue" as const, amount: 11300, note: "סוף שבוע" },
    { offset: -12, kind: "expense" as const, amount: 890, note: "ניקיון + כביסה" },
    { offset: 0, kind: "revenue" as const, amount: 7600, note: "בוקר עד עכשיו" },
  ]) {
    db.insert(ledgerEntries)
      .values({
        id: newId(),
        venueId,
        date: ymd(addDays(today, e.offset)),
        kind: e.kind,
        amount: e.amount,
        note: e.note,
        createdAt: now,
      })
      .run();
  }

  const week = startOfWeek(today);
  const shiftPlan: { day: number; staffId: string; start: string; end: string; note: string | null }[] = [
    { day: 0, staffId: bartId, start: "18:00", end: "02:00", note: "בר פתיחה" },
    { day: 0, staffId: waitId, start: "18:00", end: "00:00", note: null },
    { day: 1, staffId: hostId, start: "16:00", end: "00:00", note: "אחראית" },
    { day: 1, staffId: cookId, start: "15:00", end: "23:00", note: "מטבח" },
    { day: 2, staffId: bartId, start: "17:00", end: "01:00", note: null },
    { day: 3, staffId: waitId, start: "12:00", end: "20:00", note: "צהריים" },
    { day: 4, staffId: cookId, start: "16:00", end: "00:00", note: null },
    { day: 4, staffId: bartId, start: "18:00", end: "02:00", note: "שישי" },
    { day: 5, staffId: hostId, start: "18:00", end: "03:00", note: "שישי ערב" },
    { day: 5, staffId: waitId, start: "18:00", end: "02:00", note: null },
    { day: 6, staffId: bartId, start: "17:00", end: "01:00", note: "שבת" },
    { day: 6, staffId: cookId, start: "16:00", end: "23:00", note: null },
  ];

  for (const s of shiftPlan) {
    const day = addDays(week, s.day);
    const date = ymd(day);
    const startH = Number(s.start.slice(0, 2));
    const endH = Number(s.end.slice(0, 2));
    const endDate = endH < startH ? ymd(addDays(day, 1)) : date;
    db.insert(workShifts)
      .values({
        id: newId(),
        venueId,
        staffId: s.staffId,
        startsAt: `${date}T${s.start}`,
        endsAt: `${endDate}T${s.end}`,
        note: s.note,
        createdAt: now,
      })
      .run();
  }

  console.log(`Seeded investor demo data for venue ${venueId}`);
}

export function seedDemoForOwnerPhone(phone: string): void {
  const owner = db.select().from(owners).where(eq(owners.phone, phone)).get();
  if (!owner) return;
  const org = db.select().from(organizations).where(eq(organizations.ownerId, owner.id)).get();
  if (!org) return;
  const venue = db.select().from(venues).where(eq(venues.organizationId, org.id)).all()[0];
  if (!venue) return;

  db.update(owners)
    .set({ name: "יובל מזרחי", updatedAt: nowIso() })
    .where(eq(owners.id, owner.id))
    .run();
  db.update(organizations)
    .set({ name: "רשת ברים מזרחי", updatedAt: nowIso() })
    .where(eq(organizations.id, org.id))
    .run();
  db.update(venues)
    .set({ name: "בר רוטשילד", kind: "bar", address: "רוטשילד 45, תל אביב", updatedAt: nowIso() })
    .where(eq(venues.id, venue.id))
    .run();

  seedOwnerDemoVenue(venue.id);
}
