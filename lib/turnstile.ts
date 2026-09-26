type TurnstileResult = {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? { success: false, "error-codes": ["missing-secret"] }
      : { success: token === "dev-bypass", hostname: "localhost" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          response: token,
          remoteip: remoteIp,
          idempotency_key: crypto.randomUUID(),
        }),
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) return { success: false, "error-codes": ["upstream-error"] };
    return (await response.json()) as TurnstileResult;
  } catch {
    return { success: false, "error-codes": ["internal-error"] };
  } finally {
    clearTimeout(timeout);
  }
}
