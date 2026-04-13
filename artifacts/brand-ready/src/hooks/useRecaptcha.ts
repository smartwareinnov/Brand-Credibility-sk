import { useEffect, useCallback, useRef } from "react";
import { useAppConfig } from "./useAppConfig";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let scriptLoaded = false;

function loadScript(siteKey: string) {
  if (scriptLoaded) return;
  scriptLoaded = true;
  const script = document.createElement("script");
  script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  script.async = true;
  document.head.appendChild(script);
}

export function useRecaptcha() {
  const { recaptchaEnabled, recaptchaSiteKey } = useAppConfig();
  const siteKeyRef = useRef(recaptchaSiteKey);
  siteKeyRef.current = recaptchaSiteKey;

  useEffect(() => {
    if (recaptchaEnabled && recaptchaSiteKey) {
      loadScript(recaptchaSiteKey);
    }
  }, [recaptchaEnabled, recaptchaSiteKey]);

  const getToken = useCallback(async (action: string): Promise<string | undefined> => {
    if (!recaptchaEnabled || !siteKeyRef.current) return undefined;

    return new Promise((resolve) => {
      const g = window.grecaptcha;
      if (!g) { resolve(undefined); return; }
      g.ready(async () => {
        try {
          const token = await g.execute(siteKeyRef.current!, { action });
          resolve(token);
        } catch {
          resolve(undefined);
        }
      });
    });
  }, [recaptchaEnabled]);

  return { recaptchaEnabled, getToken };
}
