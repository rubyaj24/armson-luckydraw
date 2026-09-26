"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TurnstileWidget } from "@/components/turnstile-widget";

type Success = { luckyDrawId: string; sequence: number; existing: boolean };

export function RegistrationForm({ closed, paused }: { closed: boolean; paused: boolean }) {
  const startedAt = useRef(0);
  const submissionKey = useRef(crypto.randomUUID());
  const [turnstileToken, setTurnstileToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);
  const onToken = useCallback((token: string) => setTurnstileToken(token), []);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          age: form.get("age"),
          city: form.get("city"),
          email: form.get("email"),
          phone: form.get("phone"),
          consent: form.get("consent") === "on",
          website: form.get("website"),
          turnstileToken,
          submissionKey: submissionKey.current,
          startedAt: startedAt.current,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Registration failed.");
      setSuccess(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Please try again.");
      setTurnstileToken("");
      window.turnstile?.reset();
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="success-card" role="status">
        <div className="success-icon">✓</div>
        <p className="panel-kicker">{success.existing ? "Already registered" : "Entry confirmed"}</p>
        <h3>Your lucky-draw ID</h3>
        <button
          className="lucky-id"
          type="button"
          title="Copy lucky-draw ID"
          onClick={() => navigator.clipboard.writeText(success.luckyDrawId)}
        >
          {success.luckyDrawId}
          <small>Tap to copy</small>
        </button>
        <p>Save or screenshot this ID. We will email you if it is selected.</p>
        <div className="sequence-note">Confirmed entry #{success.sequence}</div>
      </div>
    );
  }

  if (closed || paused) {
    return (
      <div className="closed-card">
        <span>{closed ? "Draw closed" : "Registration paused"}</span>
        <h3>{closed ? "This lucky draw has ended." : "We’ll be back shortly."}</h3>
        <p>{closed ? "Thank you for taking part in the festival." : "The help desk has temporarily paused new entries."}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="registration-form">
      <div className="field full-field">
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" autoComplete="name" maxLength={100} required placeholder="As shown on your ID" />
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="age">Age</label>
          <input id="age" name="age" type="number" inputMode="numeric" min={18} max={120} required placeholder="18+" />
        </div>
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" name="city" autoComplete="address-level2" maxLength={100} required placeholder="Your city" />
        </div>
      </div>

      <div className="field full-field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
      </div>

      <div className="field full-field">
        <label htmlFor="phone">Mobile number</label>
        <div className="phone-input"><span>+91</span><input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" pattern="[6-9][0-9]{9}" maxLength={10} required placeholder="98765 43210" /></div>
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="consent-row">
        <input name="consent" type="checkbox" required />
        <span>I confirm that I am 18 or older and agree to the <Link href="/rules">draw rules</Link> and <Link href="/privacy">privacy notice</Link>.</span>
      </label>

      <TurnstileWidget onToken={onToken} />
      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="primary-button" disabled={pending || !turnstileToken} type="submit">
        <span>{pending ? "Confirming…" : "Get my lucky-draw ID"}</span>
        {!pending && <b aria-hidden="true">→</b>}
      </button>
      <p className="form-footnote">One entry per email and mobile number.</p>
    </form>
  );
}
