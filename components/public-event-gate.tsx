import Image from "next/image";
import { hasServerSupabaseConfig, EVENT_SLUG } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function isFestivalActive() {
  if (!hasServerSupabaseConfig()) return false;
  try {
    const { data, error } = await createAdminSupabaseClient()
      .from("events")
      .select("registration_status, draw_status")
      .eq("slug", EVENT_SLUG)
      .single();
    return !error && data?.registration_status === "open" && data?.draw_status === "active";
  } catch {
    return false;
  }
}

export async function PublicEventGate({ children }: { children: React.ReactNode }) {
  if (await isFestivalActive()) return children;

  return (
    <main className="event-inactive">
      <Image src="/assets/Armson logo.png" alt="Armson Homes" width={84} height={84} priority />
      <p className="panel-kicker">Armson Homes presents CETalks Spotlight 2026</p>
      <h1>We&apos;ll be<br /><em>opening soon.</em></h1>
      <p>The festival experience is not available yet. Please check back when the event opens.</p>
    </main>
  );
}
