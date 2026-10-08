import { createSlice } from "@reduxjs/toolkit";

const readSession = () => {
    try {
        return {
            token: localStorage.getItem("token"),
            user: JSON.parse(localStorage.getItem("user") || "null"),
        };
    } catch {
        return { token: null, user: null };
    }
};

const authSlice = createSlice({
    name: "auth",
    initialState: readSession,
    reducers: {
        setCredentials: (state, action) => {
            state.token = action.payload.token;
            state.user = action.payload.user;
        },
        clearCredentials: (state) => {
            state.token = null;
            state.user = null;
        },
        updateUser: (state, action) => {
            state.user = { ...state.user, ...action.payload };
        },
    },
});

export const { setCredentials, clearCredentials, updateUser } = authSlice.actions;
export const selectAuth = (state) => state.auth;
export const selectPermissions = (state) => state.auth.user?.permissions || {};
export default authSlice.reducer;
