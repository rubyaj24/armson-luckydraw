import Image from "next/image";
import Link from "next/link";
import { RegistrationForm } from "@/components/registration-form";
import { EVENT_SLUG, hasServerSupabaseConfig } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PublicEventGate } from "@/components/public-event-gate";

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
    <PublicEventGate>
    <main className="public-shell">
      <div className="public-atmosphere" aria-hidden="true" />
      <div className="public-color-rail public-color-rail-left" aria-hidden="true" />
      <div className="public-color-rail public-color-rail-right" aria-hidden="true" />

      <section className="public-hero">
        <div className="brand-lockup">
          <div className="presentation-lockup" aria-label="Armson Homes presents CETalks">
            <span className="partner-logo partner-logo-armson">
              <Image src="/assets/Armson logo.png" alt="Armson Homes" width={88} height={88} priority />
            </span>
            <span className="presenter-copy">
              <small>Event presented by</small>
              <strong>Armson Homes</strong>
              <em>Since 1998</em>
            </span>
            <span className="co-presenter">
              <small>With</small>
              <span className="partner-logo partner-logo-cetalks">
                <Image src="/assets/cetalks logo.png" alt="CETalks" width={54} height={52} />
              </span>
            </span>
          </div>
          <Image
            className="spotlight-logo"
            src="/assets/spotlight26.png"
            alt="Spotlight 2026"
            width={638}
            height={260}
            priority
          />
        </div>

        <div className="draw-title-wrap">
          <p className="eyebrow"><span /> October 3—4 · CET <span /></p>
          <p className="draw-title-shadow" aria-hidden="true">Lucky<br />draw</p>
          <h1>Lucky<br />draw</h1>
        </div>
        <p className="hero-copy">
          Your one-minute entry stays eligible for both festival-day finales until you win.
          Save your lucky ID and watch the main-stage reveal.
        </p>

        <div className="draw-facts" aria-label="Lucky draw highlights">
          <div><strong>01</strong><span>Winner per draw</span></div>
          <div><strong>ALL</strong><span>Eligible entries</span></div>
          <div><strong>2</strong><span>Festival days</span></div>
        </div>

        <Image
          className="hero-mascot"
          src="/assets/elements/khai-hidden.webp"
          alt=""
          width={540}
          height={720}
          loading="eager"
          aria-hidden="true"
        />
      </section>

      <section className="form-panel" id="register">
        <div className="form-ticket">
          <div className="ticket-notch ticket-notch-left" aria-hidden="true" />
          <div className="ticket-notch ticket-notch-right" aria-hidden="true" />
          <div className="panel-kicker"><span /> Free festival entry</div>
          <h2>Get your<br /><em>lucky ID</em></h2>
          <p className="panel-intro">Fill in your details. If your ID wins, we&apos;ll email you.</p>
          <RegistrationForm closed={state.closed} paused={state.paused} />
          <footer className="public-footer">
            <Link href="/home-checkup">Home checkup</Link>
            <span>✦</span>
            <Link href="/rules">Draw rules</Link>
            <span>✦</span>
            <Link href="/privacy">Privacy notice</Link>
          </footer>
        </div>
      </section>
    </main>
    </PublicEventGate>
  );
}
