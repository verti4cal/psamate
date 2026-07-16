import { db } from "../index.js";
import { vehicles } from "../schema.js";
import { eq } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Vehicle = InferSelectModel<typeof vehicles>;
export type NewVehicle = InferInsertModel<typeof vehicles>;

export const vehiclesRepository = {
  findAll(): Vehicle[] {
    return db.select().from(vehicles).all();
  },

  findByVin(vin: string): Vehicle | undefined {
    return db.select().from(vehicles).where(eq(vehicles.vin, vin)).get();
  },

  upsert(vehicle: NewVehicle): void {
    db.insert(vehicles)
      .values(vehicle)
      .onConflictDoUpdate({
        target: vehicles.vin,
        set: {
          psaId:      vehicle.psaId,
          brand:      vehicle.brand,
          label:      vehicle.label,
          isElectric: vehicle.isElectric,
          needsReauth: false,
        },
      })
      .run();
  },

  setNeedsReauth(vehicleId: number, needsReauth: boolean): void {
    db.update(vehicles).set({ needsReauth }).where(eq(vehicles.id, vehicleId)).run();
  },
};
