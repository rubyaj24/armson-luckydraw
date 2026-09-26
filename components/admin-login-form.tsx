"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminLoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (authError) throw authError;
      router.push("/admin/mfa");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={login} className="admin-login-form">
      <div className="field">
        <label htmlFor="admin-email">Admin email</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="admin-password">Password</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in securely"}
      </button>
    </form>
  );
}
