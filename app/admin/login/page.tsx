import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session?.currentLevel === "aal2") redirect("/admin");
  if (session) redirect("/admin/mfa");

  return (
    <main className="admin-login-shell">
      <Link href="/" className="admin-login-brand"><span>A</span> Festival Lucky Draw</Link>
      <section className="admin-login-card">
        <p className="panel-kicker">Restricted area</p>
        <h1>Admin sign in</h1>
        <p>Manage entries, draws, winners, and claims.</p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
