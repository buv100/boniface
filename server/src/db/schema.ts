import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const venues = sqliteTable("venues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
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
