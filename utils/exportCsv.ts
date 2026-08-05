import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { DayEntry, calcDayResults } from "@/context/AppContext";

export async function exportToCsv(
  entries: DayEntry[],
  filename: string
): Promise<void> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  const headers = [
    "Дата",
    "Сотрудник",
    "Приход",
    "Уход",
    "Часов",
    "Нал день (₪)",
    "Карта день (₪)",
    "Нал сотр. (₪)",
    "Карта сотр. (₪)",
    "Итого сотр. (₪)",
    "В час (₪)",
    "Доля (%)",
  ];

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

  const csv =
    "\ufeff" +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = ((FileSystem as unknown as Record<string, string>)["documentDirectory"] ?? "") + filename + ".csv";
  await (FileSystem as unknown as { writeAsStringAsync: (uri: string, contents: string, options: Record<string, string>) => Promise<void> }).writeAsStringAsync(fileUri, csv, {
    encoding: "utf8",
  });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
      dialogTitle: "Экспорт чаевых",
    });
  }
}
