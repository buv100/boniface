import { desc, eq } from "drizzle-orm";

import { db } from "../db";
import {
  organizations,
  orgSubscriptions,
  owners,
  venues,
} from "../db/schema";
import {
  getOrgBilling,
  hashPin,
  newId,
  normalizePhone,
  nowIso,
  publicOrganization,
  publicOwner,
  publicOrgSubscription,
  publicVenue,
} from "../middleware/auth";

function toExpiresAt(paidUntil: string): string {
  const raw = paidUntil.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T23:59:59.000Z`;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error("INVALID_PAID_UNTIL");
  }
  return d.toISOString();
}

export async function createCustomer(input: {
  ownerName: string;
  phone: string;
  email: string;
  pin: string;
  organizationName: string;
  companyId?: string;
  businessAddress?: string;
  venueName: string;
  venueKind: "bar" | "restaurant";
  venueAddress?: string;
  paidUntil: string;
  plan?: string;
  notes?: string;
}) {
  const phone = normalizePhone(input.phone);
  const email = input.email.trim().toLowerCase();
  const expiresAt = toExpiresAt(input.paidUntil);

  const phoneTaken = db.select().from(owners).where(eq(owners.phone, phone)).get();
  if (phoneTaken) {
    throw Object.assign(new Error("Phone already registered"), { code: "PHONE_TAKEN" });
  }
  const emailTaken = db.select().from(owners).where(eq(owners.email, email)).get();
  if (emailTaken) {
    throw Object.assign(new Error("Email already registered"), { code: "EMAIL_TAKEN" });
  }

  const now = nowIso();
  const ownerId = newId();
  const orgId = newId();
  const venueId = newId();
  const pinHash = await hashPin(input.pin);
  const status = new Date(expiresAt).getTime() > Date.now() ? "active" : "suspended";

  db.insert(owners)
    .values({
      id: ownerId,
      name: input.ownerName.trim(),
      phone,
      email,
      pinHash,
      companyId: input.companyId?.trim() || null,
      address: input.businessAddress?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(organizations)
    .values({
      id: orgId,
      ownerId,
      name: input.organizationName.trim(),
      companyId: input.companyId?.trim() || null,
      address: input.businessAddress?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(venues)
    .values({
      id: venueId,
      name: input.venueName.trim(),
      organizationId: orgId,
      kind: input.venueKind,
      address: input.venueAddress?.trim() || null,
      currency: "ILS",
      timezone: "Asia/Jerusalem",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(orgSubscriptions)
    .values({
      id: newId(),
      organizationId: orgId,
      status,
      plan: input.plan?.trim() || "standard",
      expiresAt,
      notes: input.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return customerDetail(orgId);
}

export function customerDetail(organizationId: string) {
  const organization = db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .get();
  if (!organization) return null;
  const owner = db.select().from(owners).where(eq(owners.id, organization.ownerId)).get();
  if (!owner) return null;
  const venueList = db
    .select()
    .from(venues)
    .where(eq(venues.organizationId, organizationId))
    .all()
    .map(publicVenue);
  return {
    organization: publicOrganization(organization),
    owner: publicOwner(owner),
    venues: venueList,
    subscription: publicOrgSubscription(getOrgBilling(organizationId)),
  };
}

export function listCustomers() {
  const orgs = db.select().from(organizations).orderBy(desc(organizations.createdAt)).all();
  return orgs
    .map((org) => {
      const owner = db.select().from(owners).where(eq(owners.id, org.ownerId)).get();
      if (!owner) return null;
      const venueCount = db
        .select()
        .from(venues)
        .where(eq(venues.organizationId, org.id))
        .all().length;
      return {
        organization: publicOrganization(org),
        owner: publicOwner(owner),
        venueCount,
        subscription: publicOrgSubscription(getOrgBilling(org.id)),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

export function updateOrgSubscription(
  organizationId: string,
  patch: {
    status?: "active" | "past_due" | "suspended";
    expiresAt?: string;
    notes?: string | null;
    plan?: string;
  }
) {
  const org = db.select().from(organizations).where(eq(organizations.id, organizationId)).get();
  if (!org) return null;

  const now = nowIso();
  const existing = db
    .select()
    .from(orgSubscriptions)
    .where(eq(orgSubscriptions.organizationId, organizationId))
    .get();

  const expiresAt = patch.expiresAt ? toExpiresAt(patch.expiresAt) : existing?.expiresAt;
  if (!expiresAt) {
    throw Object.assign(new Error("expiresAt required"), { code: "EXPIRES_REQUIRED" });
  }

  if (existing) {
    db.update(orgSubscriptions)
      .set({
        status: patch.status ?? existing.status,
        plan: patch.plan?.trim() || existing.plan,
        expiresAt,
        notes: patch.notes === undefined ? existing.notes : patch.notes,
        updatedAt: now,
      })
      .where(eq(orgSubscriptions.id, existing.id))
      .run();
  } else {
    db.insert(orgSubscriptions)
      .values({
        id: newId(),
        organizationId,
        status: patch.status ?? "suspended",
        plan: patch.plan?.trim() || "standard",
        expiresAt,
        notes: patch.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  return customerDetail(organizationId);
}

import { seedDemoForOwnerPhone } from "./demoSeed";

/** Local/dev login so `/account` works without the admin panel. */
export async function ensureDevTestOwner(): Promise<void> {
  const phone = normalizePhone(process.env.DEV_LOGIN_PHONE?.trim() || "0501234567");
  const pin = process.env.DEV_LOGIN_PIN?.trim() || "2020";
  const paidUntil = new Date();
  paidUntil.setFullYear(paidUntil.getFullYear() + 1);
  const paidUntilStr = paidUntil.toISOString().slice(0, 10);

  const existing = db.select().from(owners).where(eq(owners.phone, phone)).get();
  if (existing) {
    const pinHash = await hashPin(pin);
    db.update(owners)
      .set({ pinHash, updatedAt: nowIso() })
      .where(eq(owners.id, existing.id))
      .run();
    const org = db.select().from(organizations).where(eq(organizations.ownerId, existing.id)).get();
    if (org) {
      updateOrgSubscription(org.id, {
        status: "active",
        expiresAt: paidUntilStr,
        notes: "דמו למשקיעים",
      });
    }
    seedDemoForOwnerPhone(phone);
    return;
  }

  await createCustomer({
    ownerName: "יובל מזרחי",
    phone,
    email: "demo@boniface.local",
    pin,
    organizationName: "רשת ברים מזרחי",
    venueName: "בר רוטשילד",
    venueKind: "bar",
    businessAddress: "רוטשילד 45, תל אביב",
    venueAddress: "רוטשילד 45, תל אביב",
    paidUntil: paidUntilStr,
    notes: "דמו למשקיעים",
  });
  seedDemoForOwnerPhone(phone);
}
