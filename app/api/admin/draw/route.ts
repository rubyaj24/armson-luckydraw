import { after, NextResponse } from "next/server";
import { apiError, unauthorized } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { EVENT_SLUG } from "@/lib/config";
import { dispatchDrawNotification } from "@/lib/email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";

const dailyDrawSchema = z.object({
  drawDay: z.enum(["2026-10-03", "2026-10-04"]),
  reason: z.string().trim().min(5).max(500),
});

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return unauthorized();

  try {
    const { drawDay, reason } = dailyDrawSchema.parse(await request.json());
    const supabase = createAdminSupabaseClient();
    const { data: drawId, error } = await supabase.rpc("run_daily_draw", {
      p_event_slug: EVENT_SLUG,
      p_actor_id: admin.id,
      p_draw_day: drawDay,
      p_reason: reason,
    });

    if (error) throw error;
    const { data: draw, error: drawError } = await supabase
      .from("draws")
      .select("winner_participant_id")
      .eq("id", drawId)
      .single();
    if (drawError || !draw) throw drawError ?? new Error("draw_not_found");

    const { data: winner, error: winnerError } = await supabase
      .from("participants")
      .select("full_name, city, lucky_draw_id")
      .eq("id", draw.winner_participant_id)
      .single();
    if (winnerError || !winner) throw winnerError ?? new Error("winner_not_found");

    after(async () => {
      try {
        await dispatchDrawNotification(drawId as string);
      } catch (emailError) {
        console.error("Winner notification failed", emailError);
      }
    });

    return NextResponse.json({
      drawId,
      drawDay,
      winner: {
        name: winner.full_name,
        city: winner.city,
        luckyDrawId: winner.lucky_draw_id,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
