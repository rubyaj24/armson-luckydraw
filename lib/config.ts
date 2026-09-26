export const EVENT_SLUG = process.env.EVENT_SLUG ?? "armson-festival-2026";
export const EVENT_TIME_ZONE = "Asia/Kolkata";

export function hasPublicSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function hasServerSupabaseConfig() {
  return Boolean(
    hasPublicSupabaseConfig() && process.env.SUPABASE_SECRET_KEY,
  );
}

export function isConfiguredAdmin(email: string | undefined | null) {
  const configured = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(configured && email?.trim().toLowerCase() === configured);
}
