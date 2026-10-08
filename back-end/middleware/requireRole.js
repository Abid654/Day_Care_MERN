function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ success: false, message: "You do not have permission to access this resource" });
    }
    return next();
  };
}

module.exports = requireRole;
