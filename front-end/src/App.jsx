import { useEffect } from "react";
import { useDispatch } from "react-redux";
import AppRoutes from "./routes/AppRoutes";
import { clearCredentials } from "./redux/slices/authSlice";
import { clearDashboard } from "./redux/slices/dashboardSlice";

function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    const handleExpiredSession = () => {
      dispatch(clearCredentials());
      dispatch(clearDashboard());
    };
    window.addEventListener("auth:expired", handleExpiredSession);
    return () => window.removeEventListener("auth:expired", handleExpiredSession);
  }, [dispatch]);
  return <AppRoutes />;
}

export default App;
