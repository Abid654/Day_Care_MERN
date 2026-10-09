import apiClient, { authConfig } from "./client";

export const getParentPortal = (token) => apiClient.get("/parent/portal", authConfig(token));
export const getParentProfile = (token) => apiClient.get("/parent/profile", authConfig(token));
export const updateParentProfile = (profile, token) => apiClient.put("/parent/profile", profile, authConfig(token));
export const getParentProfilePhoto = (token) => apiClient.get("/parent/profile/photo", { ...authConfig(token), responseType: "blob" });
export const uploadParentProfilePhoto = (file, token) => apiClient.post("/parent/profile/photo", file, { ...authConfig(token), headers: { ...authConfig(token).headers, "Content-Type": file.type } });
export const deleteParentProfilePhoto = (token) => apiClient.delete("/parent/profile/photo", authConfig(token));
export const getParentChildPhoto = (tenantId, childId, token) => apiClient.get(`/parent/portal/${tenantId}/children/${childId}/photo`, { ...authConfig(token), responseType: "blob" });
export const createParentComplaint = (tenantId, payload, token) => apiClient.post(`/parent/portal/${tenantId}/complaints`, payload, authConfig(token));
export const createParentRequest = (tenantId, payload, token) => apiClient.post(`/parent/portal/${tenantId}/requests`, payload, authConfig(token));
