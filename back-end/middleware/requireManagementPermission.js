const ROLE_DEFAULTS = {
  manager: {
    dashboard: ["read"], children: ["read", "create", "update", "delete"], parents: ["read", "create", "update", "delete"], staff: ["read", "create", "update", "delete"], classes: ["read", "create", "update", "delete"],
    attendance: ["read", "create", "update"], staffAttendance: ["read", "create", "update"], dailyActivities: ["read", "create", "update", "delete"], fees: ["read", "create", "update"], leave: ["read", "create", "update"], complaints: ["read", "create", "update"], requests: ["read", "update"], pickupPersons: ["read", "create", "update"], pickupLogs: ["read", "create"], notifications: ["read", "create"], announcements: ["read", "create", "update"], events: ["read", "create", "update"], documents: ["read", "create", "update"], reports: ["read"], activity: ["read"], settings: ["read"],
  },
  caregiver: { dashboard: ["read"], children: ["read"], attendance: ["read", "create", "update"], dailyActivities: ["read", "create", "update"], pickupPersons: ["read"], pickupLogs: ["read", "create"], events: ["read"], announcements: ["read"] },
  nurse: { dashboard: ["read"], children: ["read"], attendance: ["read", "create", "update"], dailyActivities: ["read", "create", "update"], pickupPersons: ["read"], pickupLogs: ["read"], documents: ["read"], events: ["read"], announcements: ["read"] },
  support: { dashboard: ["read"] },
};

function requireManagementPermission(action) {
  return (req, res, next) => {
    if (req.user?.role === "daycare") return next();
    const moduleName = req.params.module || (req.path.includes("documents") ? "documents" : req.path.includes("settings") ? "settings" : "dashboard");
    const userPermissions = req.user?.permissions?.[moduleName];
    const allowed = userPermissions || ROLE_DEFAULTS[req.user?.role]?.[moduleName] || [];
    if (!allowed.includes(action)) return res.status(403).json({ success: false, message: "You do not have permission to perform this action" });
    return next();
  };
}

module.exports = requireManagementPermission;
