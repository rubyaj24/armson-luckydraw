import { unauthorized } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { EVENT_SLUG } from "@/lib/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function csvCell(value: unknown) {
  const string = String(value ?? "");
  return `"${string.replaceAll('"', '""')}"`;
}

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return unauthorized();

  const supabase = createAdminSupabaseClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", EVENT_SLUG)
    .single();
  if (eventError) return new Response("Export failed", { status: 500 });

  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("participants")
      .select(
        "registration_sequence,lucky_draw_id,full_name,age,city,email,phone,status,consented_at,created_at",
      )
      .eq("event_id", event.id)
      .order("registration_sequence", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return new Response("Export failed", { status: 500 });
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  const headers = [
    "Sequence",
    "Lucky Draw ID",
    "Name",
    "Age",
    "City",
    "Email",
    "Phone",
    "Status",
    "Consented At",
    "Registered At",
  ];
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.registration_sequence,
        row.lucky_draw_id,
        row.full_name,
        row.age,
        row.city,
        row.email,
        row.phone,
        row.status,
        row.consented_at,
        row.created_at,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lucky-draw-participants-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
