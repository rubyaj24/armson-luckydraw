"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";

export function HomeCheckupForm() {
  const startedAt = useRef(0);
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [needsCheckup, setNeedsCheckup] = useState(false);
  const onToken = useCallback((value: string) => setToken(value), []);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/home-checkup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          age: form.get("age"),
          studyYear: form.get("studyYear"),
          address: form.get("address"),
          department: form.get("department"),
          homeOwnership: form.get("homeOwnership"),
          yearsInHome: form.get("yearsInHome"),
          needsCheckup: form.get("needsCheckup") === "yes",
          consent: form.get("consent") === "on",
          website: form.get("website"),
          turnstileToken: token,
          startedAt: startedAt.current,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Your response could not be submitted.");
      setNeedsCheckup(form.get("needsCheckup") === "yes");
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Please try again.");
      setToken("");
      window.turnstile?.reset();
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="checkup-success" role="status">
        <span>✓</span>
        <h3>Thanks for sharing.</h3>
        <p>Your response has been recorded.</p>
        {needsCheckup && <>
          <p>To request a checkup, contact Armson Homes directly:</p>
          <div className="checkup-contact-actions">
            <a href="tel:+918111993111">Call +91 8111 993 111</a>
            <a href="mailto:info@armsonhomes.in">Email Armson Homes</a>
          </div>
        </>}
      </div>
    );
  }

  return (
    <form className="checkup-form" onSubmit={submit}>
      <div className="checkup-fields">
        <div className="field"><label htmlFor="checkup-name">Name</label><input id="checkup-name" name="name" autoComplete="name" minLength={2} maxLength={100} required /></div>
        <div className="field"><label htmlFor="checkup-age">Age</label><input id="checkup-age" name="age" type="number" inputMode="numeric" min={18} max={120} required /></div>
        <div className="field"><label htmlFor="checkup-year">Year of study</label><select id="checkup-year" name="studyYear" defaultValue="" required><option value="" disabled>Select year</option><option>First year</option><option>Second year</option><option>Third year</option><option>Fourth year</option><option>Other</option></select></div>
        <div className="field"><label htmlFor="checkup-department">Department</label><input id="checkup-department" name="department" maxLength={100} required /></div>
        <div className="field full-field"><label htmlFor="checkup-address">Home address</label><textarea id="checkup-address" name="address" autoComplete="street-address" rows={3} minLength={5} maxLength={500} required /></div>
        <div className="field"><label htmlFor="home-ownership">Home is</label><select id="home-ownership" name="homeOwnership" defaultValue="" required><option value="" disabled>Select one</option><option value="owned">Owned</option><option value="rented">Rented</option></select></div>
        <div className="field"><label htmlFor="years-in-home">How long have you lived there?</label><div className="checkup-years"><input id="years-in-home" name="yearsInHome" type="number" min="0" max="120" step="0.5" required /><span>years</span></div></div>
      </div>

      <fieldset className="checkup-choice">
        <legend>Do you feel your home needs a checkup?</legend>
        <label><input type="radio" name="needsCheckup" value="yes" required /><span>Yes, I would like a checkup</span></label>
        <label><input type="radio" name="needsCheckup" value="no" /><span>No, not at the moment</span></label>
      </fieldset>

      <div className="honeypot" aria-hidden="true"><label htmlFor="checkup-website">Website</label><input id="checkup-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <label className="consent-row checkup-consent"><input name="consent" type="checkbox" required /><span>I agree that event organisers may store these details to review home checkup interest. They will not share my address with Armson Homes automatically.</span></label>
      <TurnstileWidget onToken={onToken} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button checkup-submit" disabled={pending || !token} type="submit"><span>{pending ? "Submitting…" : "Submit home survey"}</span><b aria-hidden="true">→</b></button>
      <p className="form-footnote">Armson Homes · +91 8111 993 111 · info@armsonhomes.in</p>
    </form>
  );
}
