import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const owners = sqliteTable("owners", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  companyId: text("company_id"),
  address: text("address"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => owners.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  companyId: text("company_id"),
  address: text("address"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const venues = sqliteTable("venues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("bar"),
  address: text("address"),
  currency: text("currency").notNull().default("ILS"),
  timezone: text("timezone").notNull().default("Asia/Jerusalem"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const managers = sqliteTable("managers", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  securityQuestion: text("security_question"),
  securityAnswerHash: text("security_answer_hash"),
  createdAt: text("created_at").notNull(),
});

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  roles: text("roles").notNull().default("[]"),
  phone: text("phone"),
  pinHash: text("pin_hash"),
  onboardedAt: text("onboarded_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  managerId: text("manager_id").references(() => managers.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").references(() => owners.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const dayEntries = sqliteTable("day_entries", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  totalCash: real("total_cash").notNull().default(0),
  totalCard: real("total_card").notNull().default(0),
  shifts: text("shifts").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const stockItems = sqliteTable("stock_items", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: real("quantity").notNull().default(0),
  unit: text("unit").notNull(),
  minQuantity: real("min_quantity").notNull().default(0),
  purchasePrice: real("purchase_price"),
  portionsPerUnit: real("portions_per_unit"),
  sellingPrice: real("selling_price"),
  expiryDate: text("expiry_date"),
  subCategory: text("sub_category"),
  updatedAt: text("updated_at").notNull(),
});

export const stopList = sqliteTable("stop_list", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  reason: text("reason"),
  addedAt: text("added_at").notNull(),
});

export const writeOffs = sqliteTable("write_offs", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  itemId: text("item_id"),
  itemName: text("item_name").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
});

export const checklists = sqliteTable("checklists", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  items: text("items").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .unique()
    .references(() => venues.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  plan: text("plan").notNull().default("basic"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** mode: "can" (multi-claim) | "want" (first-come-first-served) */
export const shiftSlots = sqliteTable("shift_slots", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  role: text("role"),
  mode: text("mode").notNull().default("can"),
  maxClaims: integer("max_claims").notNull().default(4),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const shiftClaims = sqliteTable("shift_claims", {
  id: text("id").primaryKey(),
  slotId: text("slot_id")
    .notNull()
    .references(() => shiftSlots.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("claimed"),
  claimedAt: text("claimed_at").notNull(),
});

export const inviteCodes = sqliteTable("invite_codes", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  employeeName: text("employee_name"),
  usedAt: text("used_at"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
  createdByManagerId: text("created_by_manager_id").references(() => managers.id, {
    onDelete: "set null",
  }),
});

export const staff = sqliteTable("staff", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  jobRole: text("job_role").notNull().default("bartender"),
  customRole: text("custom_role"),
  permissions: text("permissions").notNull().default("[]"),
  payType: text("pay_type").notNull().default("hourly"),
  payAmount: real("pay_amount").notNull().default(0),
  nationalId: text("national_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const staffDocuments = sqliteTable("staff_documents", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type"),
  storagePath: text("storage_path").notNull(),
  createdAt: text("created_at").notNull(),
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  department: text("department").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("other"),
  quantity: real("quantity").notNull().default(0),
  unit: text("unit").notNull().default("pcs"),
  minQuantity: real("min_quantity").notNull().default(0),
  supplierId: text("supplier_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  department: text("department").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("item"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const recipeLines = sqliteTable("recipe_lines", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  inventoryItemId: text("inventory_item_id").references(() => inventoryItems.id, {
    onDelete: "set null",
  }),
  subRecipeId: text("sub_recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull().default("pcs"),
});

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  whatSupplies: text("what_supplies"),
  scheduleNote: text("schedule_note"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const platformAdmins = sqliteTable("platform_admins", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

export const adminSessions = sqliteTable("admin_sessions", {
  id: text("id").primaryKey(),
  adminId: text("admin_id")
    .notNull()
    .references(() => platformAdmins.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

/** Billing for a restaurant group — not per venue. */
export const orgSubscriptions = sqliteTable("org_subscriptions", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("suspended"),
  plan: text("plan").notNull().default("standard"),
  expiresAt: text("expires_at").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
