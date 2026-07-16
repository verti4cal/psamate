import { db } from "../index.js";
import { trips, tripWaypoints } from "../schema.js";
import { eq, desc } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Trip = InferSelectModel<typeof trips>;
export type NewTrip = InferInsertModel<typeof trips>;
export type TripWaypoint = InferSelectModel<typeof tripWaypoints>;
export type NewTripWaypoint = InferInsertModel<typeof tripWaypoints>;

export const tripsRepository = {
  create(trip: NewTrip): Trip {
    return db.insert(trips).values(trip).returning().get();
  },

  update(id: number, fields: Partial<NewTrip>): void {
    db.update(trips).set(fields).where(eq(trips.id, id)).run();
  },

  findById(id: number): Trip | undefined {
    return db.select().from(trips).where(eq(trips.id, id)).get();
  },

  findByVehicleId(vehicleId: number, limit: number, offset: number): Trip[] {
    return db
      .select()
      .from(trips)
      .where(eq(trips.vehicleId, vehicleId))
      .orderBy(desc(trips.startedAt))
      .limit(limit)
      .offset(offset)
      .all();
  },

  findAll(limit: number, offset: number): Trip[] {
    return db
      .select()
      .from(trips)
      .orderBy(desc(trips.startedAt))
      .limit(limit)
      .offset(offset)
      .all();
  },

  addWaypoint(waypoint: NewTripWaypoint): void {
    db.insert(tripWaypoints).values(waypoint).run();
  },

  findWaypointsByTripId(tripId: number): TripWaypoint[] {
    return db.select().from(tripWaypoints).where(eq(tripWaypoints.tripId, tripId)).all();
  },
};
