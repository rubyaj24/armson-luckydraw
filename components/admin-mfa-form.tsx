"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Factor = { id: string; status: string };

export function AdminMfaForm() {
  const router = useRouter();
  const [factor, setFactor] = useState<Factor | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function prepare() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error: listError } = await supabase.auth.mfa.listFactors();
        if (listError) throw listError;
        const verified = data.totp.find((item) => item.status === "verified");
        if (verified) {
          if (active) setFactor(verified);
          return;
        }

        for (const pendingFactor of data.totp.filter((item) => item.status !== "verified")) {
          await supabase.auth.mfa.unenroll({ factorId: pendingFactor.id });
        }

        const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Lucky Draw Admin",
        });
        if (enrollError) throw enrollError;
        if (active) {
          setFactor({ id: enrollment.id, status: "unverified" });
          setQrCode(enrollment.totp.qr_code);
          setSecret(enrollment.totp.secret);
        }
      } catch (prepareError) {
        if (active) setError(prepareError instanceof Error ? prepareError.message : "Could not prepare MFA.");
      } finally {
        if (active) setLoading(false);
      }
    }
    prepare();
    return () => { active = false; };
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factor) return;
    setPending(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const code = String(form.get("code")).replace(/\D/g, "");
      const { error: verifyError } = await createBrowserSupabaseClient().auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code,
      });
      if (verifyError) throw verifyError;
      router.replace("/admin");
      router.refresh();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Verification failed.");
    } finally { setPending(false); }
  }

  if (loading) return <p className="mfa-loading">Preparing secure verification…</p>;

  return (
    <form onSubmit={verify} className="admin-login-form">
      {qrCode && (
        <div className="mfa-setup">
          <p>Scan this once with an authenticator app, then enter its six-digit code.</p>
          {/* Supabase returns a self-contained data URI, not user-controlled HTML. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="Authenticator QR code" width={190} height={190} />
          <details><summary>Can’t scan?</summary><code>{secret}</code></details>
        </div>
      )}
      <div className="field">
        <label htmlFor="mfa-code">Six-digit code</label>
        <input id="mfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" type="submit" disabled={pending || !factor}>{pending ? "Verifying…" : "Verify and continue"}</button>
    </form>
  );
}
