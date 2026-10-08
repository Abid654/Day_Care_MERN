import apiClient, { authConfig } from "./client";

export const getDaycareProfile = (token) => apiClient.get("/daycare/profile", authConfig(token));

export const uploadDaycarePhoto = (file, token) => apiClient.post("/daycare/profile/photos", file, {
    ...authConfig(token),
    headers: { ...authConfig(token).headers, "Content-Type": file.type },
});

export const saveDaycareProfile = (profile, token) => apiClient.put("/daycare/profile", profile, authConfig(token));
export const getDaycareListings = () => apiClient.get("/daycares");
export const getDaycareListing = (daycareId) => apiClient.get(`/daycares/${daycareId}`);
