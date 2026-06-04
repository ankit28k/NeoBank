const User = require("../models/user");
const { verifyToken } = require("../services/auth");

// Protect routes — requires a valid JWT in Authorization header
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const user = await User.findById(decoded.userId).select("-password");
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  req.user = user; // Attach user to request
  next();
}

module.exports = { requireAuth };
