import apiClient, { authConfig } from "./client";

export const getAdminDaycares = (token) => apiClient.get("/admin/daycares", authConfig(token));
export const getAdminOverview = (token) => apiClient.get("/admin/overview", authConfig(token));
export const getAdminRecords = (module, params, token) => apiClient.get(`/admin/records/${module}`, { ...authConfig(token), params });
export const getAdminDaycare = (daycareId, token) => apiClient.get(`/admin/daycares/${daycareId}`, authConfig(token));
export const getAdminDaycareUsers = (daycareId, token) => apiClient.get(`/admin/daycares/${daycareId}/users`, authConfig(token));
export const getAdminDaycareActivityLogs = (daycareId, params, token) => apiClient.get(`/admin/daycares/${daycareId}/activity-logs`, { ...authConfig(token), params });
export const updateAdminDaycareUserLimit = (daycareId, userLimit, token) => apiClient.patch(`/admin/daycares/${daycareId}/user-limit`, { userLimit }, authConfig(token));
export const updateAdminDaycareUser = (daycareId, userId, changes, token) => apiClient.patch(`/admin/daycares/${daycareId}/users/${userId}`, changes, authConfig(token));
export const reviewDaycare = (daycareId, decision, token) => apiClient.patch(
    `/admin/daycares/${daycareId}/review`,
    typeof decision === "string" ? { decision } : decision,
    authConfig(token),
);
export const changeAdminDaycareStatus = (daycareId, action, reason, token) => apiClient.patch(
    `/admin/daycares/${daycareId}/status`,
    { action, reason },
    authConfig(token),
);
