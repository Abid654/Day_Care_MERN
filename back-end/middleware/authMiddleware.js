const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { getMainModels, getTenantConnection, getTenantModels } = require("../config/db");

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Access denied. No token provided" });
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (!mongoose.Types.ObjectId.isValid(decoded.userId) || !["parent", "daycare", "admin"].includes(decoded.role)) return res.status(401).json({ success: false, message: "Invalid token claims" });
    const mainModels = getMainModels();

    if (decoded.role === "daycare") {
      if (!mongoose.Types.ObjectId.isValid(decoded.tenantId)) return res.status(401).json({ success: false, message: "Invalid tenant claim" });
      const tenant = await mainModels.Tenant.findOne({ _id: decoded.tenantId, status: "active" }).lean();
      if (!tenant) return res.status(403).json({ success: false, message: "Daycare tenant is unavailable" });
      const connection = getTenantConnection(tenant.databaseName);
      const models = getTenantModels(connection);
      const user = await models.User.findOne({ _id: decoded.userId, role: "daycare", isActive: true }).select("_id").lean();
      if (!user) return res.status(401).json({ success: false, message: "Account is unavailable" });
      req.tenant = tenant;
      req.db = connection;
      req.models = models;
    } else {
      if (decoded.tenantId) return res.status(401).json({ success: false, message: "Unexpected tenant claim" });
      const user = await mainModels.User.findOne({ _id: decoded.userId, role: decoded.role, isActive: true }).select("_id").lean();
      if (!user) return res.status(401).json({ success: false, message: "Account is unavailable" });
      req.tenant = null;
      req.db = getMainModels().User.db;
      req.models = mainModels;
    }
    req.mainModels = mainModels;
    req.user = { userId: decoded.userId, role: decoded.role, tenantId: decoded.tenantId || null };
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") return res.status(401).json({ success: false, message: "Invalid or expired token" });
    console.error("Authentication/database error:", error.message);
    return res.status(503).json({ success: false, message: "Authentication service temporarily unavailable" });
  }
}

module.exports = authMiddleware;
