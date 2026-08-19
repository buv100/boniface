import { generateId, type Employee, type ShiftEntry } from "@/context/AppContext";
import type { ShiftAttendance } from "@/context/BonifaceContext";
import { calcHoursWorkedQuarter, nowTimeSnapped, snapTimeToQuarter } from "@/lib/shiftTime";

/** Build tip-split rows from live shift attendance (hours mode, 15-min times). */
export function buildShiftEntriesFromAttendance(
  attendance: ShiftAttendance[],
  employees: Employee[],
  endFallback = nowTimeSnapped()
): ShiftEntry[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  return attendance
    .filter((a) => a.joinedAt)
    .map((a) => {
      const emp = byId.get(a.employeeId);
      const startTime = snapTimeToQuarter(a.joinedAt);
      const endTime = snapTimeToQuarter(a.leftAt || endFallback);
      return {
        id: generateId(),
        employeeId: a.employeeId,
        employeeName: emp?.name ?? a.employeeId,
        tipMode: "hours" as const,
        startTime,
        endTime,
        cashPercent: 0,
        cardPercent: 0,
      };
    })
    .filter((s) => calcHoursWorkedQuarter(s.startTime, s.endTime) > 0);
}
