import { and, eq, gte } from "drizzle-orm";

import { db } from "../db";
import { dayEntries } from "../db/schema";
import { mapDayEntry, type DayEntryDto } from "./mappers";

export type DayEntryShift = DayEntryDto["shifts"][number];

export const dayEntriesRepo = {
  listByVenue(venueId: string): DayEntryDto[] {
    return db.select().from(dayEntries).where(eq(dayEntries.venueId, venueId)).all().map(mapDayEntry);
  },

  listByVenueSince(venueId: string, sinceDate: string): DayEntryDto[] {
    return db
      .select()
      .from(dayEntries)
      .where(and(eq(dayEntries.venueId, venueId), gte(dayEntries.date, sinceDate)))
      .all()
      .map(mapDayEntry);
  },

  getById(venueId: string, id: string): DayEntryDto | null {
    const row = db
      .select()
      .from(dayEntries)
      .where(and(eq(dayEntries.id, id), eq(dayEntries.venueId, venueId)))
      .get();
    return row ? mapDayEntry(row) : null;
  },

  create(input: {
    id: string;
    venueId: string;
    date: string;
    totalCash: number;
    totalCard: number;
    shifts: DayEntryShift[];
    createdAt: string;
    updatedAt: string;
  }): DayEntryDto {
    db.insert(dayEntries)
      .values({
        id: input.id,
        venueId: input.venueId,
        date: input.date,
        totalCash: input.totalCash,
        totalCard: input.totalCard,
        shifts: JSON.stringify(input.shifts),
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      })
      .run();
    return this.getById(input.venueId, input.id)!;
  },

  upsert(input: {
    id: string;
    venueId: string;
    date: string;
    totalCash: number;
    totalCard: number;
    shifts: DayEntryShift[];
    now: string;
  }): DayEntryDto {
    const existing = this.getById(input.venueId, input.id);
    if (existing) {
      db.update(dayEntries)
        .set({
          date: input.date,
          totalCash: input.totalCash,
          totalCard: input.totalCard,
          shifts: JSON.stringify(input.shifts),
          updatedAt: input.now,
        })
        .where(eq(dayEntries.id, input.id))
        .run();
    } else {
      db.insert(dayEntries)
        .values({
          id: input.id,
          venueId: input.venueId,
          date: input.date,
          totalCash: input.totalCash,
          totalCard: input.totalCard,
          shifts: JSON.stringify(input.shifts),
          createdAt: input.now,
          updatedAt: input.now,
        })
        .run();
    }
    return this.getById(input.venueId, input.id)!;
  },

  delete(venueId: string, id: string): boolean {
    const existing = this.getById(venueId, id);
    if (!existing) return false;
    db.delete(dayEntries).where(eq(dayEntries.id, id)).run();
    return true;
  },
};
