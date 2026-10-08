// Use after authMiddleware. The tenant and model set are derived from verified JWT claims.
function requireTenant(req, res, next) {
  if (!req.tenant || !req.db || !req.models) {
    return res.status(403).json({ success: false, message: "An active daycare account is required" });
  }
  return next();
}

module.exports = requireTenant;
