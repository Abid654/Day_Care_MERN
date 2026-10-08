import apiClient from "./client";

export const login = (credentials) => apiClient.post("/auth/login", credentials);
export const register = (userData) => apiClient.post("/auth/register", userData);
