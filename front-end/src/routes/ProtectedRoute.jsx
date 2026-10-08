import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectAuth } from "../redux/slices/authSlice";

const landingForRole = (role) => {
    if (role === "admin") return "/admin/dashboard";
    if (role === "parent") return "/parent/dashboard";
    if (["daycare", "manager", "caregiver"].includes(role)) return "/daycare/dashboard";
    return "/";
};

const ProtectedRoute = ({ roles, children }) => {
    const { token, user } = useSelector(selectAuth);
    const location = useLocation();
    if (!token || !user) return <Navigate to={location.pathname.startsWith("/admin") ? "/admin" : "/"} replace state={{ from: location }} />;
    if (roles && !roles.includes(user.role)) return <Navigate to={landingForRole(user.role)} replace />;
    return children;
};

export default ProtectedRoute;
