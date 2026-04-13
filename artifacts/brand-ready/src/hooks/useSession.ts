import { useState, useEffect } from "react";

const SESSION_KEY = "skorvia_session_id";
const AUTHED_KEY = "skorvia_authed";

function generateSessionId(): string {
  return "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useSession(): string {
  const [sessionId, setSessionId] = useState<string>(() => {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = generateSessionId();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  });

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      const id = generateSessionId();
      localStorage.setItem(SESSION_KEY, id);
      setSessionId(id);
    }
  }, []);

  return sessionId;
}

export function getSessionId(): string {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = generateSessionId();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

export function markAuthenticated(): void {
  localStorage.setItem(AUTHED_KEY, "1");
}

export function markPlanSelected(): void {
  localStorage.setItem("skorvia_plan_selected", "1");
}

export function hasPlanSelected(): boolean {
  return !!localStorage.getItem("skorvia_plan_selected");
}

export function clearAuthenticated(): void {
  localStorage.removeItem(AUTHED_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("skorvia_plan_selected");
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(AUTHED_KEY);
}

export function useIsAuthenticated(): boolean {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem(AUTHED_KEY));
  useEffect(() => {
    const sync = () => setAuthed(!!localStorage.getItem(AUTHED_KEY));
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return authed;
}
