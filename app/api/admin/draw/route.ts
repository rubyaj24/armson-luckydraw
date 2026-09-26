import { after, NextResponse } from "next/server";
import { apiError, unauthorized } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { EVENT_SLUG } from "@/lib/config";
import { dispatchDrawNotification } from "@/lib/email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { reasonSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return unauthorized();

  try {
    const { reason } = reasonSchema.parse(await request.json());
    const supabase = createAdminSupabaseClient();
    const { data: drawId, error } = await supabase.rpc("run_manual_draw", {
      p_event_slug: EVENT_SLUG,
      p_actor_id: admin.id,
      p_reason: reason,
    });

    if (error) throw error;
    after(async () => {
      try {
        await dispatchDrawNotification(drawId as string);
      } catch (emailError) {
        console.error("Winner notification failed", emailError);
      }
    });

    return NextResponse.json({ drawId });
  } catch (error) {
    return apiError(error);
  }
}
