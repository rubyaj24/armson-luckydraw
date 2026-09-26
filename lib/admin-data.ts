import { EVENT_SLUG } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  DrawRecord,
  EventRecord,
  ParticipantRecord,
} from "@/lib/types";

export async function getDashboardData() {
  const supabase = createAdminSupabaseClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", EVENT_SLUG)
    .single();

  if (error) throw error;

  const [eligibleResult, participantsResult, drawsResult, auditResult] =
    await Promise.all([
      supabase
        .from("participants")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("status", "eligible"),
      supabase
        .from("participants")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("draws")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("audit_logs")
        .select("id, action, reason, created_at, old_values, new_values")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const draws = drawsResult.data ?? [];
  const drawIds = draws.map((draw) => draw.id);
  const winnerIds = draws.map((draw) => draw.winner_participant_id);

  const [winnersResult, claimsResult, notificationsResult] = await Promise.all([
    winnerIds.length
      ? supabase
          .from("participants")
          .select("id, full_name, email, phone, lucky_draw_id")
          .in("id", winnerIds)
      : Promise.resolve({ data: [] }),
    drawIds.length
      ? supabase
          .from("claims")
          .select("draw_id, status, claim_deadline, notes")
          .in("draw_id", drawIds)
      : Promise.resolve({ data: [] }),
    drawIds.length
      ? supabase
          .from("notification_outbox")
          .select("draw_id, status, attempts, last_error")
          .in("draw_id", drawIds)
      : Promise.resolve({ data: [] }),
  ]);

  const winners = new Map(
    (winnersResult.data ?? []).map((winner) => [winner.id, winner]),
  );
  const claims = new Map(
    (claimsResult.data ?? []).map((claim) => [claim.draw_id, claim]),
  );
  const notifications = new Map(
    (notificationsResult.data ?? []).map((notification) => [
      notification.draw_id,
      notification,
    ]),
  );

  const mappedDraws: DrawRecord[] = draws.map((draw) => {
    const winner = winners.get(draw.winner_participant_id);
    return {
      id: draw.id,
      kind: draw.kind,
      milestone: draw.milestone,
      draw_day: draw.draw_day,
      eligible_count: draw.eligible_count,
      created_at: draw.created_at,
      participant: winner
        ? {
            id: winner.id,
            name: winner.full_name,
            email: winner.email,
            phone: winner.phone,
            lucky_draw_id: winner.lucky_draw_id,
          }
        : null,
      claim: claims.get(draw.id) ?? null,
      notification: notifications.get(draw.id) ?? null,
    };
  });

  return {
    event: event as EventRecord,
    eligibleCount: eligibleResult.count ?? 0,
    recentParticipants: (participantsResult.data ?? []).map(mapParticipant),
    draws: mappedDraws,
    auditLogs: auditResult.data ?? [],
  };
}

export async function getDrawStageData() {
  const supabase = createAdminSupabaseClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, starts_on, ends_on, draw_status")
    .eq("slug", EVENT_SLUG)
    .single();
  if (eventError) throw eventError;

  const [participantsResult, drawsResult] = await Promise.all([
    supabase
      .from("participants")
      .select("lucky_draw_id")
      .eq("event_id", event.id)
      .eq("status", "eligible")
      .order("registration_sequence", { ascending: false })
      .limit(300),
    supabase
      .from("draws")
      .select("id, draw_day, winner_participant_id")
      .eq("event_id", event.id)
      .not("draw_day", "is", null)
      .order("draw_day", { ascending: true }),
  ]);

  if (participantsResult.error) throw participantsResult.error;
  if (drawsResult.error) throw drawsResult.error;

  const draws = drawsResult.data ?? [];
  const winnerIds = draws.map((draw) => draw.winner_participant_id);
  const { data: winners, error: winnersError } = winnerIds.length
    ? await supabase
        .from("participants")
        .select("id, full_name, city, lucky_draw_id")
        .in("id", winnerIds)
    : { data: [], error: null };
  if (winnersError) throw winnersError;

  const winnerById = new Map((winners ?? []).map((winner) => [winner.id, winner]));
  return {
    event,
    sampleIds: (participantsResult.data ?? []).map((participant) => participant.lucky_draw_id),
    completedDraws: draws.map((draw) => {
      const winner = winnerById.get(draw.winner_participant_id);
      return {
        drawId: draw.id,
        drawDay: draw.draw_day as string,
        name: winner?.full_name ?? "Winner",
        city: winner?.city ?? "",
        luckyDrawId: winner?.lucky_draw_id ?? "",
      };
    }),
  };
}

export async function searchParticipants(query: string, page: number) {
  const supabase = createAdminSupabaseClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", EVENT_SLUG)
    .single();
  if (eventError) throw eventError;

  const pageSize = 50;
  const from = Math.max(0, page - 1) * pageSize;
  let request = supabase
    .from("participants")
    .select("*", { count: "exact" })
    .eq("event_id", event.id);

  if (query.trim()) {
    const safe = query.trim().replace(/[,%()]/g, "");
    request = request.or(
      `full_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%,lucky_draw_id.ilike.%${safe}%,city.ilike.%${safe}%`,
    );
  }

  const { data, count, error } = await request
    .order("registration_sequence", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;

  return {
    participants: (data ?? []).map(mapParticipant),
    total: count ?? 0,
    page,
    pageSize,
  };
}

function mapParticipant(row: Record<string, unknown>): ParticipantRecord {
  return {
    id: String(row.id),
    name: String(row.full_name),
    age: Number(row.age),
    city: String(row.city),
    email: String(row.email),
    phone: String(row.phone),
    lucky_draw_id: String(row.lucky_draw_id),
    registration_sequence: Number(row.registration_sequence),
    status: row.status as ParticipantRecord["status"],
    created_at: String(row.created_at),
  };
}
