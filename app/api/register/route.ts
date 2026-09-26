import { after, NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { apiError } from "@/lib/api";
import { EVENT_SLUG } from "@/lib/config";
import { dispatchDrawNotification } from "@/lib/email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import type { RegistrationResult } from "@/lib/types";
import { registrationSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = registrationSchema.parse(await request.json());

    if (Date.now() - body.startedAt < 2_000) {
      return NextResponse.json(
        { error: "Please review the form before submitting." },
        { status: 400 },
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const remoteIp = forwarded?.split(",")[0]?.trim();
    const verification = await verifyTurnstile(body.turnstileToken, remoteIp);

    if (!verification.success) {
      return NextResponse.json(
        { error: "Security verification failed. Please try again." },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    if (remoteIp) {
      const keyHash = createHash("sha256").update(remoteIp).digest("hex");
      const { data: allowed, error: limitError } = await supabase.rpc(
        "consume_registration_rate_limit",
        { p_key_hash: keyHash, p_max_requests: 60 },
      );
      if (limitError) throw limitError;
      if (!allowed) {
        return NextResponse.json(
          { error: "Too many entries were submitted from this connection. Please wait a minute." },
          { status: 429 },
        );
      }
    }

    const { data, error } = await supabase.rpc("register_participant", {
      p_event_slug: EVENT_SLUG,
      p_full_name: body.name,
      p_age: body.age,
      p_city: body.city,
      p_email: body.email,
      p_phone: body.phone,
      p_submission_key: body.submissionKey,
    });

    if (error) throw error;
    const result = (data?.[0] ?? null) as RegistrationResult | null;
    if (!result) throw new Error("Registration did not return a result.");

    if (result.draw_triggered && result.draw_id) {
      const drawId = result.draw_id;
      after(async () => {
        try {
          await dispatchDrawNotification(drawId);
        } catch (error) {
          console.error("Winner notification failed", error);
        }
      });
    }

    return NextResponse.json({
      luckyDrawId: result.lucky_draw_id,
      sequence: result.registration_sequence,
      existing: result.was_existing,
    });
  } catch (error) {
    return apiError(error);
  }
}
