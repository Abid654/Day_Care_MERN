import { createSlice } from "@reduxjs/toolkit";

const dashboardSlice = createSlice({
    name: "dashboard",
    initialState: { overview: null, loading: false, notifications: [] },
    reducers: {
        setOverview: (state, action) => { state.overview = action.payload; },
        setDashboardLoading: (state, action) => { state.loading = action.payload; },
        setDashboardNotifications: (state, action) => { state.notifications = action.payload; },
        pushDashboardNotification: (state, action) => { state.notifications = [action.payload, ...state.notifications.filter((item) => item.id !== action.payload.id)].slice(0, 25); },
        clearDashboardNotifications: (state) => { state.notifications = []; },
        clearDashboard: (state) => { state.overview = null; state.loading = false; state.notifications = []; },
    },
});

export const { setOverview, setDashboardLoading, setDashboardNotifications, pushDashboardNotification, clearDashboardNotifications, clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
