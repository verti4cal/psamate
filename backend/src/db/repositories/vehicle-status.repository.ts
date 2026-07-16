import { db } from "../index.js";
import { vehicleStatus } from "../schema.js";
import { eq, desc } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type VehicleStatus = InferSelectModel<typeof vehicleStatus>;
export type NewVehicleStatus = InferInsertModel<typeof vehicleStatus>;

export const vehicleStatusRepository = {
  insert(snapshot: NewVehicleStatus): void {
    db.insert(vehicleStatus).values(snapshot).run();
  },

  findLatestByVehicleId(vehicleId: number): VehicleStatus | undefined {
    return db
      .select()
      .from(vehicleStatus)
      .where(eq(vehicleStatus.vehicleId, vehicleId))
      .orderBy(desc(vehicleStatus.timestamp))
      .limit(1)
      .get();
  },
};
