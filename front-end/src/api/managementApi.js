import apiClient, { authConfig } from "./client";

export const getManagementOverview = (token) => apiClient.get("/daycare/management/overview", authConfig(token));
export const getDaycareSettings = (token) => apiClient.get("/daycare/management/settings", authConfig(token));
export const saveDaycareSettings = (settings, token) => apiClient.put("/daycare/management/settings", settings, authConfig(token));
export const listManagementRecords = (module, params, token) => apiClient.get(`/daycare/management/${module}`, { ...authConfig(token), params });
export const createManagementRecord = (module, record, token) => apiClient.post(`/daycare/management/${module}`, record, authConfig(token));
export const updateManagementRecord = (module, id, record, token) => apiClient.put(`/daycare/management/${module}/${id}`, record, authConfig(token));
export const deleteManagementRecord = (module, id, token) => apiClient.delete(`/daycare/management/${module}/${id}`, authConfig(token));
export const listDaycareUsers = (token) => apiClient.get("/daycare/management/users", authConfig(token));
export const createDaycareUser = (payload, token) => apiClient.post("/daycare/management/users", payload, authConfig(token));
export const updateDaycareUser = (id, payload, token) => apiClient.put(`/daycare/management/users/${id}`, payload, authConfig(token));
export const logDaycareLogout = (token) => apiClient.post("/daycare/management/logout", {}, authConfig(token));
export const uploadDaycareDocument = (file, metadata, token, documentId) => apiClient.post("/daycare/management/documents/files", file, {
    ...authConfig(token), params: { ...metadata, documentId }, headers: { ...authConfig(token).headers, "Content-Type": file.type },
});
export const downloadDaycareDocument = (id, token) => apiClient.get(`/daycare/management/documents/${id}/file`, { ...authConfig(token), responseType: "blob" });
export const changeDaycarePassword = (payload, token) => apiClient.put("/daycare/management/security/password", payload, authConfig(token));
