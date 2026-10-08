import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";
import ParentDashboard from "../pages/ParentDashboard";
import DaycareDashboard from "../pages/DaycareDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import DaycareProfilePage from "../pages/DaycareProfilePage";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Login adminOnly />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/parent/dashboard" element={<ParentDashboard />} />
        <Route path="/daycares/:daycareId" element={<DaycareProfilePage />} />
        <Route path="/daycare/dashboard" element={<DaycareDashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
