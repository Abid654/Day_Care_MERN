import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./ProtectedRoute";

import Login from "../pages/Login";
import Register from "../pages/Register";
const ParentDashboard = lazy(() => import("../pages/ParentDashboard"));
const ParentBookingsPage = lazy(() => import("../pages/ParentBookingsPage"));
const ParentDaycaresPage = lazy(() => import("../pages/ParentDaycaresPage"));
const DaycareDashboard = lazy(() => import("../pages/DaycareDashboard"));
const DaycareManagementDashboard = lazy(() => import("../pages/DaycareManagementDashboard"));
const DaycareAdminProfile = lazy(() => import("../pages/DaycareAdminProfile"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const DaycareProfilePage = lazy(() => import("../pages/DaycareProfilePage"));

const RouteLoading = () => <div className="min-h-screen bg-slate-50" aria-label="Loading page" />;

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Login adminOnly />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute roles={["admin"]}><Suspense fallback={<RouteLoading />}><AdminDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/admin/daycares" element={<ProtectedRoute roles={["admin"]}><Suspense fallback={<RouteLoading />}><AdminDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/admin/daycares/:daycareId" element={<ProtectedRoute roles={["admin"]}><Suspense fallback={<RouteLoading />}><DaycareProfilePage adminView /></Suspense></ProtectedRoute>} />
        <Route path="/admin/:module" element={<ProtectedRoute roles={["admin"]}><Suspense fallback={<RouteLoading />}><AdminDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/register" element={<Register />} />
        <Route path="/parent/dashboard" element={<ProtectedRoute roles={["parent"]}><Suspense fallback={<RouteLoading />}><ParentDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/parent/bookings" element={<ProtectedRoute roles={["parent"]}><Suspense fallback={<RouteLoading />}><ParentBookingsPage /></Suspense></ProtectedRoute>} />
        <Route path="/parent/daycares" element={<ProtectedRoute roles={["parent"]}><Suspense fallback={<RouteLoading />}><ParentDaycaresPage /></Suspense></ProtectedRoute>} />
        <Route path="/daycares/:daycareId" element={<ProtectedRoute roles={["parent"]}><Suspense fallback={<RouteLoading />}><DaycareProfilePage /></Suspense></ProtectedRoute>} />
        <Route path="/daycare/dashboard" element={<ProtectedRoute roles={["daycare", "manager", "caregiver", "nurse", "support"]}><Suspense fallback={<RouteLoading />}><DaycareManagementDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/daycare/dashboard/:module" element={<ProtectedRoute roles={["daycare", "manager", "caregiver", "nurse", "support"]}><Suspense fallback={<RouteLoading />}><DaycareManagementDashboard /></Suspense></ProtectedRoute>} />
        {["manager", "caregiver", "nurse", "support"].map((role) => <Route key={role} path={`/daycare/${role}/dashboard`} element={<ProtectedRoute roles={[role]}><Suspense fallback={<RouteLoading />}><DaycareManagementDashboard /></Suspense></ProtectedRoute>} />)}
        {["manager", "caregiver", "nurse", "support"].map((role) => <Route key={`${role}-module`} path={`/daycare/${role}/dashboard/:module`} element={<ProtectedRoute roles={[role]}><Suspense fallback={<RouteLoading />}><DaycareManagementDashboard /></Suspense></ProtectedRoute>} />)}
        <Route path="/daycare/profile" element={<ProtectedRoute roles={["daycare", "manager", "caregiver", "nurse", "support"]}><Suspense fallback={<RouteLoading />}><DaycareAdminProfile /></Suspense></ProtectedRoute>} />
        <Route path="/daycare/profile/setup" element={<ProtectedRoute roles={["daycare"]}><Suspense fallback={<RouteLoading />}><DaycareDashboard /></Suspense></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
