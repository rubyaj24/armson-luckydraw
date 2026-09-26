import { redirect } from "next/navigation";
import { AdminMfaForm } from "@/components/admin-mfa-form";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminMfaPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.currentLevel === "aal2") redirect("/admin");

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <p className="panel-kicker">Two-step verification</p>
        <h1>Confirm it’s you</h1>
        <p>Use your authenticator app to protect draw controls and participant data.</p>
        <AdminMfaForm />
      </section>
    </main>
  );
}
