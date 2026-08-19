/** Round clock times to 15-minute steps (…:00, :15, :30, :45). */

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMins: number): string {
  let mins = ((totalMins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Nearest quarter-hour (e.g. 19:37 → 19:30, 19:38 → 19:45). */
export function snapMinutesToQuarter(totalMins: number): number {
  return Math.round(totalMins / 15) * 15;
}

export function snapTimeToQuarter(hhmm: string): string {
  return minutesToTime(snapMinutesToQuarter(timeToMinutes(hhmm)));
}

export function nowTimeSnapped(now = new Date()): string {
  const mins = now.getHours() * 60 + now.getMinutes();
  return minutesToTime(snapMinutesToQuarter(mins));
}

/** Hours between two HH:MM values, after snapping both to 15 minutes. Overnight OK. */
export function calcHoursWorkedQuarter(startTime: string, endTime: string): number {
  let s = snapMinutesToQuarter(timeToMinutes(startTime));
  let e = snapMinutesToQuarter(timeToMinutes(endTime));
  if (e === s) return 0;
  if (e < s) e += 24 * 60;
  return (e - s) / 60;
}
