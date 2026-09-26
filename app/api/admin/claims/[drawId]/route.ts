import { NextResponse } from "next/server";
import { apiError, unauthorized } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { EVENT_SLUG } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { claimSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ drawId: string }> },
) {
  const admin = await requireAdminApi();
  if (!admin) return unauthorized();

  try {
    const input = claimSchema.parse(await request.json());
    const { drawId } = await context.params;
    const { data, error } = await createAdminSupabaseClient().rpc(
      "update_claim_status",
      {
        p_event_slug: EVENT_SLUG,
        p_draw_id: drawId,
        p_actor_id: admin.id,
        p_status: input.status,
        p_notes: input.notes,
      },
    );
    if (error) throw error;
    return NextResponse.json({ claim: data });
  } catch (error) {
    return apiError(error);
  }
}
