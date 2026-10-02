import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { apiError } from "@/lib/api";
import { EVENT_SLUG } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { homeCheckupSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = homeCheckupSchema.parse(await request.json());
    if (Date.now() - body.startedAt < 2_000) {
      return NextResponse.json({ error: "Please review the form before submitting." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("registration_status, draw_status")
      .eq("slug", EVENT_SLUG)
      .single();
    if (eventError) throw eventError;
    if (event?.registration_status !== "open" || event.draw_status !== "active") {
      return NextResponse.json({ error: "The festival is not accepting responses right now." }, { status: 403 });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const remoteIp = forwarded?.split(",")[0]?.trim();
    const verification = await verifyTurnstile(body.turnstileToken, remoteIp);
    if (!verification.success) {
      console.warn("Home checkup Turnstile verification failed", verification["error-codes"] ?? []);
      return NextResponse.json({ error: "Security verification failed. Please try again." }, { status: 400 });
    }

    if (remoteIp) {
      const keyHash = createHash("sha256").update(`home-checkup:${remoteIp}`).digest("hex");
      const { data: allowed, error } = await supabase.rpc("consume_registration_rate_limit", {
        p_key_hash: keyHash,
        p_max_requests: 30,
      });
      if (error) throw error;
      if (!allowed) {
        return NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 });
      }
    }

    const { error } = await supabase.from("home_checkup_surveys").insert({
      full_name: body.name,
      age: body.age,
      phone: body.phone,
      address: body.address,
      home_ownership: body.homeOwnership,
      years_in_home: body.yearsInHome,
      needs_checkup: body.needsCheckup,
    });
    if (error) throw error;

    return NextResponse.json({ submitted: true });
  } catch (error) {
    return apiError(error);
  }
}
