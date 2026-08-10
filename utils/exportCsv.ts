import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";

import { DayEntry, calcDayResults } from "@/context/AppContext";

export type CsvHeaders = string[];

const DEFAULT_TIPS_HEADERS = [
  "Date",
  "Employee",
  "Start",
  "End",
  "Hours",
  "Cash day",
  "Card day",
  "Cash tips",
  "Card tips",
  "Total tips",
  "Per hour",
  "Share %",
];

export async function shareText(message: string, title?: string): Promise<void> {
  await Share.share({
    message: title ? `${title}\n\n${message}` : message,
  });
}

export async function writeAndShareCsv(
  csv: string,
  filename: string,
  dialogTitle?: string
): Promise<void> {
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const base =
    ((FileSystem as unknown as Record<string, string | undefined>)["documentDirectory"] ??
      (FileSystem as unknown as Record<string, string | undefined>)["cacheDirectory"] ??
      "") as string;
  const fileUri = `${base}${filename.endsWith(".csv") ? filename : `${filename}.csv`}`;
  await (
    FileSystem as unknown as {
      writeAsStringAsync: (uri: string, contents: string, options: Record<string, string>) => Promise<void>;
    }
  ).writeAsStringAsync(fileUri, csv, { encoding: "utf8" });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
      dialogTitle: dialogTitle ?? filename,
    });
  } else {
    await Share.share({ message: csv, title: dialogTitle ?? filename });
  }
}

function toCsv(headers: string[], rows: string[][]): string {
  return (
    "\ufeff" +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")
  );
}

export async function exportToCsv(
  entries: DayEntry[],
  filename: string,
  headers: CsvHeaders = DEFAULT_TIPS_HEADERS,
  dialogTitle?: string
): Promise<void> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const rows: string[][] = [];
  for (const entry of sorted) {
    const results = calcDayResults(entry);
    for (const r of results) {
      rows.push([
        entry.date,
        r.shift.employeeName,
        r.shift.startTime,
        r.shift.endTime,
        r.hoursWorked.toFixed(2),
        entry.totalCash.toFixed(0),
        entry.totalCard.toFixed(0),
        r.cashTips.toFixed(2),
        r.cardTips.toFixed(2),
        r.totalTips.toFixed(2),
        r.tipsPerHour.toFixed(2),
        r.sharePercent.toFixed(1),
      ]);
    }
  }

  await writeAndShareCsv(toCsv(headers, rows), filename, dialogTitle);
}

export interface ScheduleCsvRow {
  date: string;
  employee: string;
  start: string;
  end: string;
  role?: string;
  mode?: string;
  status?: string;
}

export async function exportScheduleCsv(
  rows: ScheduleCsvRow[],
  filename: string,
  headers: CsvHeaders,
  dialogTitle?: string
): Promise<void> {
  const data = rows.map((r) => [
    r.date,
    r.employee,
    r.start,
    r.end,
    r.role ?? "",
    r.mode ?? "",
    r.status ?? "",
  ]);
  await writeAndShareCsv(toCsv(headers, data), filename, dialogTitle);
}

export interface InventoryCsvRow {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  fillPercent: string;
  fullBottles: string;
}

export async function exportInventoryCsv(
  rows: InventoryCsvRow[],
  filename: string,
  headers: CsvHeaders,
  dialogTitle?: string
): Promise<void> {
  const data = rows.map((r) => [
    r.name,
    r.category,
    r.fullBottles,
    r.fillPercent,
    r.quantity,
    r.unit,
  ]);
  await writeAndShareCsv(toCsv(headers, data), filename, dialogTitle);
}

export function buildBriefingShareText(opts: {
  title: string;
  dateLabel: string;
  timeStr: string;
  shiftLine: string;
  teamLabel: string;
  teamNames: string[];
  tasksLabel: string;
  openTasks: string[];
  doneTasks: string[];
  stopLabel: string;
  stopNames: string[];
  emptyTeam: string;
  emptyTasks: string;
  emptyStop: string;
}): string {
  const lines: string[] = [];
  lines.push(`${opts.title}`);
  lines.push(`${opts.dateLabel} · ${opts.timeStr}`);
  lines.push("");
  lines.push(opts.shiftLine);
  lines.push("");
  lines.push(`${opts.teamLabel}:`);
  if (opts.teamNames.length === 0) lines.push(`• ${opts.emptyTeam}`);
  else opts.teamNames.forEach((n) => lines.push(`• ${n}`));
  lines.push("");
  lines.push(`${opts.tasksLabel}:`);
  if (opts.openTasks.length === 0 && opts.doneTasks.length === 0) {
    lines.push(`• ${opts.emptyTasks}`);
  } else {
    opts.openTasks.forEach((t) => lines.push(`☐ ${t}`));
    opts.doneTasks.forEach((t) => lines.push(`☑ ${t}`));
  }
  lines.push("");
  lines.push(`${opts.stopLabel}:`);
  if (opts.stopNames.length === 0) lines.push(`• ${opts.emptyStop}`);
  else opts.stopNames.forEach((n) => lines.push(`• ${n}`));
  return lines.join("\n");
}
