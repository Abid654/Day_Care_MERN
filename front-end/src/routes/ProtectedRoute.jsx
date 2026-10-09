import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectAuth } from "../redux/slices/authSlice";
import { getLandingPathForRole } from "../utils/daycareRoutes";

const ProtectedRoute = ({ roles, children }) => {
    const { token, user } = useSelector(selectAuth);
    const location = useLocation();
    if (!token || !user) return <Navigate to={location.pathname.startsWith("/admin") ? "/admin" : "/"} replace state={{ from: location }} />;
    if (roles && !roles.includes(user.role)) return <Navigate to={getLandingPathForRole(user.role)} replace />;
    return children;
};

export default ProtectedRoute;
