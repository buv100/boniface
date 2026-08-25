import { eq, inArray } from "drizzle-orm";

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

/** Marker recipe — if missing, wipe and re-seed (meat / pareve only, no dairy). */
const SEED_MARKER_RECIPE = "אנטריקוט צרוב · בשרי";

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

function clearVenueOps(venueId: string): void {
  const recipeIds = db
    .select()
    .from(recipes)
    .where(eq(recipes.venueId, venueId))
    .all()
    .map((r) => r.id);
  if (recipeIds.length) {
    db.delete(recipeLines).where(inArray(recipeLines.recipeId, recipeIds)).run();
  }
  db.delete(recipes).where(eq(recipes.venueId, venueId)).run();
  db.delete(inventoryItems).where(eq(inventoryItems.venueId, venueId)).run();
  db.delete(suppliers).where(eq(suppliers.venueId, venueId)).run();
  db.delete(ledgerEntries).where(eq(ledgerEntries.venueId, venueId)).run();
  db.delete(workShifts).where(eq(workShifts.venueId, venueId)).run();
  db.delete(staff).where(eq(staff.venueId, venueId)).run();
}

/** Fill the demo venue — kosher meat kitchen (בשרי + פרווה only, no dairy). */
export function seedOwnerDemoVenue(venueId: string): void {
  const hasMarker = db
    .select()
    .from(recipes)
    .where(eq(recipes.venueId, venueId))
    .all()
    .some((r) => r.name === SEED_MARKER_RECIPE);
  if (hasMarker) return;

  clearVenueOps(venueId);

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

  const supAlcohol = newId();
  const supMeat = newId();
  const supProduce = newId();
  const supDry = newId();

  db.insert(suppliers)
    .values({
      id: supAlcohol,
      venueId,
      name: "יין ואלכוהול כשר ת״א",
      phone: "03-5551212",
      whatSupplies: "וודקה, ג׳ין, ויסקי, יין אדום — הכל כשר פרווה",
      scheduleNote: "א׳ ג׳ ה׳ עד 12:00",
      notes: "פרווה בלבד · ללא חלב",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(suppliers)
    .values({
      id: supMeat,
      venueId,
      name: "בשר גלאט מרכז",
      phone: "03-5559898",
      whatSupplies: "בקר, עוף, כבש — כשר למהדרין בשרי",
      scheduleNote: "א׳–ה׳ בוקר",
      notes: "בשרי בלבד · אין חלבי",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(suppliers)
    .values({
      id: supProduce,
      venueId,
      name: "ירק ופירות השדה",
      phone: "03-5553434",
      whatSupplies: "ירקות, פירות, עשבים — פרווה",
      scheduleNote: "כל יום עד 10:00",
      notes: "פרווה",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(suppliers)
    .values({
      id: supDry,
      venueId,
      name: "מזווה כשר סיטונאות",
      phone: "08-6662211",
      whatSupplies: "שמן, אורז, פסטה, תבלינים, קמח — פרווה",
      scheduleNote: "ג׳ פעם בשבוע",
      notes: "פרווה · ללא מוצרי חלב",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  type Inv = {
    key: string;
    department: "bar" | "kitchen";
    name: string;
    category: string;
    kashrut: "בשרי" | "פרווה";
    quantity: number;
    unit: string;
    minQuantity: number;
    unitCost: number;
    supplierId: string;
  };

  const invDefs: Inv[] = [
    // —— בר · פרווה ——
    { key: "vodka", department: "bar", name: "וודקה Absolut 1L", category: "אלכוהול", kashrut: "פרווה", quantity: 8, unit: "בק׳", minQuantity: 4, unitCost: 89, supplierId: supAlcohol },
    { key: "gin", department: "bar", name: "ג׳ין Bombay 1L", category: "אלכוהול", kashrut: "פרווה", quantity: 5, unit: "בק׳", minQuantity: 3, unitCost: 98, supplierId: supAlcohol },
    { key: "whisky", department: "bar", name: "ויסקי Jack Daniel's 0.7L", category: "אלכוהול", kashrut: "פרווה", quantity: 4, unit: "בק׳", minQuantity: 2, unitCost: 135, supplierId: supAlcohol },
    { key: "rum", department: "bar", name: "רום Bacardi 1L", category: "אלכוהול", kashrut: "פרווה", quantity: 4, unit: "בק׳", minQuantity: 2, unitCost: 92, supplierId: supAlcohol },
    { key: "tequila", department: "bar", name: "טקילה Olmeca 0.7L", category: "אלכוהול", kashrut: "פרווה", quantity: 3, unit: "בק׳", minQuantity: 2, unitCost: 110, supplierId: supAlcohol },
    { key: "vermouth", department: "bar", name: "ורמוט יבש כשר", category: "אלכוהול", kashrut: "פרווה", quantity: 3, unit: "בק׳", minQuantity: 1, unitCost: 48, supplierId: supAlcohol },
    { key: "wine", department: "bar", name: "יין אדום קברנה כשר", category: "יין", kashrut: "פרווה", quantity: 18, unit: "בק׳", minQuantity: 8, unitCost: 42, supplierId: supAlcohol },
    { key: "wineWhite", department: "bar", name: "יין לבן שרדונה כשר", category: "יין", kashrut: "פרווה", quantity: 12, unit: "בק׳", minQuantity: 6, unitCost: 38, supplierId: supAlcohol },
    { key: "beer", department: "bar", name: "בירה Goldstar 0.5", category: "בירה", kashrut: "פרווה", quantity: 60, unit: "יח׳", minQuantity: 24, unitCost: 6.5, supplierId: supAlcohol },
    { key: "beerWeiss", department: "bar", name: "בירה חיטה 0.5", category: "בירה", kashrut: "פרווה", quantity: 36, unit: "יח׳", minQuantity: 12, unitCost: 7.5, supplierId: supAlcohol },
    { key: "cola", department: "bar", name: "Coca-Cola 0.33", category: "מיקסרים", kashrut: "פרווה", quantity: 72, unit: "יח׳", minQuantity: 24, unitCost: 2.8, supplierId: supDry },
    { key: "sprite", department: "bar", name: "Sprite 0.33", category: "מיקסרים", kashrut: "פרווה", quantity: 48, unit: "יח׳", minQuantity: 18, unitCost: 2.8, supplierId: supDry },
    { key: "tonic", department: "bar", name: "טוניק Fever-Tree", category: "מיקסרים", kashrut: "פרווה", quantity: 36, unit: "יח׳", minQuantity: 12, unitCost: 7, supplierId: supDry },
    { key: "gingerBeer", department: "bar", name: "ג׳ינג׳ר ביר", category: "מיקסרים", kashrut: "פרווה", quantity: 24, unit: "יח׳", minQuantity: 10, unitCost: 6.5, supplierId: supDry },
    { key: "soda", department: "bar", name: "סודה", category: "מיקסרים", kashrut: "פרווה", quantity: 40, unit: "יח׳", minQuantity: 16, unitCost: 2.2, supplierId: supDry },
    { key: "energy", department: "bar", name: "משקה אנרגיה", category: "מיקסרים", kashrut: "פרווה", quantity: 30, unit: "יח׳", minQuantity: 12, unitCost: 5.5, supplierId: supDry },
    { key: "lime", department: "bar", name: "ליים", category: "פירות", kashrut: "פרווה", quantity: 3.5, unit: "ק״ג", minQuantity: 2, unitCost: 22, supplierId: supProduce },
    { key: "lemon", department: "bar", name: "לימון", category: "פירות", kashrut: "פרווה", quantity: 4, unit: "ק״ג", minQuantity: 2, unitCost: 12, supplierId: supProduce },
    { key: "orange", department: "bar", name: "תפוז", category: "פירות", kashrut: "פרווה", quantity: 5, unit: "ק״ג", minQuantity: 2, unitCost: 10, supplierId: supProduce },
    { key: "cucumber", department: "bar", name: "מלפפון", category: "ירקות", kashrut: "פרווה", quantity: 4, unit: "ק״ג", minQuantity: 1.5, unitCost: 8, supplierId: supProduce },
    { key: "mint", department: "bar", name: "נענע טרייה", category: "עשבים", kashrut: "פרווה", quantity: 12, unit: "צרור", minQuantity: 5, unitCost: 7, supplierId: supProduce },
    { key: "basil", department: "bar", name: "בזיליקום", category: "עשבים", kashrut: "פרווה", quantity: 8, unit: "צרור", minQuantity: 3, unitCost: 9, supplierId: supProduce },
    { key: "ice", department: "bar", name: "קרח", category: "אחר", kashrut: "פרווה", quantity: 50, unit: "ק״ג", minQuantity: 20, unitCost: 2, supplierId: supDry },
    { key: "sugar", department: "bar", name: "סוכר קנים", category: "מתיקים", kashrut: "פרווה", quantity: 6, unit: "ק״ג", minQuantity: 2, unitCost: 8, supplierId: supDry },
    { key: "syrup", department: "bar", name: "סירופ סוכר פשוט", category: "מתיקים", kashrut: "פרווה", quantity: 4, unit: "ל׳", minQuantity: 1.5, unitCost: 14, supplierId: supDry },
    { key: "coffee", department: "bar", name: "קפה שחור שעועית", category: "קפה", kashrut: "פרווה", quantity: 5, unit: "ק״ג", minQuantity: 2, unitCost: 55, supplierId: supDry },

    // —— מטבח · בשרי ——
    { key: "entrecote", department: "kitchen", name: "אנטריקוט בקר", category: "בשר בקר", kashrut: "בשרי", quantity: 12, unit: "ק״ג", minQuantity: 5, unitCost: 118, supplierId: supMeat },
    { key: "asado", department: "kitchen", name: "אסאדו", category: "בשר בקר", kashrut: "בשרי", quantity: 8, unit: "ק״ג", minQuantity: 4, unitCost: 72, supplierId: supMeat },
    { key: "brisket", department: "kitchen", name: "בריסקט", category: "בשר בקר", kashrut: "בשרי", quantity: 7, unit: "ק״ג", minQuantity: 3, unitCost: 68, supplierId: supMeat },
    { key: "groundBeef", department: "kitchen", name: "בשר בקר טחון", category: "בשר בקר", kashrut: "בשרי", quantity: 10, unit: "ק״ג", minQuantity: 4, unitCost: 58, supplierId: supMeat },
    { key: "shortRib", department: "kitchen", name: "צלעות קצרות", category: "בשר בקר", kashrut: "בשרי", quantity: 5, unit: "ק״ג", minQuantity: 2, unitCost: 85, supplierId: supMeat },
    { key: "chicken", department: "kitchen", name: "חזה עוף", category: "עוף", kashrut: "בשרי", quantity: 15, unit: "ק״ג", minQuantity: 6, unitCost: 38, supplierId: supMeat },
    { key: "wings", department: "kitchen", name: "כנפיים עוף", category: "עוף", kashrut: "בשרי", quantity: 10, unit: "ק״ג", minQuantity: 4, unitCost: 28, supplierId: supMeat },
    { key: "thighs", department: "kitchen", name: "ירכיים עוף", category: "עוף", kashrut: "בשרי", quantity: 9, unit: "ק״ג", minQuantity: 4, unitCost: 26, supplierId: supMeat },
    { key: "turkey", department: "kitchen", name: "חזה הודו", category: "עוף", kashrut: "בשרי", quantity: 6, unit: "ק״ג", minQuantity: 2.5, unitCost: 45, supplierId: supMeat },
    { key: "lamb", department: "kitchen", name: "כתף כבש", category: "כבש", kashrut: "בשרי", quantity: 6, unit: "ק״ג", minQuantity: 3, unitCost: 95, supplierId: supMeat },
    { key: "lambChop", department: "kitchen", name: "צלעות כבש", category: "כבש", kashrut: "בשרי", quantity: 4, unit: "ק״ג", minQuantity: 2, unitCost: 128, supplierId: supMeat },
    { key: "liver", department: "kitchen", name: "כבד עוף", category: "עוף", kashrut: "בשרי", quantity: 3, unit: "ק״ג", minQuantity: 1.5, unitCost: 32, supplierId: supMeat },
    { key: "sausage", department: "kitchen", name: "נקניקיות בקר כשרות", category: "בשר בקר", kashrut: "בשרי", quantity: 8, unit: "ק״ג", minQuantity: 3, unitCost: 42, supplierId: supMeat },
    { key: "broth", department: "kitchen", name: "מרק בשר מרוכז", category: "בסיסים", kashrut: "בשרי", quantity: 6, unit: "ל׳", minQuantity: 2, unitCost: 18, supplierId: supMeat },

    // —— מטבח · פרווה ——
    { key: "potato", department: "kitchen", name: "תפוח אדמה", category: "ירקות", kashrut: "פרווה", quantity: 25, unit: "ק״ג", minQuantity: 10, unitCost: 4.5, supplierId: supProduce },
    { key: "onion", department: "kitchen", name: "בצל", category: "ירקות", kashrut: "פרווה", quantity: 12, unit: "ק״ג", minQuantity: 4, unitCost: 5, supplierId: supProduce },
    { key: "garlic", department: "kitchen", name: "שום", category: "ירקות", kashrut: "פרווה", quantity: 3, unit: "ק״ג", minQuantity: 1, unitCost: 28, supplierId: supProduce },
    { key: "tomato", department: "kitchen", name: "עגבניות", category: "ירקות", kashrut: "פרווה", quantity: 8, unit: "ק״ג", minQuantity: 3, unitCost: 9, supplierId: supProduce },
    { key: "lettuce", department: "kitchen", name: "חסה", category: "ירקות", kashrut: "פרווה", quantity: 10, unit: "יח׳", minQuantity: 4, unitCost: 6, supplierId: supProduce },
    { key: "pepper", department: "kitchen", name: "פלפל אדום", category: "ירקות", kashrut: "פרווה", quantity: 5, unit: "ק״ג", minQuantity: 2, unitCost: 14, supplierId: supProduce },
    { key: "carrot", department: "kitchen", name: "גזר", category: "ירקות", kashrut: "פרווה", quantity: 8, unit: "ק״ג", minQuantity: 3, unitCost: 5.5, supplierId: supProduce },
    { key: "eggplant", department: "kitchen", name: "חציל", category: "ירקות", kashrut: "פרווה", quantity: 6, unit: "ק״ג", minQuantity: 2, unitCost: 11, supplierId: supProduce },
    { key: "zucchini", department: "kitchen", name: "קישוא", category: "ירקות", kashrut: "פרווה", quantity: 5, unit: "ק״ג", minQuantity: 2, unitCost: 9, supplierId: supProduce },
    { key: "mushroom", department: "kitchen", name: "פטריות שמפיניון", category: "ירקות", kashrut: "פרווה", quantity: 4, unit: "ק״ג", minQuantity: 1.5, unitCost: 22, supplierId: supProduce },
    { key: "parsley", department: "kitchen", name: "פטרוזיליה", category: "עשבים", kashrut: "פרווה", quantity: 10, unit: "צרור", minQuantity: 4, unitCost: 4, supplierId: supProduce },
    { key: "oil", department: "kitchen", name: "שמן זית", category: "שמנים", kashrut: "פרווה", quantity: 8, unit: "ל׳", minQuantity: 3, unitCost: 35, supplierId: supDry },
    { key: "fryOil", department: "kitchen", name: "שמן טיגון", category: "שמנים", kashrut: "פרווה", quantity: 15, unit: "ל׳", minQuantity: 5, unitCost: 12, supplierId: supDry },
    { key: "rice", department: "kitchen", name: "אורז בסמטי", category: "דגנים", kashrut: "פרווה", quantity: 20, unit: "ק״ג", minQuantity: 8, unitCost: 11, supplierId: supDry },
    { key: "pasta", department: "kitchen", name: "פסטה פנה", category: "דגנים", kashrut: "פרווה", quantity: 12, unit: "ק״ג", minQuantity: 4, unitCost: 13, supplierId: supDry },
    { key: "couscous", department: "kitchen", name: "קוסקוס", category: "דגנים", kashrut: "פרווה", quantity: 8, unit: "ק״ג", minQuantity: 3, unitCost: 14, supplierId: supDry },
    { key: "flour", department: "kitchen", name: "קמח תופח", category: "אפייה", kashrut: "פרווה", quantity: 10, unit: "ק״ג", minQuantity: 3, unitCost: 6, supplierId: supDry },
    { key: "pita", department: "kitchen", name: "פיתה כשרה", category: "לחם", kashrut: "פרווה", quantity: 80, unit: "יח׳", minQuantity: 30, unitCost: 1.2, supplierId: supDry },
    { key: "eggs", department: "kitchen", name: "ביצים L", category: "ביצים", kashrut: "פרווה", quantity: 90, unit: "יח׳", minQuantity: 30, unitCost: 1.1, supplierId: supDry },
    { key: "chickpea", department: "kitchen", name: "גרגרי חומוס מבושלים", category: "קטניות", kashrut: "פרווה", quantity: 10, unit: "ק״ג", minQuantity: 4, unitCost: 9, supplierId: supDry },
    { key: "tahini", department: "kitchen", name: "טחינה גולמית", category: "רטבים", kashrut: "פרווה", quantity: 5, unit: "ק״ג", minQuantity: 2, unitCost: 28, supplierId: supDry },
    { key: "spice", department: "kitchen", name: "תבלין גריל בשרי", category: "תבלינים", kashrut: "פרווה", quantity: 2, unit: "ק״ג", minQuantity: 0.5, unitCost: 48, supplierId: supDry },
    { key: "paprika", department: "kitchen", name: "פפריקה מתוקה", category: "תבלינים", kashrut: "פרווה", quantity: 1.5, unit: "ק״ג", minQuantity: 0.4, unitCost: 36, supplierId: supDry },
    { key: "salt", department: "kitchen", name: "מלח גס", category: "תבלינים", kashrut: "פרווה", quantity: 5, unit: "ק״ג", minQuantity: 1, unitCost: 3, supplierId: supDry },
    { key: "vinegar", department: "kitchen", name: "חומץ יין", category: "רטבים", kashrut: "פרווה", quantity: 4, unit: "ל׳", minQuantity: 1, unitCost: 11, supplierId: supDry },
    { key: "honey", department: "kitchen", name: "דבש", category: "מתיקים", kashrut: "פרווה", quantity: 3, unit: "ק״ג", minQuantity: 1, unitCost: 32, supplierId: supDry },
  ];

  const ids: Record<string, string> = {};
  for (const item of invDefs) {
    const id = newId();
    ids[item.key] = id;
    db.insert(inventoryItems)
      .values({
        id,
        venueId,
        department: item.department,
        name: item.name,
        category: `${item.kashrut} · ${item.category}`,
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

  function addRecipe(
    name: string,
    department: "bar" | "kitchen",
    kind: string,
    notes: string,
    lines: { key: string; quantity: number; unit: string }[]
  ) {
    const id = newId();
    db.insert(recipes)
      .values({
        id,
        venueId,
        department,
        name,
        kind,
        notes,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    for (const line of lines) {
      const itemId = ids[line.key];
      if (!itemId) continue;
      db.insert(recipeLines)
        .values({
          id: newId(),
          recipeId: id,
          inventoryItemId: itemId,
          subRecipeId: null,
          quantity: line.quantity,
          unit: line.unit,
        })
        .run();
    }
  }

  // —— בר · פרווה בלבד ——
  addRecipe("מוחיטו", "bar", "קוקטייל · פרווה", "כשר פרווה · כוס היי־בול", [
    { key: "rum", quantity: 0.05, unit: "בק׳" },
    { key: "lime", quantity: 0.03, unit: "ק״ג" },
    { key: "mint", quantity: 0.25, unit: "צרור" },
    { key: "ice", quantity: 0.15, unit: "ק״ג" },
    { key: "soda", quantity: 1, unit: "יח׳" },
    { key: "sugar", quantity: 0.01, unit: "ק״ג" },
  ]);
  addRecipe("ג׳ין טוניק", "bar", "קוקטייל · פרווה", "כשר פרווה", [
    { key: "gin", quantity: 0.05, unit: "בק׳" },
    { key: "tonic", quantity: 1, unit: "יח׳" },
    { key: "lime", quantity: 0.02, unit: "ק״ג" },
    { key: "ice", quantity: 0.12, unit: "ק״ג" },
  ]);
  addRecipe("וויסקי סאוור", "bar", "קוקטייל · פרווה", "כשר פרווה · בלי חלבון/חלב", [
    { key: "whisky", quantity: 0.05, unit: "בק׳" },
    { key: "lemon", quantity: 0.04, unit: "ק״ג" },
    { key: "syrup", quantity: 0.02, unit: "ל׳" },
    { key: "ice", quantity: 0.12, unit: "ק״ג" },
  ]);
  addRecipe("מוסקבה מיול", "bar", "קוקטייל · פרווה", "כשר פרווה", [
    { key: "vodka", quantity: 0.05, unit: "בק׳" },
    { key: "gingerBeer", quantity: 1, unit: "יח׳" },
    { key: "lime", quantity: 0.025, unit: "ק״ג" },
    { key: "ice", quantity: 0.12, unit: "ק״ג" },
  ]);
  addRecipe("מרגריטה", "bar", "קוקטייל · פרווה", "כשר פרווה", [
    { key: "tequila", quantity: 0.05, unit: "בק׳" },
    { key: "lime", quantity: 0.04, unit: "ק״ג" },
    { key: "syrup", quantity: 0.015, unit: "ל׳" },
    { key: "ice", quantity: 0.15, unit: "ק״ג" },
  ]);
  addRecipe("אספרסו מרטיני", "bar", "קוקטייל · פרווה", "כשר פרווה · בלי שמנת", [
    { key: "vodka", quantity: 0.04, unit: "בק׳" },
    { key: "coffee", quantity: 0.018, unit: "ק״ג" },
    { key: "syrup", quantity: 0.015, unit: "ל׳" },
    { key: "ice", quantity: 0.1, unit: "ק״ג" },
  ]);
  addRecipe("אפירוטיף ורמוט", "bar", "קוקטייל · פרווה", "כשר פרווה", [
    { key: "vermouth", quantity: 0.08, unit: "בק׳" },
    { key: "orange", quantity: 0.03, unit: "ק״ג" },
    { key: "ice", quantity: 0.08, unit: "ק״ג" },
  ]);
  addRecipe("וודקה רד־בול", "bar", "קוקטייל · פרווה", "כשר פרווה", [
    { key: "vodka", quantity: 0.05, unit: "בק׳" },
    { key: "energy", quantity: 1, unit: "יח׳" },
    { key: "ice", quantity: 0.1, unit: "ק״ג" },
  ]);
  addRecipe("ג׳ין מלפפון", "bar", "קוקטייל · פרווה", "כשר פרווה", [
    { key: "gin", quantity: 0.05, unit: "בק׳" },
    { key: "cucumber", quantity: 0.04, unit: "ק״ג" },
    { key: "tonic", quantity: 1, unit: "יח׳" },
    { key: "ice", quantity: 0.12, unit: "ק״ג" },
  ]);
  addRecipe("יין אדום בכוס", "bar", "יין · פרווה", "מנה 150 מ״ל", [
    { key: "wine", quantity: 0.15, unit: "בק׳" },
  ]);
  addRecipe("יין לבן בכוס", "bar", "יין · פרווה", "מנה 150 מ״ל", [
    { key: "wineWhite", quantity: 0.15, unit: "בק׳" },
  ]);
  addRecipe("בירה חצי ליטר", "bar", "בירה · פרווה", "כשר פרווה", [
    { key: "beer", quantity: 1, unit: "יח׳" },
  ]);
  addRecipe("בירה חיטה", "bar", "בירה · פרווה", "כשר פרווה", [
    { key: "beerWeiss", quantity: 1, unit: "יח׳" },
  ]);
  addRecipe("קולה עם קרח", "bar", "רך · פרווה", "כשר פרווה", [
    { key: "cola", quantity: 1, unit: "יח׳" },
    { key: "ice", quantity: 0.08, unit: "ק״ג" },
  ]);

  // —— מטבח · בשרי / פרווה בלבד (אין חלבי) ——
  addRecipe(SEED_MARKER_RECIPE, "kitchen", "מנה עיקרית · בשרי", "כשר בשרי · ללא חלבי · 300 ג׳", [
    { key: "entrecote", quantity: 0.3, unit: "ק״ג" },
    { key: "oil", quantity: 0.02, unit: "ל׳" },
    { key: "spice", quantity: 0.008, unit: "ק״ג" },
    { key: "garlic", quantity: 0.01, unit: "ק״ג" },
  ]);
  addRecipe("אסאדו ארוך", "kitchen", "מנה עיקרית · בשרי", "כשר בשרי · מנה 280 ג׳", [
    { key: "asado", quantity: 0.28, unit: "ק״ג" },
    { key: "onion", quantity: 0.08, unit: "ק״ג" },
    { key: "broth", quantity: 0.1, unit: "ל׳" },
    { key: "spice", quantity: 0.01, unit: "ק״ג" },
  ]);
  addRecipe("בריסקט מעושן", "kitchen", "מנה עיקרית · בשרי", "כשר בשרי · 250 ג׳", [
    { key: "brisket", quantity: 0.25, unit: "ק״ג" },
    { key: "spice", quantity: 0.012, unit: "ק״ג" },
    { key: "honey", quantity: 0.015, unit: "ק״ג" },
    { key: "vinegar", quantity: 0.01, unit: "ל׳" },
  ]);
  addRecipe("צלעות קצרות ביין", "kitchen", "מנה עיקרית · בשרי", "כשר בשרי", [
    { key: "shortRib", quantity: 0.35, unit: "ק״ג" },
    { key: "wine", quantity: 0.08, unit: "בק׳" },
    { key: "onion", quantity: 0.06, unit: "ק״ג" },
    { key: "carrot", quantity: 0.05, unit: "ק״ג" },
    { key: "broth", quantity: 0.12, unit: "ל׳" },
  ]);
  addRecipe("המבורגר בקר", "kitchen", "מנה עיקרית · בשרי", "כשר בשרי · בלי גבינה", [
    { key: "groundBeef", quantity: 0.18, unit: "ק״ג" },
    { key: "pita", quantity: 1, unit: "יח׳" },
    { key: "lettuce", quantity: 0.2, unit: "יח׳" },
    { key: "tomato", quantity: 0.04, unit: "ק״ג" },
    { key: "onion", quantity: 0.03, unit: "ק״ג" },
    { key: "spice", quantity: 0.005, unit: "ק״ג" },
  ]);
  addRecipe("חזה עוף על הגריל", "kitchen", "מנה עיקרית · בשרי", "כשר בשרי", [
    { key: "chicken", quantity: 0.22, unit: "ק״ג" },
    { key: "oil", quantity: 0.015, unit: "ל׳" },
    { key: "spice", quantity: 0.006, unit: "ק״ג" },
    { key: "lemon", quantity: 0.02, unit: "ק״ג" },
  ]);
  addRecipe("כנפיים חריפות", "kitchen", "מנה לשתף · בשרי", "כשר בשרי · 8 יח׳", [
    { key: "wings", quantity: 0.35, unit: "ק״ג" },
    { key: "fryOil", quantity: 0.05, unit: "ל׳" },
    { key: "spice", quantity: 0.012, unit: "ק״ג" },
    { key: "garlic", quantity: 0.015, unit: "ק״ג" },
    { key: "honey", quantity: 0.02, unit: "ק״ג" },
  ]);
  addRecipe("ירכיים בתנור", "kitchen", "מנה עיקרית · בשרי", "כשר בשרי", [
    { key: "thighs", quantity: 0.3, unit: "ק״ג" },
    { key: "paprika", quantity: 0.008, unit: "ק״ג" },
    { key: "garlic", quantity: 0.012, unit: "ק״ג" },
    { key: "oil", quantity: 0.02, unit: "ל׳" },
    { key: "potato", quantity: 0.15, unit: "ק״ג" },
  ]);
  addRecipe("שיפוד כבש", "kitchen", "מנה עיקרית · בשרי", "כשר בשרי", [
    { key: "lamb", quantity: 0.25, unit: "ק״ג" },
    { key: "onion", quantity: 0.05, unit: "ק״ג" },
    { key: "pepper", quantity: 0.04, unit: "ק״ג" },
    { key: "spice", quantity: 0.008, unit: "ק״ג" },
  ]);
  addRecipe("צלעות כבש צרובות", "kitchen", "מנה עיקרית · בשרי", "כשר בשרי · 4 יח׳", [
    { key: "lambChop", quantity: 0.32, unit: "ק״ג" },
    { key: "oil", quantity: 0.015, unit: "ל׳" },
    { key: "spice", quantity: 0.01, unit: "ק״ג" },
    { key: "garlic", quantity: 0.01, unit: "ק״ג" },
  ]);
  addRecipe("כבד עוף מטוגן", "kitchen", "מנה פתיחה · בשרי", "כשר בשרי", [
    { key: "liver", quantity: 0.18, unit: "ק״ג" },
    { key: "onion", quantity: 0.1, unit: "ק״ג" },
    { key: "oil", quantity: 0.025, unit: "ל׳" },
    { key: "flour", quantity: 0.03, unit: "ק״ג" },
  ]);
  addRecipe("נקניקיות על הגריל", "kitchen", "מנה לשתף · בשרי", "כשר בשרי", [
    { key: "sausage", quantity: 0.25, unit: "ק״ג" },
    { key: "onion", quantity: 0.06, unit: "ק״ג" },
    { key: "pita", quantity: 1, unit: "יח׳" },
  ]);
  addRecipe("שווארמה הודו", "kitchen", "מנה עיקרית · בשרי", "כשר בשרי · בלי טחינה חלבית", [
    { key: "turkey", quantity: 0.2, unit: "ק״ג" },
    { key: "pita", quantity: 1, unit: "יח׳" },
    { key: "tahini", quantity: 0.03, unit: "ק״ג" },
    { key: "tomato", quantity: 0.05, unit: "ק״ג" },
    { key: "onion", quantity: 0.03, unit: "ק״ג" },
    { key: "parsley", quantity: 0.15, unit: "צרור" },
    { key: "spice", quantity: 0.008, unit: "ק״ג" },
  ]);
  addRecipe("פנה בבשר טחון", "kitchen", "פסטה · בשרי", "כשר בשרי · בלי שמנת/גבינה", [
    { key: "pasta", quantity: 0.12, unit: "ק״ג" },
    { key: "groundBeef", quantity: 0.1, unit: "ק״ג" },
    { key: "tomato", quantity: 0.12, unit: "ק״ג" },
    { key: "onion", quantity: 0.05, unit: "ק״ג" },
    { key: "oil", quantity: 0.02, unit: "ל׳" },
  ]);
  addRecipe("אורז עם בשר", "kitchen", "תוספת · בשרי", "כשר בשרי", [
    { key: "rice", quantity: 0.1, unit: "ק״ג" },
    { key: "asado", quantity: 0.06, unit: "ק״ג" },
    { key: "broth", quantity: 0.12, unit: "ל׳" },
    { key: "onion", quantity: 0.04, unit: "ק״ג" },
  ]);
  addRecipe("קוסקוס עם ירקות ובשר", "kitchen", "מנה עיקרית · בשרי", "כשר בשרי", [
    { key: "couscous", quantity: 0.1, unit: "ק״ג" },
    { key: "chicken", quantity: 0.12, unit: "ק״ג" },
    { key: "carrot", quantity: 0.05, unit: "ק״ג" },
    { key: "zucchini", quantity: 0.05, unit: "ק״ג" },
    { key: "broth", quantity: 0.1, unit: "ל׳" },
  ]);
  addRecipe("פטריות מוקפצות בבשר", "kitchen", "מנה לשתף · בשרי", "כשר בשרי · בלי חמאה", [
    { key: "mushroom", quantity: 0.15, unit: "ק״ג" },
    { key: "groundBeef", quantity: 0.08, unit: "ק״ג" },
    { key: "garlic", quantity: 0.01, unit: "ק״ג" },
    { key: "oil", quantity: 0.02, unit: "ל׳" },
    { key: "parsley", quantity: 0.1, unit: "צרור" },
  ]);
  addRecipe("שקשוקה פרווה", "kitchen", "מנה · פרווה", "כשר פרווה · ביצים (לא חלבי)", [
    { key: "eggs", quantity: 3, unit: "יח׳" },
    { key: "tomato", quantity: 0.2, unit: "ק״ג" },
    { key: "pepper", quantity: 0.06, unit: "ק״ג" },
    { key: "onion", quantity: 0.05, unit: "ק״ג" },
    { key: "oil", quantity: 0.02, unit: "ל׳" },
    { key: "paprika", quantity: 0.005, unit: "ק״ג" },
  ]);
  addRecipe("חומוס עם בשר", "kitchen", "מנה פתיחה · בשרי", "חומוס פרווה + בשר בשרי", [
    { key: "chickpea", quantity: 0.15, unit: "ק״ג" },
    { key: "tahini", quantity: 0.04, unit: "ק״ג" },
    { key: "groundBeef", quantity: 0.08, unit: "ק״ג" },
    { key: "oil", quantity: 0.015, unit: "ל׳" },
    { key: "parsley", quantity: 0.1, unit: "צרור" },
    { key: "pita", quantity: 1, unit: "יח׳" },
  ]);
  addRecipe("חציל קלוי פרווה", "kitchen", "מנה פתיחה · פרווה", "כשר פרווה", [
    { key: "eggplant", quantity: 0.25, unit: "ק״ג" },
    { key: "tahini", quantity: 0.035, unit: "ק״ג" },
    { key: "garlic", quantity: 0.008, unit: "ק״ג" },
    { key: "oil", quantity: 0.02, unit: "ל׳" },
    { key: "lemon", quantity: 0.02, unit: "ק״ג" },
  ]);
  addRecipe("סלט ירקות פרווה", "kitchen", "סלט · פרווה", "כשר פרווה · מתאים ליד בשרי", [
    { key: "lettuce", quantity: 0.5, unit: "יח׳" },
    { key: "tomato", quantity: 0.08, unit: "ק״ג" },
    { key: "pepper", quantity: 0.05, unit: "ק״ג" },
    { key: "cucumber", quantity: 0.06, unit: "ק״ג" },
    { key: "oil", quantity: 0.015, unit: "ל׳" },
    { key: "lemon", quantity: 0.03, unit: "ק״ג" },
  ]);
  addRecipe("צ׳יפס פרווה", "kitchen", "תוספת · פרווה", "כשר פרווה · טיגון בשמן", [
    { key: "potato", quantity: 0.25, unit: "ק״ג" },
    { key: "fryOil", quantity: 0.05, unit: "ל׳" },
    { key: "salt", quantity: 0.004, unit: "ק״ג" },
  ]);
  addRecipe("ירקות מוקפצים פרווה", "kitchen", "תוספת · פרווה", "כשר פרווה", [
    { key: "zucchini", quantity: 0.08, unit: "ק״ג" },
    { key: "pepper", quantity: 0.06, unit: "ק״ג" },
    { key: "carrot", quantity: 0.05, unit: "ק״ג" },
    { key: "onion", quantity: 0.04, unit: "ק״ג" },
    { key: "oil", quantity: 0.02, unit: "ל׳" },
  ]);

  for (const e of [
    { offset: -1, kind: "revenue" as const, amount: 18400, note: "קופה ערב שבת" },
    { offset: -2, kind: "revenue" as const, amount: 12100, note: "צהריים + ערב" },
    { offset: -3, kind: "expense" as const, amount: 5200, note: "הזמנת בשר גלאט" },
    { offset: -4, kind: "revenue" as const, amount: 9800, note: "ערב חול" },
    { offset: -5, kind: "expense" as const, amount: 2100, note: "ירקות + מזווה פרווה" },
    { offset: -6, kind: "revenue" as const, amount: 15200, note: "אירוע פרטי בשרי" },
    { offset: -7, kind: "expense" as const, amount: 3800, note: "אלכוהול כשר" },
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
    { day: 1, staffId: cookId, start: "15:00", end: "23:00", note: "מטבח בשרי" },
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

  console.log(`Seeded meat/pareve demo (no dairy) for venue ${venueId}`);
}

export function seedDemoForOwnerPhone(phone: string): void {
  const owner = db.select().from(owners).where(eq(owners.phone, phone)).get();
  if (!owner) return;
  const org = db.select().from(organizations).where(eq(organizations.ownerId, owner.id)).get();
  if (!org) return;

  db.update(owners)
    .set({ name: "יובל מזרחי", updatedAt: nowIso() })
    .where(eq(owners.id, owner.id))
    .run();
  db.update(organizations)
    .set({ name: "רשת ברים מזרחי · כשר בשרי", updatedAt: nowIso() })
    .where(eq(organizations.id, org.id))
    .run();

  const demoVenues: {
    name: string;
    kind: "bar" | "restaurant";
    address: string;
  }[] = [
    { name: "בר רוטשילד · כשר בשרי", kind: "bar", address: "רוטשילד 45, תל אביב" },
    { name: "מסעדת דיזנגוף · כשר בשרי", kind: "restaurant", address: "דיזנגוף 98, תל אביב" },
    { name: "בר נמל יפו · כשר בשרי", kind: "bar", address: "רציף העלייה השנייה 10, יפו" },
    { name: "בר הרצליה · כשר בשרי", kind: "bar", address: "המרינה, הרצליה פיתוח" },
  ];

  const existing = db.select().from(venues).where(eq(venues.organizationId, org.id)).all();
  const byName = new Map(existing.map((v) => [v.name, v]));
  const now = nowIso();
  let orphanUsed = false;

  for (const def of demoVenues) {
    let venue = byName.get(def.name);

    // Migrate the single pre-seed venue into the first branded branch.
    if (!venue && !orphanUsed && existing.length === 1 && !byName.has(demoVenues[0].name)) {
      venue = existing[0];
      orphanUsed = true;
    }

    if (!venue) {
      const id = newId();
      db.insert(venues)
        .values({
          id,
          name: def.name,
          organizationId: org.id,
          kind: def.kind,
          address: def.address,
          currency: "ILS",
          timezone: "Asia/Jerusalem",
          createdAt: now,
          updatedAt: now,
        })
        .run();
      venue = db.select().from(venues).where(eq(venues.id, id)).get()!;
      byName.set(def.name, venue);
    } else {
      db.update(venues)
        .set({
          name: def.name,
          kind: def.kind,
          address: def.address,
          updatedAt: now,
        })
        .where(eq(venues.id, venue.id))
        .run();
      venue = db.select().from(venues).where(eq(venues.id, venue.id)).get()!;
      byName.set(def.name, venue);
    }

    seedOwnerDemoVenue(venue.id);
  }

  console.log(`Seeded ${demoVenues.length} demo venues for owner phone ${phone}`);
}
