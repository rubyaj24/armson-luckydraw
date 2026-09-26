"use client";

import Script from "next/script";
import { useEffect, useState, useSyncExternalStore } from "react";

declare global {
  interface Window {
    onLuckyDrawTurnstile?: (token: string) => void;
    onLuckyDrawTurnstileExpired?: () => void;
    onLuckyDrawTurnstileError?: (code?: string) => void;
    onLuckyDrawTurnstileUnsupported?: () => void;
    turnstile?: { reset: () => void };
  }
}

function subscribeToViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function getWidgetSize() {
  return window.innerWidth <= 380 ? "compact" as const : "flexible" as const;
}

export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const widgetSize = useSyncExternalStore(
    subscribeToViewport,
    getWidgetSize,
    () => "flexible" as const,
  );
  const [widgetError, setWidgetError] = useState("");

  useEffect(() => {
    window.onLuckyDrawTurnstile = (token) => {
      setWidgetError("");
      onToken(token);
    };
    window.onLuckyDrawTurnstileExpired = () => onToken("");
    window.onLuckyDrawTurnstileError = () => {
      onToken("");
      setWidgetError("Security check could not load. Check your connection, disable any blocker or VPN, then retry.");
    };
    window.onLuckyDrawTurnstileUnsupported = () => {
      onToken("");
      setWidgetError("This browser cannot run the security check. Please update it or use Chrome, Safari, Firefox, or Edge.");
    };
    if (!siteKey && process.env.NODE_ENV !== "production") onToken("dev-bypass");

    return () => {
      delete window.onLuckyDrawTurnstile;
      delete window.onLuckyDrawTurnstileExpired;
      delete window.onLuckyDrawTurnstileError;
      delete window.onLuckyDrawTurnstileUnsupported;
    };
  }, [onToken, siteKey]);

  if (!siteKey) {
    return process.env.NODE_ENV === "production" ? (
      <p className="form-error">Security verification is not configured.</p>
    ) : null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div className="turnstile-wrap">
        <div
          key={widgetSize}
          className="cf-turnstile"
          data-sitekey={siteKey}
          data-theme="light"
          data-size={widgetSize}
          data-callback="onLuckyDrawTurnstile"
          data-expired-callback="onLuckyDrawTurnstileExpired"
          data-error-callback="onLuckyDrawTurnstileError"
          data-unsupported-callback="onLuckyDrawTurnstileUnsupported"
          data-retry="auto"
          data-refresh-expired="auto"
        />
      </div>
      {widgetError && (
        <div className="turnstile-error" role="alert">
          <span>{widgetError}</span>
          <button
            type="button"
            onClick={() => {
              setWidgetError("");
              window.turnstile?.reset();
            }}
          >
            Retry security check
          </button>
        </div>
      )}
    </>
  );
}
