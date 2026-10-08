const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { getMainModels, getTenantConnection, getTenantModels } = require("../config/db");

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Access denied. No token provided" });
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (!mongoose.Types.ObjectId.isValid(decoded.userId) || !["parent", "daycare", "admin", "manager", "caregiver"].includes(decoded.role)) return res.status(401).json({ success: false, message: "Invalid token claims" });
    const mainModels = getMainModels();
    let permissions = {};

    if (["daycare", "manager", "caregiver"].includes(decoded.role)) {
      if (!mongoose.Types.ObjectId.isValid(decoded.tenantId)) return res.status(401).json({ success: false, message: "Invalid tenant claim" });
      const tenant = await mainModels.Tenant.findOne({ _id: decoded.tenantId, status: "active" }).lean();
      if (!tenant) return res.status(403).json({ success: false, message: "Daycare tenant is unavailable" });
      const connection = getTenantConnection(tenant.databaseName);
      const models = getTenantModels(connection);
      const user = await models.User.findOne({ _id: decoded.userId, role: decoded.role, isActive: true }).select("_id tokenVersion").lean();
      if (!user) return res.status(401).json({ success: false, message: "Account is unavailable" });
      if (Number(decoded.tokenVersion || 0) !== Number(user.tokenVersion || 0)) return res.status(401).json({ success: false, message: "Session has expired. Please sign in again" });
      if (decoded.role !== "daycare") {
        const membership = await mainModels.TenantMembership.findOne({ tenant: tenant._id, user: decoded.userId, role: decoded.role, isActive: true }).lean();
        if (!membership) return res.status(403).json({ success: false, message: "Daycare access is unavailable" });
        permissions = Object.fromEntries(membership.permissions instanceof Map ? membership.permissions : Object.entries(membership.permissions || {}));
      }
      req.tenant = tenant;
      req.db = connection;
      req.models = models;
    } else {
      if (decoded.tenantId) return res.status(401).json({ success: false, message: "Unexpected tenant claim" });
      const user = await mainModels.User.findOne({ _id: decoded.userId, role: decoded.role, isActive: true }).select("_id tokenVersion").lean();
      if (!user) return res.status(401).json({ success: false, message: "Account is unavailable" });
      if (Number(decoded.tokenVersion || 0) !== Number(user.tokenVersion || 0)) return res.status(401).json({ success: false, message: "Session has expired. Please sign in again" });
      req.tenant = null;
      req.db = getMainModels().User.db;
      req.models = mainModels;
    }
    req.mainModels = mainModels;
    req.user = { userId: decoded.userId, role: decoded.role, tenantId: decoded.tenantId || null, permissions };
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") return res.status(401).json({ success: false, message: "Invalid or expired token" });
    console.error("Authentication/database error:", error.message);
    return res.status(503).json({ success: false, message: "Authentication service temporarily unavailable" });
  }
}

module.exports = authMiddleware;
