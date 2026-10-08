import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastContainer } from "react-toastify";
import { Provider } from "react-redux";
import { store } from "./redux/store";

import "./index.css";
import "react-toastify/dist/ReactToastify.css";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <Provider store={store}><App /></Provider>

        <ToastContainer
            position="top-right"
            autoClose={3000}
            theme="light"
        />
    </StrictMode>
);
