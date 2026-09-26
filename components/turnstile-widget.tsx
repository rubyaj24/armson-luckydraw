"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    onLuckyDrawTurnstile?: (token: string) => void;
    onLuckyDrawTurnstileExpired?: () => void;
    turnstile?: { reset: () => void };
  }
}

export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    window.onLuckyDrawTurnstile = onToken;
    window.onLuckyDrawTurnstileExpired = () => onToken("");
    if (!siteKey && process.env.NODE_ENV !== "production") onToken("dev-bypass");

    return () => {
      delete window.onLuckyDrawTurnstile;
      delete window.onLuckyDrawTurnstileExpired;
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
          className="cf-turnstile"
          data-sitekey={siteKey}
          data-theme="light"
          data-size="flexible"
          data-callback="onLuckyDrawTurnstile"
          data-expired-callback="onLuckyDrawTurnstileExpired"
          data-error-callback="onLuckyDrawTurnstileExpired"
        />
      </div>
    </>
  );
}
