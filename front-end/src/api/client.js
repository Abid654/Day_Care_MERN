import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

apiClient.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new CustomEvent("auth:expired"));
        const loginPath = window.location.pathname.startsWith("/admin") ? "/admin" : "/";
        if (window.location.pathname !== loginPath) window.location.assign(loginPath);
    }
    return Promise.reject(error);
});

export const authConfig = (token) => ({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
});

export const getAssetUrl = (path) => {
    if (!path) return "";
    if (/^(?:https?:\/\/|data:|blob:)/i.test(path)) return path;
    return `${API_BASE_URL}${path}`;
};

export default apiClient;
