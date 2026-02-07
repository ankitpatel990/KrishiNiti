import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./index.css";

// ---------------------------------------------------------------------------
// Toast Configuration
// ---------------------------------------------------------------------------

const TOAST_OPTIONS = {
  position: "top-right",
  duration: 4000,
  style: {
    borderRadius: "8px",
    background: "#1e293b",
    color: "#f8fafc",
    fontSize: "14px",
  },
  success: {
    iconTheme: {
      primary: "#22c55e",
      secondary: "#f0fdf4",
    },
  },
  error: {
    iconTheme: {
      primary: "#ef4444",
      secondary: "#fef2f2",
    },
  },
};

// ---------------------------------------------------------------------------
// Service Worker Registration
// ---------------------------------------------------------------------------

function registerServiceWorker() {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.info("[SW] Registered:", registration.scope);
        })
        .catch((error) => {
          console.warn("[SW] Registration failed:", error);
        });
    });
  }
}

// ---------------------------------------------------------------------------
// Mount Application
// ---------------------------------------------------------------------------

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element not found. Ensure index.html contains a <div id='root'></div>.",
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster toastOptions={TOAST_OPTIONS} />
    </BrowserRouter>
  </StrictMode>,
);

registerServiceWorker();
