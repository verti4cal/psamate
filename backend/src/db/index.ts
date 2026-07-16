import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema.js";

const dbPath = process.env.DATABASE_PATH ?? "/data/psamate.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;

// Auto-apply pending migrations on every startup — safe to run repeatedly
const __dirname = path.dirname(fileURLToPath(import.meta.url));
migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });
