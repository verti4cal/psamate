import { db } from "../index.js";
import { settings } from "../schema.js";
import { eq } from "drizzle-orm";

export const settingsRepository = {
  get(key: string): string | undefined {
    return db.select().from(settings).where(eq(settings.key, key)).get()?.value;
  },

  set(key: string, value: string): void {
    db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run();
  },

  getAll(): Record<string, string> {
    const rows = db.select().from(settings).all();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
};
