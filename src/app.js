require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const authRoutes = require("./routes/auth");
const { pool } = require("./db");
const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.get("/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.status(200).json({ status: "ok", database: "connected" }); }
  catch (_error) { res.status(503).json({ status: "error", database: "unavailable" }); }
});
app.use("/api/auth", authRoutes);
app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND", message: "Route not found." }));
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ error: "INVALID_JSON", message: "Request body must contain valid JSON." });
  console.error("Unhandled request error:", error.message);
  return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." });
});
module.exports = app;
