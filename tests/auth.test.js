const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");
if (!process.env.TEST_DATABASE_URL) throw new Error("Set TEST_DATABASE_URL to a dedicated test database before npm test.");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = "test_secret_only_for_automated_tests_123456789";
process.env.JWT_EXPIRES_IN = "1h";
const app = require("../src/app");
const { pool } = require("../src/db");
const migration = fs.readFileSync(path.join(__dirname, "..", "migrations", "001_create_users.sql"), "utf8");
const userData = { email: "test@example.com", password: "StrongPass123!" };
beforeAll(async () => { await pool.query(migration); });
beforeEach(async () => { await pool.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE"); });
afterAll(async () => { await pool.end(); });
describe("Auth API", () => {
  test("health endpoint confirms database connection", async () => { const r = await request(app).get("/health"); expect(r.status).toBe(200); expect(r.body.database).toBe("connected"); });
  test("signup creates a user and does not return password hash", async () => {
    const r = await request(app).post("/api/auth/signup").send(userData);
    expect(r.status).toBe(201); expect(r.body.user.email).toBe(userData.email); expect(r.body.user.password_hash).toBeUndefined();
    const saved = await pool.query("SELECT password_hash FROM users WHERE email = $1", [userData.email]);
    expect(saved.rows[0].password_hash).not.toBe(userData.password); expect(saved.rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });
  test("signup rejects invalid email and short password", async () => { const r = await request(app).post("/api/auth/signup").send({ email: "bad", password: "123" }); expect(r.status).toBe(400); });
  test("signup rejects duplicate email ignoring case", async () => {
    await request(app).post("/api/auth/signup").send(userData);
    const r = await request(app).post("/api/auth/signup").send({ email: "TEST@example.com", password: userData.password }); expect(r.status).toBe(409);
  });
  test("login issues JWT for valid credentials", async () => {
    await request(app).post("/api/auth/signup").send(userData);
    const r = await request(app).post("/api/auth/login").send(userData); expect(r.status).toBe(200); expect(r.body.tokenType).toBe("Bearer"); expect(typeof r.body.accessToken).toBe("string");
  });
  test("login rejects incorrect credentials", async () => {
    await request(app).post("/api/auth/signup").send(userData);
    const r = await request(app).post("/api/auth/login").send({ email: userData.email, password: "WrongPass123!" }); expect(r.status).toBe(401);
  });
  test("protected /me rejects requests without token", async () => { const r = await request(app).get("/api/auth/me"); expect(r.status).toBe(401); });
  test("valid JWT can access /me", async () => {
    await request(app).post("/api/auth/signup").send(userData);
    const login = await request(app).post("/api/auth/login").send(userData);
    const r = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.accessToken}`); expect(r.status).toBe(200); expect(r.body.user.email).toBe(userData.email);
  });
  test("protected /me rejects invalid JWT", async () => { const r = await request(app).get("/api/auth/me").set("Authorization", "Bearer this.is.not-valid"); expect(r.status).toBe(401); });
});
