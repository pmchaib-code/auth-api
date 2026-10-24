require("dotenv").config();
const app = require("./app");
const { pool } = require("./db");
const port = Number(process.env.PORT) || 3000;
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is missing. Create .env from .env.example."); process.exit(1); }
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) { console.error("JWT_SECRET must contain at least 32 characters."); process.exit(1); }
const server = app.listen(port, () => console.log(`Auth API listening on http://localhost:${port}`));
async function shutdown() { server.close(async () => { await pool.end(); process.exit(0); }); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
