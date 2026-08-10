import { dayEntriesRepo, type DayEntryShift } from "../dal/dayEntriesRepo";
import { newId, nowIso } from "../middleware/auth";

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export function calcShiftTips(
  entry: { totalCash: number; totalCard: number; shifts: DayEntryShift[] },
  employeeId: string
): { dateTips: number; hours: number } | null {
  const shifts = entry.shifts ?? [];
  const mine = shifts.find((s) => s.employeeId === employeeId);
  if (!mine) return null;

  const percentShifts = shifts.filter((s) => s.tipMode === "percent");
  const hourShifts = shifts.filter((s) => s.tipMode !== "percent");

  let percentPoolCash = 0;
  let percentPoolCard = 0;
  let percentTotal = 0;
  for (const s of percentShifts) {
    percentPoolCash += entry.totalCash * (s.cashPercent / 100);
    percentPoolCard += entry.totalCard * (s.cardPercent / 100);
    percentTotal += s.cashPercent + s.cardPercent; // not used exactly like client - simplify
  }
  void percentTotal;

  // Match client calcDayResults roughly
  const totalTips = entry.totalCash + entry.totalCard;
  let cashTips = 0;
  let cardTips = 0;
  const hours = hoursBetween(mine.startTime, mine.endTime);

  if (mine.tipMode === "percent") {
    cashTips = entry.totalCash * (mine.cashPercent / 100);
    cardTips = entry.totalCard * (mine.cardPercent / 100);
  } else {
    const totalHours = hourShifts.reduce((sum, s) => sum + hoursBetween(s.startTime, s.endTime), 0);
    const remainingCash = entry.totalCash - percentShifts.reduce((s, p) => s + entry.totalCash * (p.cashPercent / 100), 0);
    const remainingCard = entry.totalCard - percentShifts.reduce((s, p) => s + entry.totalCard * (p.cardPercent / 100), 0);
    if (totalHours > 0) {
      cashTips = (remainingCash * hours) / totalHours;
      cardTips = (remainingCard * hours) / totalHours;
    }
  }

  void totalTips;
  void percentPoolCash;
  void percentPoolCard;

  return { dateTips: cashTips + cardTips, hours };
}

export const dayEntriesService = {
  list(venueId: string) {
    return dayEntriesRepo.listByVenue(venueId);
  },
  create(
    venueId: string,
    data: { date: string; totalCash: number; totalCard: number; shifts: DayEntryShift[] }
  ) {
    const now = nowIso();
    return dayEntriesRepo.create({
      id: newId(),
      venueId,
      date: data.date,
      totalCash: data.totalCash,
      totalCard: data.totalCard,
      shifts: data.shifts,
      createdAt: now,
      updatedAt: now,
    });
  },
  upsert(
    venueId: string,
    id: string,
    data: { date: string; totalCash: number; totalCard: number; shifts: DayEntryShift[] }
  ) {
    return dayEntriesRepo.upsert({
      id,
      venueId,
      date: data.date,
      totalCash: data.totalCash,
      totalCard: data.totalCard,
      shifts: data.shifts,
      now: nowIso(),
    });
  },
  remove(venueId: string, id: string) {
    return dayEntriesRepo.delete(venueId, id);
  },
  tipsForEmployee(venueId: string, employeeId: string) {
    const entries = dayEntriesRepo.listByVenue(venueId);
    const rows: { date: string; tips: number; hours: number }[] = [];
    for (const entry of entries) {
      const calc = calcShiftTips(entry, employeeId);
      if (calc) {
        rows.push({
          date: entry.date,
          tips: Math.round(calc.dateTips * 100) / 100,
          hours: Math.round(calc.hours * 100) / 100,
        });
      }
    }
    rows.sort((a, b) => b.date.localeCompare(a.date));
    const total = rows.reduce((s, r) => s + r.tips, 0);
    return { rows, total: Math.round(total * 100) / 100 };
  },
};
