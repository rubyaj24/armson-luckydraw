import Link from "next/link";
import { RegistrationForm } from "@/components/registration-form";
import { EVENT_SLUG, hasServerSupabaseConfig } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function eventState() {
  if (!hasServerSupabaseConfig()) return { closed: false, paused: false };
  try {
    const { data } = await createAdminSupabaseClient()
      .from("events")
      .select("registration_status, draw_status")
      .eq("slug", EVENT_SLUG)
      .single();
    return {
      closed: data?.draw_status === "closed" || data?.registration_status === "closed",
      paused: data?.registration_status === "paused",
    };
  } catch {
    return { closed: false, paused: false };
  }
}

export default async function Home() {
  const state = await eventState();

  return (
    <main className="public-shell">
      <div className="festival-glow festival-glow-one" />
      <div className="festival-glow festival-glow-two" />
      <section className="public-hero">
        <div className="brand-lockup" aria-label="Festival Lucky Draw">
          <span className="brand-mark">A</span>
          <span>Festival 2026</span>
        </div>

        <div className="eyebrow"><span /> October 2—4 <span /></div>
        <h1>Your moment of<br /><em>festival fortune.</em></h1>
        <p className="hero-copy">
          Enter once and stay eligible for every upcoming draw until you win.
          One entry could make today unforgettable.
        </p>

        <div className="draw-facts" aria-label="Lucky draw highlights">
          <div><strong>1</strong><span>Winner each draw</span></div>
          <div><strong>100</strong><span>Entries per milestone</span></div>
          <div><strong>18+</strong><span>Age requirement</span></div>
        </div>
      </section>

      <section className="form-panel" id="register">
        <div className="panel-kicker">Complimentary entry</div>
        <h2>Join the lucky draw</h2>
        <p className="panel-intro">It takes less than a minute. Keep your lucky-draw ID safe.</p>
        <RegistrationForm closed={state.closed} paused={state.paused} />
        <footer className="public-footer">
          <Link href="/rules">Draw rules</Link>
          <span>•</span>
          <Link href="/privacy">Privacy notice</Link>
        </footer>
      </section>
    </main>
  );
}
