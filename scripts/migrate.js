require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing. Create .env first.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const sql = fs.readFileSync(path.join(__dirname, "..", "migrations", "001_create_users.sql"), "utf8");
    await pool.query(sql);
    console.log("Database migration completed.");
  } finally { await pool.end(); }
}
main().catch((error) => { console.error("Migration failed:", error.message); process.exit(1); });
