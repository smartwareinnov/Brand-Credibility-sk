import { useCallback } from "react";
import { useSession } from "@/hooks/useSession";

const API_BASE = (() => {
  try {
    return import.meta.env.BASE_URL.replace(/\/$/, "");
  } catch {
    return "";
  }
})();

export function useApi() {
  const sessionId = useSession();

  const apiFetch = useCallback(
    async <T = unknown>(path: string, options: RequestInit = {}): Promise<T> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (sessionId) {
        headers["x-session-id"] = sessionId;
      }

      const res = await fetch(`${API_BASE}/api${path}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }

      return res.json() as Promise<T>;
    },
    [sessionId],
  );

  return { apiFetch, sessionId };
}
