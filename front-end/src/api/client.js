import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

export const authConfig = (token) => ({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
});

export const getAssetUrl = (path) => {
    if (!path) return "";
    return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
};

export default apiClient;
