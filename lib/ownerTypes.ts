export type VenueKind = "bar" | "restaurant";
export type PayType = "hourly" | "monthly" | "topup";
export type JobRole = "bartender" | "waiter" | "cook" | "custom";
export type InventoryDepartment = "bar" | "kitchen";
export type StaffPermission =
  | "view_stock"
  | "edit_stock"
  | "manage_staff"
  | "manage_recipes"
  | "manage_suppliers"
  | "run_shift"
  | "view_reports";

export const STAFF_PERMISSIONS: StaffPermission[] = [
  "view_stock",
  "edit_stock",
  "manage_staff",
  "manage_recipes",
  "manage_suppliers",
  "run_shift",
  "view_reports",
];

export interface VenueAlert {
  id: string;
  venueId: string;
  topic: string;
  severity: "info" | "warning" | "critical" | string;
  message: string;
  createdAt: string;
}

export interface AuthOwner {
  id: string;
  name: string;
  phone: string;
  email: string;
  companyId: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthOrganization {
  id: string;
  ownerId: string;
  name: string;
  companyId: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerVenue {
  id: string;
  name: string;
  organizationId: string | null;
  kind: VenueKind | string;
  address: string | null;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  alerts: VenueAlert[];
}

export interface StaffMember {
  id: string;
  venueId: string;
  name: string;
  phone: string | null;
  jobRole: JobRole | string;
  customRole: string | null;
  permissions: string[];
  payType: PayType | string;
  payAmount: number;
  nationalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffDocument {
  id: string;
  staffId: string;
  kind: "id" | "form101" | "other" | string;
  fileName: string;
  mimeType: string | null;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  venueId: string;
  department: InventoryDepartment | string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  unitCost: number;
  supplierId: string | null;
  belowMin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeLine {
  id?: string;
  inventoryItemId: string | null;
  subRecipeId: string | null;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  venueId: string;
  department: InventoryDepartment | string;
  name: string;
  kind: string;
  notes: string | null;
  cost: number;
  lines: RecipeLine[];
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  venueId: string;
  name: string;
  phone: string | null;
  whatSupplies: string | null;
  scheduleNote: string | null;
  notes: string | null;
  items?: InventoryItem[];
  lowStockItems?: InventoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  venueId: string;
  date: string;
  kind: "revenue" | "expense" | string;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface FinanceSummary {
  month: string;
  revenue: number;
  expenses: number;
  laborCost: number;
  laborHours: number;
  totalExpenses: number;
  profit: number;
  profitAfterLabor: number;
  staffLabor: {
    staffId: string;
    staffName: string;
    hours: number;
    laborCost: number;
    payType: string;
  }[];
  entries: LedgerEntry[];
}

export interface WorkShift {
  id: string;
  venueId: string;
  staffId: string;
  staffName: string;
  payType?: string | null;
  payAmount?: number;
  startsAt: string;
  endsAt: string;
  note: string | null;
  hours: number;
  laborCost: number;
  hourlyRate: number;
  createdAt: string;
}

export interface ScheduleWeek {
  shifts: WorkShift[];
  weekLaborCost: number;
  weekHours: number;
}
