import { NextResponse } from "next/server";
import { apiError, unauthorized } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { EVENT_SLUG } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { drawSettingsSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return unauthorized();

  try {
    const input = drawSettingsSchema.parse(await request.json());
    const { data, error } = await createAdminSupabaseClient().rpc(
      "update_draw_settings",
      {
        p_event_slug: EVENT_SLUG,
        p_actor_id: admin.id,
        p_next_target: input.nextTarget,
        p_interval: input.interval,
        p_reason: input.reason,
      },
    );
    if (error) throw error;
    return NextResponse.json({ event: data });
  } catch (error) {
    return apiError(error);
  }
}
