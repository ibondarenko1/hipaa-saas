import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function exec(text: string, params: any[] = []): Promise<void> {
  await pool.query(text, params);
}

// Minimal migration runner (single folder, ordered by filename)
export async function migrate(): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationsDir = path.resolve(__dirname, "..", "migrations");

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    await exec(sql);
  }
}

// CLI: node dist/db.js migrate
if (process.argv[2] === "migrate") {
  migrate()
    .then(() => {
      console.log("Migrations applied.");
      process.exit(0);
    })
    .catch((e) => {
      console.error("Migration failed:", e);
      process.exit(1);
    });
}
