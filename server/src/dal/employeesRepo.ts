import { and, eq } from "drizzle-orm";

import { db } from "../db";
import { employees } from "../db/schema";
import { mapEmployee, type EmployeeDto } from "./mappers";

export const employeesRepo = {
  listByVenue(venueId: string): EmployeeDto[] {
    return db.select().from(employees).where(eq(employees.venueId, venueId)).all().map(mapEmployee);
  },

  getById(venueId: string, id: string): EmployeeDto | null {
    const row = db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.venueId, venueId)))
      .get();
    return row ? mapEmployee(row) : null;
  },

  create(input: {
    id: string;
    venueId: string;
    name: string;
    roles: string[];
    phone: string | null;
    createdAt: string;
    updatedAt: string;
  }): EmployeeDto {
    db.insert(employees)
      .values({
        id: input.id,
        venueId: input.venueId,
        name: input.name,
        roles: JSON.stringify(input.roles),
        phone: input.phone,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      })
      .run();
    return this.getById(input.venueId, input.id)!;
  },

  update(
    venueId: string,
    id: string,
    patch: { name?: string; roles?: string[]; phone?: string | null; updatedAt: string }
  ): EmployeeDto | null {
    const existing = db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.venueId, venueId)))
      .get();
    if (!existing) return null;

    db.update(employees)
      .set({
        updatedAt: patch.updatedAt,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.roles !== undefined ? { roles: JSON.stringify(patch.roles) } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      })
      .where(eq(employees.id, id))
      .run();

    return this.getById(venueId, id);
  },

  delete(venueId: string, id: string): boolean {
    const existing = db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.venueId, venueId)))
      .get();
    if (!existing) return false;
    db.delete(employees).where(eq(employees.id, id)).run();
    return true;
  },
};
