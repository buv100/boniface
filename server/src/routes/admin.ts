import { Router } from "express";
import { z } from "zod";

import { requirePlatformAdmin } from "../middleware/auth";
import {
  createCustomer,
  customerDetail,
  listCustomers,
  updateOrgSubscription,
} from "../services/customersService";

const router = Router();
router.use(requirePlatformAdmin);

const createCustomerSchema = z.object({
  ownerName: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email(),
  pin: z.string().min(4),
  organizationName: z.string().min(1),
  companyId: z.string().optional(),
  businessAddress: z.string().optional(),
  venueName: z.string().min(1),
  venueKind: z.enum(["bar", "restaurant"]),
  venueAddress: z.string().optional(),
  paidUntil: z.string().min(8),
  plan: z.string().optional(),
  notes: z.string().optional(),
});

const patchSubSchema = z.object({
  status: z.enum(["active", "past_due", "suspended"]).optional(),
  expiresAt: z.string().optional(),
  notes: z.string().nullable().optional(),
  plan: z.string().optional(),
});

router.get("/customers", (_req, res) => {
  res.json({ customers: listCustomers() });
});

router.get("/customers/:orgId", (req, res) => {
  const row = customerDetail(req.params.orgId);
  if (!row) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(row);
});

router.post("/customers", async (req, res) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid customer data" });
    return;
  }
  try {
    const created = await createCustomer(parsed.data);
    res.status(201).json(created);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "PHONE_TAKEN") {
      res.status(409).json({ error: "Phone already registered", code });
      return;
    }
    if (code === "EMAIL_TAKEN") {
      res.status(409).json({ error: "Email already registered", code });
      return;
    }
    if (code === "INVALID_PAID_UNTIL" || (err as Error).message === "INVALID_PAID_UNTIL") {
      res.status(400).json({ error: "Invalid paid-until date" });
      return;
    }
    throw err;
  }
});

router.patch("/customers/:orgId/subscription", (req, res) => {
  const parsed = patchSubSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid subscription data" });
    return;
  }
  try {
    const updated = updateOrgSubscription(req.params.orgId, parsed.data);
    if (!updated) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "EXPIRES_REQUIRED") {
      res.status(400).json({ error: "expiresAt required" });
      return;
    }
    if (code === "INVALID_PAID_UNTIL" || (err as Error).message === "INVALID_PAID_UNTIL") {
      res.status(400).json({ error: "Invalid paid-until date" });
      return;
    }
    throw err;
  }
});

export default router;
