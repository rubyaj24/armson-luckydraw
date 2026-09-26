import { AdminShell } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return <AdminShell email={admin.email ?? "admin"}>{children}</AdminShell>;
}
