const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/requireAuth");
const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;
function validEmail(email) { return typeof email === "string" && email.length <= 254 && EMAIL_REGEX.test(email); }
function validPassword(password) { return typeof password === "string" && password.length >= 8 && Buffer.byteLength(password, "utf8") <= 72; }
function issueToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  return jwt.sign({ email: user.email }, process.env.JWT_SECRET, { subject: String(user.id), expiresIn: process.env.JWT_EXPIRES_IN || "1h", algorithm: "HS256" });
}
router.post("/signup", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!validEmail(email) || !validPassword(password)) return res.status(400).json({ error: "VALIDATION_ERROR", message: "Provide a valid email and a password of 8–72 UTF-8 bytes." });
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at", [normalizedEmail, passwordHash]);
    const user = result.rows[0];
    return res.status(201).json({ message: "Account created successfully.", user: { id: user.id, email: user.email, createdAt: user.created_at } });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "EMAIL_ALREADY_REGISTERED", message: "An account with this email already exists." });
    return next(error);
  }
});
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!validEmail(email) || typeof password !== "string" || !password.length || Buffer.byteLength(password, "utf8") > 72) return res.status(400).json({ error: "VALIDATION_ERROR", message: "Provide a valid email and password." });
    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [normalizedEmail]);
    const user = result.rows[0];
    const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!user || !passwordMatches) return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
    return res.status(200).json({ tokenType: "Bearer", expiresIn: process.env.JWT_EXPIRES_IN || "1h", accessToken: issueToken(user) });
  } catch (error) { return next(error); }
});
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT id, email, created_at FROM users WHERE id = $1", [req.user.id]);
    if (!result.rowCount) return res.status(401).json({ error: "INVALID_TOKEN", message: "The account associated with this token no longer exists." });
    const user = result.rows[0];
    return res.status(200).json({ user: { id: user.id, email: user.email, createdAt: user.created_at } });
  } catch (error) { return next(error); }
});
module.exports = router;
