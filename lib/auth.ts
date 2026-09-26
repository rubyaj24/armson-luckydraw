import { redirect } from "next/navigation";
import { isConfiguredAdmin } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminSession() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || !isConfiguredAdmin(data.user.email)) return null;
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return {
      user: data.user,
      currentLevel: assurance?.currentLevel ?? "aal1",
      nextLevel: assurance?.nextLevel ?? "aal1",
    };
  } catch {
    return null;
  }
}

export async function getAdmin() {
  const session = await getAdminSession();
  return session?.currentLevel === "aal2" ? session.user : null;
}

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.currentLevel !== "aal2") redirect("/admin/mfa");
  return session.user;
}

export async function requireAdminApi() {
  return getAdmin();
}
