/** Hours between shift start/end (supports overnight). */
export function shiftHours(startsAt: string, endsAt: string): number {
  const start = new Date(startsAt.includes("T") ? startsAt : startsAt.replace(" ", "T"));
  const end = new Date(endsAt.includes("T") ? endsAt : endsAt.replace(" ", "T"));
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round((ms / 3600000) * 100) / 100;
}

/**
 * Cost of one shift for the business (= what the worker earns for that shift).
 * hourly / topup: rate × hours
 * monthly: (salary / 173) × hours  (~monthly hours)
 */
export function shiftLaborCost(opts: {
  payType: string;
  payAmount: number;
  startsAt: string;
  endsAt: string;
}): { hours: number; laborCost: number; hourlyRate: number } {
  const hours = shiftHours(opts.startsAt, opts.endsAt);
  const amount = Number(opts.payAmount) || 0;
  let hourlyRate = 0;
  if (opts.payType === "monthly") {
    hourlyRate = amount / 173;
  } else {
    // hourly + topup (השלמה) treated as ₪/hour for shift costing
    hourlyRate = amount;
  }
  const laborCost = Math.round(hourlyRate * hours * 100) / 100;
  return {
    hours,
    laborCost,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
  };
}
