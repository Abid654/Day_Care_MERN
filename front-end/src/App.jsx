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
  useEffect(() => {
    const openPickerForDateTimeInput = (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !["date", "time", "datetime-local"].includes(input.type)) return;
      if (typeof input.showPicker !== "function") return;

      try {
        input.showPicker();
      } catch {
        // The picker may already be open or unsupported by the browser.
      }
    };

    document.addEventListener("click", openPickerForDateTimeInput, true);
    return () => document.removeEventListener("click", openPickerForDateTimeInput, true);
  }, []);
  return <AppRoutes />;
}

export default App;
