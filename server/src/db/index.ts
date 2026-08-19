import path from "node:path";
import fs from "node:fs";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), "server", "data");
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(dataDir, "boniface.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite, dataDir };

/** Create tables if missing so `npm run api` works without drizzle-kit. */
export function ensureSchema(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ILS',
      timezone TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS managers (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL,
      security_question TEXT,
      security_answer_hash TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      roles TEXT NOT NULL DEFAULT '[]',
      phone TEXT,
      pin_hash TEXT,
      onboarded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      manager_id TEXT REFERENCES managers(id) ON DELETE CASCADE,
      employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS day_entries (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      total_cash REAL NOT NULL DEFAULT 0,
      total_card REAL NOT NULL DEFAULT 0,
      shifts TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      min_quantity REAL NOT NULL DEFAULT 0,
      purchase_price REAL,
      portions_per_unit REAL,
      selling_price REAL,
      expiry_date TEXT,
      sub_category TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stop_list (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      reason TEXT,
      added_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS write_offs (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      item_id TEXT,
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS checklists (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      items TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL UNIQUE REFERENCES venues(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      plan TEXT NOT NULL DEFAULT 'basic',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shift_slots (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      role TEXT,
      mode TEXT NOT NULL DEFAULT 'can',
      max_claims INTEGER NOT NULL DEFAULT 4,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shift_claims (
      id TEXT PRIMARY KEY,
      slot_id TEXT NOT NULL REFERENCES shift_slots(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'claimed',
      claimed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      employee_name TEXT,
      used_at TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      created_by_manager_id TEXT REFERENCES managers(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_employees_venue ON employees(venue_id);
    CREATE INDEX IF NOT EXISTS idx_day_entries_venue ON day_entries(venue_id);
    CREATE INDEX IF NOT EXISTS idx_day_entries_date ON day_entries(venue_id, date);
    CREATE INDEX IF NOT EXISTS idx_stock_venue ON stock_items(venue_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_shift_slots_venue_date ON shift_slots(venue_id, date);
    CREATE INDEX IF NOT EXISTS idx_shift_claims_slot ON shift_claims(slot_id);
    CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);

    CREATE TABLE IF NOT EXISTS owners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL,
      company_id TEXT,
      address TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      company_id TEXT,
      address TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT,
      job_role TEXT NOT NULL DEFAULT 'bartender',
      custom_role TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      pay_type TEXT NOT NULL DEFAULT 'hourly',
      pay_amount REAL NOT NULL DEFAULT 0,
      national_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff_documents (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT,
      storage_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      department TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'pcs',
      min_quantity REAL NOT NULL DEFAULT 0,
      supplier_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      department TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'item',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipe_lines (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      inventory_item_id TEXT REFERENCES inventory_items(id) ON DELETE SET NULL,
      sub_recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pcs'
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT,
      what_supplies TEXT,
      schedule_note TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_staff_venue ON staff(venue_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_venue ON inventory_items(venue_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_venue ON recipes(venue_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_venue ON suppliers(venue_id);
    CREATE INDEX IF NOT EXISTS idx_org_owner ON organizations(owner_id);

    CREATE TABLE IF NOT EXISTS platform_admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES platform_admins(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS org_subscriptions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'suspended',
      plan TEXT NOT NULL DEFAULT 'standard',
      expires_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Lightweight migrations for existing DBs
  const stockCols = sqlite.prepare(`PRAGMA table_info(stock_items)`).all() as { name: string }[];
  if (!stockCols.some((c) => c.name === "sub_category")) {
    sqlite.exec(`ALTER TABLE stock_items ADD COLUMN sub_category TEXT`);
  }

  const venueCols = sqlite.prepare(`PRAGMA table_info(venues)`).all() as { name: string }[];
  if (!venueCols.some((c) => c.name === "organization_id")) {
    sqlite.exec(`ALTER TABLE venues ADD COLUMN organization_id TEXT`);
  }
  if (!venueCols.some((c) => c.name === "kind")) {
    sqlite.exec(`ALTER TABLE venues ADD COLUMN kind TEXT NOT NULL DEFAULT 'bar'`);
  }
  if (!venueCols.some((c) => c.name === "address")) {
    sqlite.exec(`ALTER TABLE venues ADD COLUMN address TEXT`);
  }

  const sessionCols = sqlite.prepare(`PRAGMA table_info(sessions)`).all() as { name: string }[];
  if (!sessionCols.some((c) => c.name === "owner_id")) {
    sqlite.exec(`ALTER TABLE sessions ADD COLUMN owner_id TEXT`);
  }
  if (!sessionCols.some((c) => c.name === "organization_id")) {
    sqlite.exec(`ALTER TABLE sessions ADD COLUMN organization_id TEXT`);
  }
}
