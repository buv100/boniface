export interface AdminSubscription {
  id: string | null;
  status: string;
  plan: string | null;
  expiresAt: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface AdminCustomerRow {
  organization: { id: string; name: string };
  owner: { name: string; phone: string; email: string };
  venueCount: number;
  subscription: AdminSubscription;
}

export interface AdminCustomerDetail {
  organization: { id: string; name: string; companyId: string | null; address: string | null };
  owner: { name: string; phone: string; email: string };
  venues: { id: string; name: string; kind: string }[];
  subscription: AdminSubscription;
}

export function statusLabel(
  tr: { admin: { statusActive: string; statusPastDue: string; statusSuspended: string } },
  status: string
) {
  if (status === "active") return tr.admin.statusActive;
  if (status === "past_due") return tr.admin.statusPastDue;
  return tr.admin.statusSuspended;
}

export function paidUntilInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function defaultPaidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}
