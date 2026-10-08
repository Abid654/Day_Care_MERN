import apiClient, { authConfig } from "./client";

export const getAdminDaycares = (token) => apiClient.get("/admin/daycares", authConfig(token));
export const getAdminDaycare = (daycareId, token) => apiClient.get(`/admin/daycares/${daycareId}`, authConfig(token));
export const reviewDaycare = (daycareId, decision, token) => apiClient.patch(
    `/admin/daycares/${daycareId}/review`,
    { decision },
    authConfig(token),
);
