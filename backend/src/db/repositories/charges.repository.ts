import { db } from "../index.js";
import { charges } from "../schema.js";
import { eq, desc } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Charge = InferSelectModel<typeof charges>;
export type NewCharge = InferInsertModel<typeof charges>;

export const chargesRepository = {
  create(charge: NewCharge): Charge {
    return db.insert(charges).values(charge).returning().get();
  },

  update(id: number, fields: Partial<NewCharge>): void {
    db.update(charges).set(fields).where(eq(charges.id, id)).run();
  },

  findById(id: number): Charge | undefined {
    return db.select().from(charges).where(eq(charges.id, id)).get();
  },

  findByVehicleId(vehicleId: number, limit: number, offset: number): Charge[] {
    return db
      .select()
      .from(charges)
      .where(eq(charges.vehicleId, vehicleId))
      .orderBy(desc(charges.startedAt))
      .limit(limit)
      .offset(offset)
      .all();
  },

  findAll(limit: number, offset: number): Charge[] {
    return db
      .select()
      .from(charges)
      .orderBy(desc(charges.startedAt))
      .limit(limit)
      .offset(offset)
      .all();
  },
};
