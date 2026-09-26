import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, unauthorized } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { EVENT_SLUG } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({
  status: z.enum(["open", "paused"]),
  reason: z.string().trim().min(5).max(500),
});

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return unauthorized();

  try {
    const input = schema.parse(await request.json());
    const { data, error } = await createAdminSupabaseClient().rpc(
      "set_registration_status",
      {
        p_event_slug: EVENT_SLUG,
        p_actor_id: admin.id,
        p_status: input.status,
        p_reason: input.reason,
      },
    );
    if (error) throw error;
    return NextResponse.json({ event: data });
  } catch (error) {
    return apiError(error);
  }
}
