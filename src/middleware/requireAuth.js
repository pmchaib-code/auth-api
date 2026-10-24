const jwt = require("jsonwebtoken");
function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token, extra] = authorization.split(" ");
  if (scheme !== "Bearer" || !token || extra) return res.status(401).json({ error: "AUTHENTICATION_REQUIRED", message: "Provide a token using Authorization: Bearer <token>." });
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET is not configured.");
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (_error) { return res.status(401).json({ error: "INVALID_TOKEN", message: "The token is invalid or expired." }); }
}
module.exports = { requireAuth };
