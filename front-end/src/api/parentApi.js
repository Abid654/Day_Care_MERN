import apiClient, { authConfig } from "./client";

export const getParentPortal = (token) => apiClient.get("/parent/portal", authConfig(token));
export const getParentChildPhoto = (tenantId, childId, token) => apiClient.get(`/parent/portal/${tenantId}/children/${childId}/photo`, { ...authConfig(token), responseType: "blob" });
export const createParentComplaint = (tenantId, payload, token) => apiClient.post(`/parent/portal/${tenantId}/complaints`, payload, authConfig(token));
export const createParentRequest = (tenantId, payload, token) => apiClient.post(`/parent/portal/${tenantId}/requests`, payload, authConfig(token));
