import { useEffect, useRef } from "react";
import { clearAuthenticated, isAuthenticated } from "./useSession";
import { useAppConfig } from "./useAppConfig";

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes default
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "keydown",
  "click",
  "touchstart",
  "scroll",
];

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export function useInactivityLogout() {
  const { sessionTimeout } = useAppConfig();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // sessionTimeout from admin is in minutes; convert to ms, fallback to 30 min
  const timeoutMs = sessionTimeout && sessionTimeout > 0
    ? sessionTimeout * 60 * 1000
    : DEFAULT_TIMEOUT_MS;

  useEffect(() => {
    if (!isAuthenticated()) return;

    const logout = () => {
      clearAuthenticated();
      window.location.href = `${BASE}/login`;
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, timeoutMs);
    };

    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [timeoutMs]);
}
