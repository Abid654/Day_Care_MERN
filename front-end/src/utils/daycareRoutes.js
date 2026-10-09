const DAYCARE_ROLES = ["daycare", "manager", "caregiver", "nurse", "support"];

export const getDaycareDashboardPath = (role, module = "overview") => {
    const rolePath = DAYCARE_ROLES.includes(role) && role !== "daycare" ? `/${role}` : "";
    const modulePath = !module || module === "overview" ? "" : `/${module}`;
    return `/daycare${rolePath}/dashboard${modulePath}`;
};

export const getLandingPathForRole = (role) => {
    if (role === "admin") return "/admin/dashboard";
    if (role === "parent") return "/parent/dashboard";
    if (DAYCARE_ROLES.includes(role)) return getDaycareDashboardPath(role);
    return "/";
};

export { DAYCARE_ROLES };
