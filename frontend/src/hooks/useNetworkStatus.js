/**
 * useNetworkStatus - Hook for detecting online/offline connectivity.
 *
 * Returns a boolean indicating whether the browser currently has
 * network connectivity. Listens to the "online" and "offline" events
 * on the window object and re-renders when the status changes.
 *
 * @returns {boolean} True if online, false if offline.
 */

import { useState, useEffect } from "react";

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
