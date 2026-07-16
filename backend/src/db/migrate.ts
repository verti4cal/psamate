import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { fileURLToPath } from "url";

const dbPath = process.env.DATABASE_PATH ?? "/data/psamate.db";
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });
console.log("Migrations applied.");
sqlite.close();
